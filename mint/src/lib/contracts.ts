/**
 * SoundChain contract addresses (Polygon mainnet).
 *
 * Source of truth: CLAUDE.md "SMART CONTRACT ADDRESSES" table. Mirrored here
 * so the mint app doesn't depend on web/'s config.ts (the Phase 6 strip
 * removes web/ from the dependency graph entirely).
 */

import { polygon } from 'viem/chains'

export const POLYGON_CHAIN_ID = polygon.id

export const CONTRACTS = {
  OGUN: '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c' as const,
  NFT_EDITIONS: '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0' as const,
  MARKETPLACE_EDITIONS: '0x7EfC9A7F3381A4B28a2113EA99E2d80832589239' as const,
  AUCTION_V2: '0x35f662bD7d418fd7B19518A22aF3D54ea99e7bf0' as const,
  STAKING_REWARDS: '0xe6c3F86a250b5AAd762405ce5F579F81Fddc426a' as const,
  TREASURY: '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b' as const,
  STREAM_REWARDS: '0xcf9416c49D525f7a50299c71f33606A158F28546' as const,
} as const

export const PLATFORM_FEE_BPS = 5 // 0.05%
export const FEE_DENOMINATOR = 10000

/**
 * Compute 0.05% platform fee for a given amount (in any unit — wei or token).
 * Returns bigint to preserve precision; callers can convert/format as needed.
 */
export function computePlatformFee(amountWei: bigint): bigint {
  return (amountWei * BigInt(PLATFORM_FEE_BPS)) / BigInt(FEE_DENOMINATOR)
}
