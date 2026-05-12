/**
 * wagmi v2 + viem config for Mint.
 *
 * Multi-chain: every SC-supported chain wired. Mint flow auto-uses whatever
 * chain the user's wallet is on. Contract address resolution + per-chain
 * fees handled by lib/chains.ts.
 *
 * Connectors wired here are the canonical wagmi v2 primitives that ship
 * with @wagmi/connectors. Reown AppKit (Phase 8) will register as another
 * connector alongside these once cloud.reown.com projectId lands. WC v2
 * projectId reuses SC's verified-working ID until then.
 */
import { createConfig, http } from 'wagmi'
import { polygon, mainnet, base, arbitrum, optimism, avalanche } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet, metaMask } from 'wagmi/connectors'
import { zetachain } from './chains'

export const SUPPORTED_CHAINS = [polygon, mainnet, base, arbitrum, optimism, avalanche, zetachain] as const

const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '53a9f7ff48d78a81624b5333d52b9123'

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask({
      dappMetadata: {
        name: 'SoundChain Mint',
        url: 'https://mint.soundchain.io',
      },
    }),
    walletConnect({
      projectId: WC_PROJECT_ID,
      metadata: {
        name: 'SoundChain Mint',
        description: 'Mint NFT music editions, trade, stake — the SoundChain forge.',
        url: 'https://mint.soundchain.io',
        icons: ['https://mint.soundchain.io/icon-192.png'],
      },
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'SoundChain Mint',
      appLogoUrl: 'https://mint.soundchain.io/icon-192.png',
    }),
  ],
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
