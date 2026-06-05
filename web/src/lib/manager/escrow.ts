import { ethers } from 'ethers'
import { SUPPORTED_TOKENS, TOKEN_INFO, getDisplaySymbol, Token } from 'constants/tokens'

// ─── MANAGER booking-escrow client helpers ────────────────────────────────────
// The "booking whitelist" rail, rendered like an allowlist mint: connect wallet →
// pick token(s) → deposit → reveal. This module is the safe client surface — it
// never constructs a transaction we can't construct correctly, so funds can't be
// misrouted (the #1 "no hiccups" rule for the money feature).

// Featured top-3 (Frank's pick) pinned at the top of the picker; the rest expand.
export const FEATURED_TOKENS: Token[] = ['BTC', 'ETH', 'SOL']

// EVM-routable tokens settle straight to the 0x escrow/payout address on their EVM
// chain (live now). Everything else — native BTC, SOL, XRP, LTC, etc. — routes via
// the ZetaChain bridge + the artist's manual confirm. We NEVER show an 0x address
// for a non-EVM coin, so no promoter is ever told to send BTC to an Ethereum
// address (which would burn the funds).
const EVM_RAIL: ReadonlySet<string> = new Set([
  'ETH', 'MATIC', 'OGUN', 'USDC', 'USDT', 'BNB', 'AVAX', 'LINK', 'SHIB', 'PEPE', 'BASE', 'ZETA',
])

export interface BookingToken {
  symbol: Token
  name: string
  icon: string
  display: string
  featured: boolean
  rail: 'evm' | 'bridge'
}

export const BOOKING_TOKENS: BookingToken[] = [
  ...FEATURED_TOKENS,
  ...SUPPORTED_TOKENS.filter((t) => !FEATURED_TOKENS.includes(t as Token)),
].map((symbol) => {
  const s = symbol as Token
  return {
    symbol: s,
    name: TOKEN_INFO[s]?.name || s,
    icon: TOKEN_INFO[s]?.icon || '🪙',
    display: getDisplaySymbol(s),
    featured: FEATURED_TOKENS.includes(s),
    rail: EVM_RAIL.has(s) ? 'evm' : 'bridge',
  }
})

export function tokenBySymbol(symbol: string): BookingToken | undefined {
  return BOOKING_TOKENS.find((t) => t.symbol === symbol)
}

export const MANAGER_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_MANAGER_ESCROW_ADDRESS || ''
export const PLATFORM_FEE_RATE = 0.0005 // 0.05%, matching the rest of SoundChain

// Native currency symbol per EVM chain — used to decide when a one-tap wallet
// send is safe (we only auto-send a chain's NATIVE coin, never a token we'd have
// to guess the contract address for).
const NATIVE_SYMBOL: Record<number, string> = {
  1: 'ETH', 137: 'POL', 8453: 'ETH', 42161: 'ETH', 10: 'ETH', 43114: 'AVAX', 56: 'BNB', 7000: 'ZETA',
}
const CHAIN_NAME: Record<number, string> = {
  1: 'Ethereum', 137: 'Polygon', 8453: 'Base', 42161: 'Arbitrum', 10: 'Optimism', 43114: 'Avalanche', 56: 'BNB Chain', 7000: 'ZetaChain',
}

export function nativeSymbolForChain(chainId: number | null): string {
  return chainId ? NATIVE_SYMBOL[chainId] || '' : ''
}
export function chainName(chainId: number | null): string {
  return chainId ? CHAIN_NAME[chainId] || `chain ${chainId}` : ''
}

// A one-tap wallet send is safe only when the connected chain's native coin IS the
// token being paid (so we send native value to the 0x destination — no token
// contract guessing).
export function canOneTapPay(token: BookingToken | undefined, chainId: number | null): boolean {
  if (!token || token.rail !== 'evm') return false
  return token.display === nativeSymbolForChain(chainId)
}

// Connect an injected wallet (MetaMask/Rabby/etc) — for promoters who aren't
// SoundChain users. Returns null when no injected wallet is present (the UI then
// falls back to the manual deposit-address flow).
export async function connectInjected(): Promise<
  { provider: ethers.providers.Web3Provider; signer: ethers.Signer; address: string; chainId: number } | null
> {
  const eth = typeof window !== 'undefined' ? (window as any).ethereum : null
  if (!eth) return null
  const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
  const provider = new ethers.providers.Web3Provider(eth)
  const net = await provider.getNetwork()
  return { provider, signer: provider.getSigner(), address: accounts[0], chainId: net.chainId }
}

// One-tap native deposit from a connected signer → returns the tx hash.
export async function sendNativeDeposit(signer: ethers.Signer, to: string, amountStr: string): Promise<string> {
  const tx = await signer.sendTransaction({ to, value: ethers.utils.parseEther(amountStr) })
  return tx.hash
}

export interface CreatedEscrow {
  escrowId: string
  destination: string
  escrowContract: boolean
  revealToken: string
  token: string
  amount: string
  status: string
}

export async function createEscrow(body: {
  profileId: string
  token: string
  amount: string
  payerName?: string
  payerEmail?: string
  inquiryId?: string
  note?: string
}): Promise<CreatedEscrow> {
  const r = await fetch('/api/manager/escrow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', ...body }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Could not start the booking escrow.')
  return j as CreatedEscrow
}

export interface ConfirmResult {
  ok: boolean
  httpStatus: number
  status?: string
  revealUnlocked?: boolean
  message?: string
  error?: string
}

export async function confirmEscrow(body: {
  escrowId: string
  txHash: string
  chainId: number
  fromAddress?: string
}): Promise<ConfirmResult> {
  const r = await fetch('/api/manager/escrow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'confirm', ...body }),
  })
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, httpStatus: r.status, ...j }
}

// Pay-to-reveal: after a funded escrow, fetch the pro's bank/payout details with
// the one-time reveal token. Returns null until the deposit confirms.
export async function revealBankDetails(escrowId: string, revealToken: string): Promise<{ bank: Record<string, string>; payoutAddress: string } | null> {
  const r = await fetch(`/api/manager/bank?reveal=1&escrowId=${encodeURIComponent(escrowId)}&revealToken=${encodeURIComponent(revealToken)}`)
  if (!r.ok) return null
  const j = await r.json().catch(() => null)
  if (!j?.revealed) return null
  return { bank: j.bank || {}, payoutAddress: j.payoutAddress || '' }
}
