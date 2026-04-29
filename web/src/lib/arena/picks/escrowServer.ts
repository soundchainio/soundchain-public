/**
 * Server-side commissioner signer for Arena Picks on-chain escrow.
 *
 * The FantasyLeagueEscrow contract restricts createLeague/lock/settle to msg.sender
 * being the league's commissioner. For picks, the protocol itself is the commissioner —
 * not the user — so the server holds a deterministic HD-derived key and signs these
 * privileged transactions.
 *
 * Setup (one-time):
 *   1. HUMAN_WALLET_SEED env var must be present in Vercel (already used for HD wallets).
 *   2. Frank funds the commissioner address with ~5 POL for gas.
 *      Get the address by calling getCommissionerAddress() and depositing POL.
 *
 * Path: m/44'/60'/9'/0/0 — account index 9 reserved for picks commissioner role,
 * distinct from humans (index 1) and agents (index 0).
 */
import { ethers } from 'ethers'
import {
  PICKS_ESCROW_ADDRESS,
  POLYGON_RPC_URLS,
  FANTASY_LEAGUE_ESCROW_ABI,
  NATIVE_TOKEN,
  PICK_SECOND_BPS,
  PICK_THIRD_BPS,
  PICK_PLATFORM_BPS_DEFAULT,
  ERC20_MIN_ABI,
} from './contract'

export { NATIVE_TOKEN }

const COMMISSIONER_PATH = "m/44'/60'/9'/0/0"

// Pin network so ethers v5 skips _detectNetwork (eth_chainId round-trip) on every fresh provider.
// On Vercel cold-starts a slow public RPC's first chainId reply can fail before any contract call
// runs — the failover then walks all 3 RPCs hitting the same wall and the user sees the misleading
// "could not detect network" toast. StaticJsonRpcProvider + this constant => zero detection RPC calls.
const POLYGON_NETWORK = { name: 'matic', chainId: 137 }

// Errors that indicate the RPC itself is broken (vs a real contract revert).
// On these, rotate to the next RPC in POLYGON_RPC_URLS instead of failing the request.
function isRpcTransportError(err: any): boolean {
  const code = err?.code
  if (code === 'SERVER_ERROR' || code === 'TIMEOUT' || code === 'NETWORK_ERROR') return true
  // ethers v5 throws `processing response error` when the upstream returns malformed JSON or HTML
  const msg = (err?.message || '').toLowerCase()
  return msg.includes('processing response error')
    || msg.includes('failed to fetch')
    || msg.includes('socket hang up')
    || msg.includes('econnreset')
    || msg.includes('could not detect network')
}

let cachedRpcIndex = 0  // sticky to last known-good RPC across requests; rotated on transport error

function buildSigner(rpcUrl: string): ethers.Wallet {
  const seed = process.env.HUMAN_WALLET_SEED
  if (!seed) throw new Error('HUMAN_WALLET_SEED not configured — picks escrow disabled')
  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, POLYGON_NETWORK)
  return ethers.Wallet.fromMnemonic(seed, COMMISSIONER_PATH).connect(provider)
}

export function getCommissionerSigner(): ethers.Wallet {
  return buildSigner(POLYGON_RPC_URLS[cachedRpcIndex])
}

export function getCommissionerAddress(): string {
  return getCommissionerSigner().address
}

function getEscrow(signer: ethers.Wallet): ethers.Contract {
  return new ethers.Contract(PICKS_ESCROW_ADDRESS, FANTASY_LEAGUE_ESCROW_ABI, signer)
}

export function getEscrowReadOnly(): ethers.Contract {
  const provider = new ethers.providers.StaticJsonRpcProvider(POLYGON_RPC_URLS[cachedRpcIndex], POLYGON_NETWORK)
  return new ethers.Contract(PICKS_ESCROW_ADDRESS, FANTASY_LEAGUE_ESCROW_ABI, provider)
}

/**
 * Run an escrow write operation with automatic RPC failover. If the RPC at the current
 * cached index returns a transport-level error (timeout, malformed response, socket hangup),
 * rotate to the next RPC and retry. Real contract reverts are surfaced immediately —
 * we only retry transport errors so a true revert isn't masked by repeated attempts.
 */
async function withRpcFailover<T>(op: (escrow: ethers.Contract) => Promise<T>): Promise<T> {
  let lastErr: any = null
  for (let attempt = 0; attempt < POLYGON_RPC_URLS.length; attempt++) {
    const rpcIndex = (cachedRpcIndex + attempt) % POLYGON_RPC_URLS.length
    const signer = buildSigner(POLYGON_RPC_URLS[rpcIndex])
    try {
      const result = await op(getEscrow(signer))
      cachedRpcIndex = rpcIndex  // remember the working one
      return result
    } catch (err: any) {
      lastErr = err
      if (!isRpcTransportError(err)) throw err  // real revert — bubble up immediately
      // else: try next RPC
    }
  }
  throw lastErr
}

/**
 * Read the on-chain `defaultPlatformBps` from FantasyLeagueEscrow.
 * Cached for 5 minutes so the cron + API don't hammer the RPC; bumps via
 * `setDefaultPlatformBps(...)` on Polygonscan show up to picks within 5 min.
 *
 * Falls back to PICK_PLATFORM_BPS_DEFAULT (500 bps = 5%) if the read fails —
 * we'd rather pass a sensible default and let `createLeague` revert with a
 * clear `firstBps + secondBps + thirdBps + platformBps != 10000` error than
 * silently use a stale value.
 */
let cachedPlatformBps: { value: number; at: number } | null = null
const PLATFORM_BPS_TTL_MS = 5 * 60 * 1000
export async function getDefaultPlatformBps(): Promise<number> {
  if (cachedPlatformBps && Date.now() - cachedPlatformBps.at < PLATFORM_BPS_TTL_MS) {
    return cachedPlatformBps.value
  }
  try {
    const escrow = getEscrowReadOnly()
    const raw = await escrow.defaultPlatformBps()
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(value) || value < 0 || value > 10000) {
      throw new Error(`defaultPlatformBps out of range: ${raw}`)
    }
    cachedPlatformBps = { value, at: Date.now() }
    return value
  } catch (err) {
    console.warn('[picks] getDefaultPlatformBps failed — falling back to default', err)
    return PICK_PLATFORM_BPS_DEFAULT
  }
}

/**
 * Server creates the on-chain league for a pick.
 *   tokenAddress = NATIVE_TOKEN (address(0)) for POL, or ERC-20 contract address for OGUN / USDC / etc.
 *   entryFeeWei  = ethers.utils.parseUnits(entryFee, tokenDecimals)
 * Returns the leagueId emitted in the LeagueCreated event + the txHash + the
 * platformFeeBps that was in effect at create time (recorded on the pick doc
 * so settle math + UI display stay correct even if the contract default is
 * later bumped).
 */
export async function escrowCreatePick(
  tokenAddress: string,
  entryFeeWei: ethers.BigNumber,
): Promise<{ leagueId: string; txHash: string; platformFeeBps: number; firstBps: number }> {
  const platformFeeBps = await getDefaultPlatformBps()
  const firstBps = 10000 - PICK_SECOND_BPS - PICK_THIRD_BPS - platformFeeBps
  return withRpcFailover(async escrow => {
    const tx: ethers.ContractTransaction = await escrow.createLeague(
      tokenAddress,
      entryFeeWei,
      2, // maxTeams — pick is always 1v1
      firstBps,
      PICK_SECOND_BPS,
      PICK_THIRD_BPS,
    )
    const receipt = await tx.wait()
    const event = receipt.events?.find(e => e.event === 'LeagueCreated')
    if (!event || !event.args) throw new Error('LeagueCreated event not found in receipt')
    const leagueId = (event.args.leagueId as ethers.BigNumber).toString()
    return { leagueId, txHash: tx.hash, platformFeeBps, firstBps }
  })
}

/**
 * Server locks a pick once both players have joined.
 * Required before settle can be called.
 */
export async function escrowLockPick(leagueId: string): Promise<string> {
  return withRpcFailover(async escrow => {
    const tx: ethers.ContractTransaction = await escrow.lock(leagueId)
    await tx.wait()
    return tx.hash
  })
}

/**
 * Server settles the pick — contract pays winner (10000 - platformBps) and treasury platformBps,
 * using whatever bps split was locked at the createLeague call. Apr 28: Arena rate
 * bumped to 500 bps (5%) to match FanDuel/DraftKings; music side stays at 5 bps (0.05%).
 * Called from the cron after ESPN reports a final score.
 */
export async function escrowSettlePick(leagueId: string, winnerAddress: string): Promise<string> {
  return withRpcFailover(async escrow => {
    const tx: ethers.ContractTransaction = await escrow.settle(
      leagueId,
      winnerAddress,
      ethers.constants.AddressZero, // no second place
      ethers.constants.AddressZero, // no third place
    )
    await tx.wait()
    return tx.hash
  })
}

/**
 * Server cancels an unmatched pick — refunds the creator.
 * Called when an open pick expires (game starts) without a taker.
 */
export async function escrowCancelPick(leagueId: string): Promise<string> {
  return withRpcFailover(async escrow => {
    const tx: ethers.ContractTransaction = await escrow.cancel(leagueId)
    await tx.wait()
    return tx.hash
  })
}

/**
 * Transfer ERC-20 tokens from the commissioner wallet to a recipient address.
 * Used to pay the OGUN bonus to a pick winner after settle.
 * Returns { txHash } on success, or { skippedReason } if commissioner balance is insufficient.
 * Real reverts (not balance-related) bubble up. Transport errors rotate through POLYGON_RPC_URLS.
 */
export async function transferErc20FromCommissioner(
  tokenAddress: string,
  toAddress: string,
  amountWei: ethers.BigNumber,
): Promise<{ txHash?: string; skippedReason?: string }> {
  let lastErr: any = null
  for (let attempt = 0; attempt < POLYGON_RPC_URLS.length; attempt++) {
    const rpcIndex = (cachedRpcIndex + attempt) % POLYGON_RPC_URLS.length
    const signer = buildSigner(POLYGON_RPC_URLS[rpcIndex])
    try {
      const erc20 = new ethers.Contract(tokenAddress, ERC20_MIN_ABI, signer)
      const balance: ethers.BigNumber = await erc20.balanceOf(signer.address)
      if (balance.lt(amountWei)) {
        cachedRpcIndex = rpcIndex
        return { skippedReason: 'commissioner-ogun-balance-insufficient' }
      }
      const tx: ethers.ContractTransaction = await erc20.transfer(toAddress, amountWei)
      await tx.wait()
      cachedRpcIndex = rpcIndex
      return { txHash: tx.hash }
    } catch (err: any) {
      lastErr = err
      if (!isRpcTransportError(err)) throw err
    }
  }
  throw lastErr
}

/**
 * Read-only: confirms a wallet has joined the league on-chain.
 * Used by the take handler to verify the taker actually deposited their stake.
 */
export async function escrowHasJoined(leagueId: string, walletAddress: string): Promise<boolean> {
  const escrow = getEscrowReadOnly()
  return escrow.hasJoined(leagueId, walletAddress)
}

/**
 * Read-only: fetches league state for invariant checks.
 */
export async function escrowGetLeague(leagueId: string): Promise<{
  commissioner: string
  token: string
  entryFee: ethers.BigNumber
  joinedTeams: number
  status: number  // 0 Open, 1 Locked, 2 Settled, 3 Cancelled
  pot: ethers.BigNumber
}> {
  const escrow = getEscrowReadOnly()
  const L = await escrow.leagues(leagueId)
  return {
    commissioner: L.commissioner,
    token: L.token,
    entryFee: L.entryFee,
    joinedTeams: L.joinedTeams,
    status: L.status,
    pot: L.pot,
  }
}
