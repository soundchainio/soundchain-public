'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5/react'
import { createContext, useContext, ReactNode } from 'react'

// Get your projectId from https://cloud.walletconnect.com
// This is required for WalletConnect v2
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

// Chain configurations
const polygon = {
  chainId: 137,
  name: 'Polygon',
  currency: 'MATIC',
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: 'https://polygon-rpc.com'
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

// Web3Modal metadata
const metadata = {
  name: 'SoundChain',
  description: 'Music NFT Marketplace',
  url: 'https://soundchain.io',
  icons: ['https://soundchain.io/favicons/apple-touch-icon.png']
}

// Initialize Web3Modal
if (typeof window !== 'undefined') {
  createWeb3Modal({
    ethersConfig: defaultConfig({ metadata }),
    chains: [polygon, ethereum, base, arbitrum, optimism],
    projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#8B5CF6', // Purple accent to match SoundChain
      '--w3m-border-radius-master': '8px',
    },
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    ],
  })
}

// Context for additional state management if needed
interface Web3ModalContextType {
  projectId: string
}

const Web3ModalContext = createContext<Web3ModalContextType>({ projectId })

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  return (
    <Web3ModalContext.Provider value={{ projectId }}>
      {children}
    </Web3ModalContext.Provider>
  )
}

export const useWeb3ModalContext = () => useContext(Web3ModalContext)
