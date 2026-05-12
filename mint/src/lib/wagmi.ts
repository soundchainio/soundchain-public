/**
 * wagmi v2 + viem config for Mint.
 *
 * Multi-chain: every SC-supported chain wired. Mint flow auto-uses whatever
 * chain the user's wallet is on. Contract address resolution + per-chain
 * fees handled by lib/chains.ts.
 */
import { createConfig, http } from 'wagmi'
import { polygon, mainnet, base, arbitrum, optimism, avalanche } from 'wagmi/chains'
import { zetachain } from './chains'

export const SUPPORTED_CHAINS = [polygon, mainnet, base, arbitrum, optimism, avalanche, zetachain] as const

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: {
    [polygon.id]: http('https://polygon-rpc.com'),
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [avalanche.id]: http(),
    [zetachain.id]: http('https://zetachain-mainnet.public.blastapi.io'),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
