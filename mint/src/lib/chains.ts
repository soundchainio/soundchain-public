/**
 * Chain-aware contract + fee resolution.
 *
 * Mint runs on ANY chain SC supports. Each chain's NFT contract address is
 * read from a per-chain env var; the fee recipient is per-chain too, with
 * a global fallback. When you deploy the SC contract on a new chain, set
 * `NEXT_PUBLIC_NFT_EDITIONS_<chainId>` on Vercel and it lights up immediately.
 *
 * Polygon ships with a hardcoded fallback because it's the canonical
 * deployment that's been live since 2023.
 */

import { polygon, mainnet, base, arbitrum, optimism, avalanche } from 'viem/chains'
import type { Chain } from 'viem'

// ZetaChain isn't always exported from viem/chains — define locally.
export const zetachain: Chain = {
  id: 7000,
  name: 'ZetaChain',
  nativeCurrency: { name: 'Zeta', symbol: 'ZETA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://zetachain-mainnet.public.blastapi.io'] },
  },
  blockExplorers: {
    default: { name: 'ZetaScan', url: 'https://zetachain.blockscout.com' },
  },
}

export interface SupportedChain {
  id: number
  name: string
  /** Native gas-token symbol (POL/ETH/AVAX/ZETA…) */
  symbol: string
  explorerUrl: string
  /** True once the NFT contract is deployed + env-wired on this chain */
  deployed: boolean
}

/**
 * Every chain SC plans to support. `deployed: true` only when the env var
 * resolves to a 0x-prefixed 42-char address.
 */
export const ALL_CHAINS: Omit<SupportedChain, 'deployed'>[] = [
  { id: 137, name: 'Polygon', symbol: 'POL', explorerUrl: 'https://polygonscan.com' },
  { id: 1, name: 'Ethereum', symbol: 'ETH', explorerUrl: 'https://etherscan.io' },
  { id: 8453, name: 'Base', symbol: 'ETH', explorerUrl: 'https://basescan.org' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', explorerUrl: 'https://arbiscan.io' },
  { id: 10, name: 'Optimism', symbol: 'ETH', explorerUrl: 'https://optimistic.etherscan.io' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', explorerUrl: 'https://snowtrace.io' },
  { id: 7000, name: 'ZetaChain', symbol: 'ZETA', explorerUrl: 'https://zetachain.blockscout.com' },
]

export const VIEM_CHAINS_BY_ID: Record<number, Chain> = {
  137: polygon,
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  43114: avalanche,
  7000: zetachain,
}

/**
 * NFT_EDITIONS contract address on a given chain.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_NFT_EDITIONS_<chainId>` env var (per-chain override)
 *   2. Hardcoded Polygon fallback (canonical 2023 deploy)
 *   3. null → chain not deployed yet
 */
export function getNftEditionsFor(chainId: number): `0x${string}` | null {
  // process.env access is build-time-inlined for NEXT_PUBLIC_* — must use
  // literal property access, not dynamic [key] lookup, or webpack drops it.
  const envValue: string | undefined = (() => {
    switch (chainId) {
      case 137: return process.env.NEXT_PUBLIC_NFT_EDITIONS_137
      case 1: return process.env.NEXT_PUBLIC_NFT_EDITIONS_1
      case 8453: return process.env.NEXT_PUBLIC_NFT_EDITIONS_8453
      case 42161: return process.env.NEXT_PUBLIC_NFT_EDITIONS_42161
      case 10: return process.env.NEXT_PUBLIC_NFT_EDITIONS_10
      case 43114: return process.env.NEXT_PUBLIC_NFT_EDITIONS_43114
      case 7000: return process.env.NEXT_PUBLIC_NFT_EDITIONS_7000
      default: return undefined
    }
  })()
  if (envValue && envValue.startsWith('0x') && envValue.length === 42) {
    return envValue as `0x${string}`
  }
  // Canonical Polygon fallback (live since 2023)
  if (chainId === 137) return '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0' as `0x${string}`
  return null
}

/**
 * Fee recipient on a given chain.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_FEE_RECIPIENT_<chainId>` env var (per-chain override)
 *   2. `NEXT_PUBLIC_FEE_RECIPIENT` env var (global fallback — works if your
 *      Safe is deployed at the same address on every chain via CREATE2)
 *   3. null → fee step is silently skipped on this chain
 */
export function getFeeRecipientFor(chainId: number): `0x${string}` | null {
  const perChain: string | undefined = (() => {
    switch (chainId) {
      case 137: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_137
      case 1: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_1
      case 8453: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_8453
      case 42161: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_42161
      case 10: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_10
      case 43114: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_43114
      case 7000: return process.env.NEXT_PUBLIC_FEE_RECIPIENT_7000
      default: return undefined
    }
  })()
  if (perChain && perChain.startsWith('0x') && perChain.length === 42) {
    return perChain as `0x${string}`
  }
  const fallback = process.env.NEXT_PUBLIC_FEE_RECIPIENT
  if (fallback && fallback.startsWith('0x') && fallback.length === 42) {
    return fallback as `0x${string}`
  }
  return null
}

export function isChainDeployed(chainId: number): boolean {
  return getNftEditionsFor(chainId) !== null
}

export function listSupportedChains(): SupportedChain[] {
  return ALL_CHAINS.map((c) => ({ ...c, deployed: isChainDeployed(c.id) }))
}

export function explorerTxUrl(chainId: number, txHash: string): string {
  const meta = ALL_CHAINS.find((c) => c.id === chainId)
  const base = meta?.explorerUrl || 'https://polygonscan.com'
  return `${base}/tx/${txHash}`
}
