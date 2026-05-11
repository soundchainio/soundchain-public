/**
 * @soundchain/types — Shared types across SoundChain apps.
 *
 * Only types that are TRULY cross-app belong here. App-specific types stay
 * in the consuming app. GraphQL-generated types (web/src/lib/graphql) stay
 * in the app that owns the GraphQL schema (currently web/).
 */

// ─── Chain ────────────────────────────────────────────────────────────────

export const POLYGON_CHAIN_ID = 137
export const ETHEREUM_CHAIN_ID = 1
export const BASE_CHAIN_ID = 8453
export const ARBITRUM_CHAIN_ID = 42161
export const OPTIMISM_CHAIN_ID = 10
export const ZETACHAIN_CHAIN_ID = 7000

export type SupportedChainId =
  | typeof POLYGON_CHAIN_ID
  | typeof ETHEREUM_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof ARBITRUM_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof ZETACHAIN_CHAIN_ID

export interface ChainInfo {
  id: SupportedChainId
  name: string
  symbol: string
  rpc: string
  explorer: string
}

// ─── Wallet ───────────────────────────────────────────────────────────────

export type WalletProvider =
  | 'magic'
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'web3modal'
  | 'hd'
  | 'direct'

export interface WalletAddress {
  address: string
  provider: WalletProvider
  chainId: SupportedChainId
}

export interface OgunBalance {
  /** Raw wei string from chain — never parsed to number to avoid precision loss */
  raw: string
  /** Human-readable formatted balance, e.g. "12.4523" */
  formatted: string
  /** Block number this balance was read at, or null if cache-only */
  blockNumber: number | null
}

// ─── Identity ─────────────────────────────────────────────────────────────

export type IdentityProvider = 'apple' | 'google' | 'magic' | 'passkey' | 'wallet' | 'guest'

export interface AuthSession {
  /** Stable user ID across providers — Mongo ObjectId string */
  userId: string
  /** Stable profile ID — Mongo ObjectId string */
  profileId: string
  provider: IdentityProvider
  /** ISO-8601 timestamp of session issuance */
  issuedAt: string
  /** ISO-8601 timestamp of session expiry */
  expiresAt: string
}

// ─── Profile (cross-app slim shape) ───────────────────────────────────────

/**
 * Minimum profile shape used across all apps. The full Profile type lives in
 * web/src/lib/graphql (GraphQL-generated). This is what other apps need to
 * render a "who posted this" row, link to a user, etc.
 */
export interface SoundChainProfile {
  id: string
  userHandle?: string | null
  displayName?: string | null
  profilePicture?: string | null
  verified?: boolean
  teamMember?: boolean
}

// ─── Track (cross-app slim shape) ─────────────────────────────────────────

export interface SoundChainTrack {
  id: string
  title: string
  artist?: string | null
  coverArtUrl?: string | null
  audioUrl?: string | null
  scid?: string | null
  ipfsCid?: string | null
}
