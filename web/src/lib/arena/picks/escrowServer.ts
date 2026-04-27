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
  PICK_FIRST_BPS,
  PICK_SECOND_BPS,
  PICK_THIRD_BPS,
} from './contract'

const COMMISSIONER_PATH = "m/44'/60'/9'/0/0"

let cachedSigner: ethers.Wallet | null = null
let cachedProvider: ethers.providers.JsonRpcProvider | null = null

function getProvider(): ethers.providers.JsonRpcProvider {
  if (cachedProvider) return cachedProvider
  cachedProvider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URLS[0])
  return cachedProvider
}

export function getCommissionerSigner(): ethers.Wallet {
  if (cachedSigner) return cachedSigner
  const seed = process.env.HUMAN_WALLET_SEED
  if (!seed) throw new Error('HUMAN_WALLET_SEED not configured — picks escrow disabled')
  const wallet = ethers.Wallet.fromMnemonic(seed, COMMISSIONER_PATH).connect(getProvider())
  cachedSigner = wallet
  return wallet
}

export function getCommissionerAddress(): string {
  return getCommissionerSigner().address
}

function getEscrow(): ethers.Contract {
  return new ethers.Contract(PICKS_ESCROW_ADDRESS, FANTASY_LEAGUE_ESCROW_ABI, getCommissionerSigner())
}

export function getEscrowReadOnly(): ethers.Contract {
  return new ethers.Contract(PICKS_ESCROW_ADDRESS, FANTASY_LEAGUE_ESCROW_ABI, getProvider())
}

/**
 * Server creates the on-chain league for a pick. POL-only for v1.
 * Returns the leagueId emitted in the LeagueCreated event + the txHash.
 */
export async function escrowCreatePick(entryFeeWei: ethers.BigNumber): Promise<{ leagueId: string; txHash: string }> {
  const escrow = getEscrow()
  const tx: ethers.ContractTransaction = await escrow.createLeague(
    NATIVE_TOKEN,
    entryFeeWei,
    2, // maxTeams — pick is always 1v1
    PICK_FIRST_BPS,
    PICK_SECOND_BPS,
    PICK_THIRD_BPS,
  )
  const receipt = await tx.wait()
  const event = receipt.events?.find(e => e.event === 'LeagueCreated')
  if (!event || !event.args) throw new Error('LeagueCreated event not found in receipt')
  const leagueId = (event.args.leagueId as ethers.BigNumber).toString()
  return { leagueId, txHash: tx.hash }
}

/**
 * Server locks a pick once both players have joined.
 * Required before settle can be called.
 */
export async function escrowLockPick(leagueId: string): Promise<string> {
  const escrow = getEscrow()
  const tx: ethers.ContractTransaction = await escrow.lock(leagueId)
  await tx.wait()
  return tx.hash
}

/**
 * Server settles the pick — pays winner 99.95% and treasury 0.05%.
 * Called from the cron after ESPN reports a final score.
 */
export async function escrowSettlePick(leagueId: string, winnerAddress: string): Promise<string> {
  const escrow = getEscrow()
  const tx: ethers.ContractTransaction = await escrow.settle(
    leagueId,
    winnerAddress,
    ethers.constants.AddressZero, // no second place
    ethers.constants.AddressZero, // no third place
  )
  await tx.wait()
  return tx.hash
}

/**
 * Server cancels an unmatched pick — refunds the creator.
 * Called when an open pick expires (game starts) without a taker.
 */
export async function escrowCancelPick(leagueId: string): Promise<string> {
  const escrow = getEscrow()
  const tx: ethers.ContractTransaction = await escrow.cancel(leagueId)
  await tx.wait()
  return tx.hash
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
