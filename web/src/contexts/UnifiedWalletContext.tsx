'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useMagicContext } from 'hooks/useMagicContext'
import useMetaMask from 'hooks/useMetaMask'
import { useWeb3ModalContext } from './Web3ModalContext'
import Web3 from 'web3'

// Wallet types supported across SoundChain
export type WalletType = 'magic' | 'metamask' | 'web3modal' | null

export interface UnifiedWalletState {
  activeWalletType: WalletType
  activeAddress: string | null
  activeBalance: string | null
  activeOgunBalance: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  chainName: string | null
  connectWeb3Modal: () => void
  disconnectWallet: () => void
  switchToMagic: () => void
  switchToMetaMask: () => void
  switchToWeb3Modal: () => void
  refetchBalance: () => void
  web3: Web3 | null
  isWeb3ModalReady: boolean
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
  isWeb3ModalReady: false,
}

const UnifiedWalletContext = createContext<UnifiedWalletState>(defaultState)

const WALLET_STORAGE_KEY = 'soundchain_active_wallet_type'

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

// Inner provider that uses Web3Modal hooks (only rendered when ready)
function UnifiedWalletInner({
  children,
  web3ModalHooks
}: {
  children: ReactNode
  web3ModalHooks: {
    useWeb3Modal: any
    useWeb3ModalAccount: any
    useDisconnect: any
  }
}) {
  const [activeWalletType, setActiveWalletType] = useState<WalletType>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Web3Modal hooks
  const { open } = web3ModalHooks.useWeb3Modal()
  const { address: web3ModalAddress, isConnected: isWeb3ModalConnected, chainId: web3ModalChainId } = web3ModalHooks.useWeb3ModalAccount()
  const { disconnect: disconnectWeb3Modal } = web3ModalHooks.useDisconnect()

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
        setActiveWalletType('magic')
      }
    }
  }, [magicAccount])

  // Auto-detect Web3Modal connection
  useEffect(() => {
    if (isWeb3ModalConnected && web3ModalAddress && activeWalletType !== 'web3modal') {
      setActiveWalletType('web3modal')
      localStorage.setItem(WALLET_STORAGE_KEY, 'web3modal')
    }
  }, [isWeb3ModalConnected, web3ModalAddress, activeWalletType])

  const persistWalletChoice = useCallback((type: WalletType) => {
    setActiveWalletType(type)
    if (type) {
      localStorage.setItem(WALLET_STORAGE_KEY, type)
    } else {
      localStorage.removeItem(WALLET_STORAGE_KEY)
    }
  }, [])

  const connectWeb3Modal = useCallback(async () => {
    setIsConnecting(true)
    try {
      await open()
    } catch (error) {
      console.error('Web3Modal connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [open])

  const disconnectWallet = useCallback(async () => {
    if (activeWalletType === 'web3modal') {
      await disconnectWeb3Modal()
    }
    persistWalletChoice(null)
    localStorage.removeItem('connectedWalletAddress')
    localStorage.removeItem('connectedWalletType')
  }, [activeWalletType, disconnectWeb3Modal, persistWalletChoice])

  const switchToMagic = useCallback(() => {
    if (magicAccount) {
      persistWalletChoice('magic')
    }
  }, [magicAccount, persistWalletChoice])

  const switchToMetaMask = useCallback(() => {
    if (metamaskAccount) {
      persistWalletChoice('metamask')
    }
  }, [metamaskAccount, persistWalletChoice])

  const switchToWeb3Modal = useCallback(() => {
    if (isWeb3ModalConnected && web3ModalAddress) {
      persistWalletChoice('web3modal')
    } else {
      connectWeb3Modal()
    }
  }, [isWeb3ModalConnected, web3ModalAddress, persistWalletChoice, connectWeb3Modal])

  // Compute active wallet state
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
      chainId = 137
      web3 = magicWeb3 || null
      refetchBalance = magicRefetchBalance || (() => {})
      break
    case 'metamask':
      activeAddress = metamaskAccount || null
      activeBalance = metamaskBalance || null
      isConnected = !!metamaskAccount
      chainId = metamaskChainId || null
      web3 = metamaskWeb3 || null
      refetchBalance = metamaskRefetchBalance || (() => {})
      break
    case 'web3modal':
      activeAddress = web3ModalAddress || null
      isConnected = isWeb3ModalConnected
      chainId = web3ModalChainId || null
      break
    default:
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
    isWeb3ModalReady: true,
  }

  return (
    <UnifiedWalletContext.Provider value={value}>
      {children}
    </UnifiedWalletContext.Provider>
  )
}

// Fallback provider when Web3Modal is not ready
function UnifiedWalletFallback({ children }: { children: ReactNode }) {
  const {
    account: magicAccount,
    balance: magicBalance,
    ogunBalance: magicOgunBalance,
    web3: magicWeb3,
    refetchBalance: magicRefetchBalance,
  } = useMagicContext()

  const value: UnifiedWalletState = {
    activeWalletType: magicAccount ? 'magic' : null,
    activeAddress: magicAccount || null,
    activeBalance: magicBalance || null,
    activeOgunBalance: magicOgunBalance || null,
    isConnected: !!magicAccount,
    isConnecting: false,
    chainId: magicAccount ? 137 : null,
    chainName: magicAccount ? 'Polygon' : null,
    connectWeb3Modal: () => console.warn('Web3Modal not ready yet'),
    disconnectWallet: () => {},
    switchToMagic: () => {},
    switchToMetaMask: () => {},
    switchToWeb3Modal: () => console.warn('Web3Modal not ready yet'),
    refetchBalance: magicRefetchBalance || (() => {}),
    web3: magicWeb3 || null,
    isWeb3ModalReady: false,
  }

  return (
    <UnifiedWalletContext.Provider value={value}>
      {children}
    </UnifiedWalletContext.Provider>
  )
}

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  const { isReady } = useWeb3ModalContext()
  const [web3ModalHooks, setWeb3ModalHooks] = useState<any>(null)

  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      // Dynamically import hooks after Web3Modal is initialized
      import('@web3modal/ethers5/react').then((module) => {
        setWeb3ModalHooks({
          useWeb3Modal: module.useWeb3Modal,
          useWeb3ModalAccount: module.useWeb3ModalAccount,
          useDisconnect: module.useDisconnect,
        })
      }).catch((e) => {
        console.error('Failed to load Web3Modal hooks:', e)
      })
    }
  }, [isReady])

  if (!isReady || !web3ModalHooks) {
    return <UnifiedWalletFallback>{children}</UnifiedWalletFallback>
  }

  return (
    <UnifiedWalletInner web3ModalHooks={web3ModalHooks}>
      {children}
    </UnifiedWalletInner>
  )
}

export const useUnifiedWallet = () => useContext(UnifiedWalletContext)

export default UnifiedWalletProvider
