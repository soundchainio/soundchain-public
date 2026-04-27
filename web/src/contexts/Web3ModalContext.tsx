'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

// Get your projectId from https://cloud.reown.com (migrate from cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '53a9f7ff48d78a81624b5333d52b9123'

// Chain configurations
const polygon = {
  chainId: 137,
  name: 'Polygon',
  currency: 'POL',
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com'
}

const ethereum = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://ethereum.publicnode.com'
}

const base = {
  chainId: 8453,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org'
}

const arbitrum = {
  chainId: 42161,
  name: 'Arbitrum',
  currency: 'ETH',
  explorerUrl: 'https://arbiscan.io',
  rpcUrl: 'https://arb1.arbitrum.io/rpc'
}

const optimism = {
  chainId: 10,
  name: 'Optimism',
  currency: 'ETH',
  explorerUrl: 'https://optimistic.etherscan.io',
  rpcUrl: 'https://mainnet.optimism.io'
}

const zetachain = {
  chainId: 7000,
  name: 'ZetaChain',
  currency: 'ZETA',
  explorerUrl: 'https://explorer.zetachain.com',
  rpcUrl: 'https://zetachain-evm.blockpi.network/v1/rpc/public'
}

// Metadata
const metadata = {
  name: 'SoundChain',
  description: 'Decentralized Music Platform',
  url: 'https://soundchain.io',
  icons: ['https://soundchain.io/favicons/apple-touch-icon.png']
}

// Track if Web3Modal has been initialized
let isInitialized = false

async function initializeWeb3Modal() {
  if (typeof window === 'undefined' || isInitialized) return

  try {
    // Dynamic import to avoid SSR crashes
    const { createWeb3Modal, defaultConfig } = await import('@web3modal/ethers5/react')

    createWeb3Modal({
      ethersConfig: defaultConfig({ metadata }),
      chains: [polygon, ethereum, base, arbitrum, optimism, zetachain],
      projectId,
      enableAnalytics: false,
      enableOnramp: false,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#8B5CF6',
        '--w3m-border-radius-master': '8px',
        '--w3m-z-index': 9999,
      },
      featuredWalletIds: [
        '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow (Bug #69 testing path → first for Magic OAuth users)
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
      ],
      // Bug #70 fallback: hardcoded deeplinks + names so pills are FUNCTIONAL even if the WalletConnect explorer API
      // (api.web3modal.org/v3/wallets) 401s on Sarg/Safari. Without this, blank pills with no tap targets.
      // image_url uses each wallet's official CDN — stable cross-domain assets independent of the explorer registry.
      customWallets: [
        {
          id: 'rainbow-mobile',
          name: 'Rainbow',
          homepage: 'https://rainbow.me',
          image_url: 'https://rainbow.me/favicons/apple-touch-icon.png',
          mobile_link: 'https://rnbwapp.com',
          app_store: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
          play_store: 'https://play.google.com/store/apps/details?id=me.rainbow',
        },
        {
          id: 'metamask-mobile',
          name: 'MetaMask',
          homepage: 'https://metamask.io',
          image_url: 'https://metamask.io/images/metamask-logo.png',
          mobile_link: 'https://metamask.app.link',
          app_store: 'https://apps.apple.com/app/metamask/id1438144202',
          play_store: 'https://play.google.com/store/apps/details?id=io.metamask',
        },
        {
          id: 'trust-mobile',
          name: 'Trust Wallet',
          homepage: 'https://trustwallet.com',
          image_url: 'https://trustwallet.com/assets/images/favicon.png',
          mobile_link: 'https://link.trustwallet.com',
          app_store: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
          play_store: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
        },
        {
          id: 'coinbase-mobile',
          name: 'Coinbase Wallet',
          homepage: 'https://www.coinbase.com/wallet',
          image_url: 'https://avatars.githubusercontent.com/u/18060234?s=200&v=4',
          mobile_link: 'https://go.cb-w.com',
          app_store: 'https://apps.apple.com/app/coinbase-wallet-store-crypto/id1278383455',
          play_store: 'https://play.google.com/store/apps/details?id=org.toshi',
        },
      ],
    })
    isInitialized = true
    console.log('Web3Modal initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Web3Modal:', error)
  }
}

// Context
interface Web3ModalContextType {
  projectId: string
  isReady: boolean
}

const Web3ModalContext = createContext<Web3ModalContextType>({
  projectId,
  isReady: false
})

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Delay init slightly to let Magic SDK iframes settle
    const timer = setTimeout(async () => {
      await initializeWeb3Modal()
      setIsReady(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Web3ModalContext.Provider value={{ projectId, isReady }}>
      {children}
    </Web3ModalContext.Provider>
  )
}

export const useWeb3ModalContext = () => useContext(Web3ModalContext)
