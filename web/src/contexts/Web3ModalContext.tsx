'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5/react'
import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

// Get your projectId from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

// Chain configurations
const polygon = {
  chainId: 137,
  name: 'Polygon',
  currency: 'POL', // Formerly MATIC, rebranded Sept 2024
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-mainnet.g.alchemy.com/v2/hjUDQMyFJcZP2cTLKW2iy'
}

const ethereum = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://eth.llamarpc.com'
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

// Web3Modal metadata - use soundchain.io (without www) to match production
const metadata = {
  name: 'SoundChain',
  description: 'Music NFT Marketplace',
  url: 'https://soundchain.io',
  icons: ['https://soundchain.io/favicons/apple-touch-icon.png']
}

// Track if Web3Modal has been initialized
let isInitialized = false

function initializeWeb3Modal() {
  if (typeof window === 'undefined' || isInitialized) return

  try {
    createWeb3Modal({
      ethersConfig: defaultConfig({ metadata }),
      chains: [polygon, ethereum, base, arbitrum, optimism, zetachain],
      projectId,
      enableAnalytics: false,
      enableOnramp: false, // Disable fiat onramp to prevent external redirects
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#8B5CF6',
        '--w3m-border-radius-master': '8px',
        '--w3m-z-index': '9999',
      },
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      ],
      // Keep users on site - use modal only
      enableExplorer: false, // Disable wallet explorer to prevent external navigation
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
    // Delay Web3Modal init slightly to let Magic SDK iframes settle
    // This helps avoid EIP-6963 cross-origin frame errors
    const timer = setTimeout(() => {
      initializeWeb3Modal()
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
