'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

// Get your projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

// Reown AppKit metadata
const metadata = {
  name: 'SoundChain',
  description: 'Music NFT Marketplace',
  url: 'https://soundchain.io',
  icons: ['https://soundchain.io/favicons/apple-touch-icon.png']
}

// Track if AppKit has been initialized
let isInitialized = false

async function initializeAppKit() {
  if (typeof window === 'undefined' || isInitialized) return

  try {
    const { createAppKit } = await import('@reown/appkit/react')
    const { Ethers5Adapter } = await import('@reown/appkit-adapter-ethers5')
    const networks = await import('@reown/appkit/networks')

    createAppKit({
      adapters: [new Ethers5Adapter()],
      networks: [networks.polygon, networks.mainnet, networks.base, networks.arbitrum, networks.optimism, networks.zetachain],
      defaultNetwork: networks.polygon,
      projectId,
      metadata,
      features: {
        analytics: false,
        onramp: false,
      },
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
    })
    isInitialized = true
    console.log('Reown AppKit initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Reown AppKit:', error)
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
    // Delay AppKit init slightly to let Magic SDK iframes settle
    const timer = setTimeout(async () => {
      await initializeAppKit()
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
