'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWeb3Modal, useWeb3ModalAccount, useDisconnect } from '@web3modal/ethers5/react'
import { useMagicContext } from 'hooks/useMagicContext'
import useMetaMask from 'hooks/useMetaMask'
import Web3 from 'web3'

// Wallet types supported across SoundChain
export type WalletType = 'magic' | 'metamask' | 'web3modal' | null

export interface UnifiedWalletState {
  // Active wallet info
  activeWalletType: WalletType
  activeAddress: string | null
  activeBalance: string | null
  activeOgunBalance: string | null

  // Connection status
  isConnected: boolean
  isConnecting: boolean

  // Chain info
  chainId: number | null
  chainName: string | null

  // Actions
  connectWeb3Modal: () => void
  disconnectWallet: () => void
  switchToMagic: () => void
  switchToMetaMask: () => void
  switchToWeb3Modal: () => void

  // Refetch
  refetchBalance: () => void

  // Web3 instance for transactions
  web3: Web3 | null
}

const defaultState: UnifiedWalletState = {
  activeWalletType: null,
  activeAddress: null,
  activeBalance: null,
  activeOgunBalance: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  chainName: null,
  connectWeb3Modal: () => {},
  disconnectWallet: () => {},
  switchToMagic: () => {},
  switchToMetaMask: () => {},
  switchToWeb3Modal: () => {},
  refetchBalance: () => {},
  web3: null,
}

const UnifiedWalletContext = createContext<UnifiedWalletState>(defaultState)

const WALLET_STORAGE_KEY = 'soundchain_active_wallet_type'

// Chain ID to name mapping
const chainNames: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  10: 'Optimism',
  43114: 'Avalanche',
  56: 'BNB Chain',
  7000: 'ZetaChain',
  80002: 'Polygon Amoy',
}

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  // Persisted wallet type choice
  const [activeWalletType, setActiveWalletType] = useState<WalletType>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Web3Modal hooks
  const { open } = useWeb3Modal()
  const { address: web3ModalAddress, isConnected: isWeb3ModalConnected, chainId: web3ModalChainId } = useWeb3ModalAccount()
  const { disconnect: disconnectWeb3Modal } = useDisconnect()

  // Magic wallet (OAuth) hooks
  const {
    account: magicAccount,
    balance: magicBalance,
    ogunBalance: magicOgunBalance,
    web3: magicWeb3,
    refetchBalance: magicRefetchBalance,
  } = useMagicContext()

  // MetaMask hooks
  const {
    account: metamaskAccount,
    balance: metamaskBalance,
    web3: metamaskWeb3,
    refetchBalance: metamaskRefetchBalance,
    chainId: metamaskChainId,
  } = useMetaMask()

  // Load persisted wallet choice on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem(WALLET_STORAGE_KEY) as WalletType
      if (savedType) {
        setActiveWalletType(savedType)
      } else if (magicAccount) {
        // Default to Magic if logged in via OAuth
        setActiveWalletType('magic')
      }
    }
  }, [magicAccount])

  // Auto-detect Web3Modal connection and set as active
  useEffect(() => {
    if (isWeb3ModalConnected && web3ModalAddress && activeWalletType !== 'web3modal') {
      // User just connected via Web3Modal, lock it in
      setActiveWalletType('web3modal')
      localStorage.setItem(WALLET_STORAGE_KEY, 'web3modal')
    }
  }, [isWeb3ModalConnected, web3ModalAddress, activeWalletType])

  // Persist wallet choice
  const persistWalletChoice = useCallback((type: WalletType) => {
    setActiveWalletType(type)
    if (type) {
      localStorage.setItem(WALLET_STORAGE_KEY, type)
    } else {
      localStorage.removeItem(WALLET_STORAGE_KEY)
    }
  }, [])

  // Connect via Web3Modal
  const connectWeb3Modal = useCallback(async () => {
    setIsConnecting(true)
    try {
      await open()
      // The useEffect above will handle setting active wallet type
    } catch (error) {
      console.error('Web3Modal connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [open])

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (activeWalletType === 'web3modal') {
      await disconnectWeb3Modal()
    }
    // Clear persisted choice
    persistWalletChoice(null)
    localStorage.removeItem('connectedWalletAddress')
    localStorage.removeItem('connectedWalletType')
  }, [activeWalletType, disconnectWeb3Modal, persistWalletChoice])

  // Switch to Magic wallet
  const switchToMagic = useCallback(() => {
    if (magicAccount) {
      persistWalletChoice('magic')
    }
  }, [magicAccount, persistWalletChoice])

  // Switch to MetaMask
  const switchToMetaMask = useCallback(() => {
    if (metamaskAccount) {
      persistWalletChoice('metamask')
    }
  }, [metamaskAccount, persistWalletChoice])

  // Switch to Web3Modal connected wallet
  const switchToWeb3Modal = useCallback(() => {
    if (isWeb3ModalConnected && web3ModalAddress) {
      persistWalletChoice('web3modal')
    } else {
      // Not connected yet, open modal
      connectWeb3Modal()
    }
  }, [isWeb3ModalConnected, web3ModalAddress, persistWalletChoice, connectWeb3Modal])

  // Compute active wallet state based on selected type
  let activeAddress: string | null = null
  let activeBalance: string | null = null
  let activeOgunBalance: string | null = null
  let isConnected = false
  let chainId: number | null = null
  let web3: Web3 | null = null
  let refetchBalance = () => {}

  switch (activeWalletType) {
    case 'magic':
      activeAddress = magicAccount || null
      activeBalance = magicBalance || null
      activeOgunBalance = magicOgunBalance || null
      isConnected = !!magicAccount
      chainId = 137 // Magic is always Polygon
      web3 = magicWeb3 || null
      refetchBalance = magicRefetchBalance || (() => {})
      break

    case 'metamask':
      activeAddress = metamaskAccount || null
      activeBalance = metamaskBalance || null
      activeOgunBalance = null // MetaMask doesn't track OGUN separately in current impl
      isConnected = !!metamaskAccount
      chainId = metamaskChainId || null
      web3 = metamaskWeb3 || null
      refetchBalance = metamaskRefetchBalance || (() => {})
      break

    case 'web3modal':
      activeAddress = web3ModalAddress || null
      activeBalance = null // Would need to fetch from chain
      activeOgunBalance = null
      isConnected = isWeb3ModalConnected
      chainId = web3ModalChainId || null
      web3 = null // Web3Modal uses ethers, would need adapter
      break

    default:
      // No wallet selected, check if any is connected
      if (magicAccount) {
        activeAddress = magicAccount
        activeBalance = magicBalance || null
        activeOgunBalance = magicOgunBalance || null
        isConnected = true
        chainId = 137
        web3 = magicWeb3 || null
        refetchBalance = magicRefetchBalance || (() => {})
      }
  }

  const chainName = chainId ? chainNames[chainId] || `Chain ${chainId}` : null

  const value: UnifiedWalletState = {
    activeWalletType,
    activeAddress,
    activeBalance,
    activeOgunBalance,
    isConnected,
    isConnecting,
    chainId,
    chainName,
    connectWeb3Modal,
    disconnectWallet,
    switchToMagic,
    switchToMetaMask,
    switchToWeb3Modal,
    refetchBalance,
    web3,
  }

  return (
    <UnifiedWalletContext.Provider value={value}>
      {children}
    </UnifiedWalletContext.Provider>
  )
}

export const useUnifiedWallet = () => useContext(UnifiedWalletContext)

export default UnifiedWalletProvider
