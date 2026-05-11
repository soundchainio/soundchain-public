/**
 * wagmi v2 + viem config for Mint.
 *
 * Polygon mainnet first-class (where OGUN + SC contracts live). Ethereum +
 * Base + Arbitrum + Optimism as multi-chain options (NFT buyers may sit on
 * any of those). ZetaChain reserved for cross-chain wagering later.
 */
import { createConfig, http } from 'wagmi'
import { polygon, mainnet, base, arbitrum, optimism } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [polygon, mainnet, base, arbitrum, optimism] as const

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: {
    [polygon.id]: http('https://polygon-rpc.com'),
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
