'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { useMagicContext } from 'hooks/useMagicContext'
import useMetaMask from 'hooks/useMetaMask'
import { useWeb3ModalContext } from './Web3ModalContext'
import Web3 from 'web3'
import { config } from 'config'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import { AbiItem } from 'web3-utils'

// Wallet types supported across SoundChain
export type WalletType = 'magic' | 'metamask' | 'web3modal' | 'direct' | null

// Direct connection storage keys
const DIRECT_WALLET_ADDRESS_KEY = 'soundchain_direct_wallet_address'
const DIRECT_WALLET_TYPE_KEY = 'soundchain_direct_wallet_type'
const DIRECT_WALLET_CHAIN_KEY = 'soundchain_direct_wallet_chain'

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
  // Direct SDK connection support (for WalletConnectButton)
  setDirectConnection: (address: string, walletType: string, chainId?: number) => void
  directWalletSubtype: string | null  // e.g., 'metamask', 'walletconnect', 'coinbase'
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
  setDirectConnection: () => {},
  directWalletSubtype: null,
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
  const [web3ModalOgunBalance, setWeb3ModalOgunBalance] = useState<string | null>(null)
  const web3ModalBalanceFetchRef = useRef<string | null>(null)

  // Direct SDK connection state (for WalletConnectButton)
  const [directAddress, setDirectAddress] = useState<string | null>(null)
  const [directWalletSubtype, setDirectWalletSubtype] = useState<string | null>(null)
  const [directChainId, setDirectChainId] = useState<number | null>(null)

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
    OGUNBalance: metamaskOgunBalance,  // Added OGUN balance from MetaMask
    web3: metamaskWeb3,
    refetchBalance: metamaskRefetchBalance,
    chainId: metamaskChainId,
  } = useMetaMask()

  // Fetch OGUN balance for Web3Modal when connected on Polygon
  useEffect(() => {
    const fetchWeb3ModalOgunBalance = async () => {
      // Only fetch if Web3Modal connected on Polygon (chain 137)
      if (!isWeb3ModalConnected || !web3ModalAddress || web3ModalChainId !== 137) {
        // Not on Polygon - can't fetch OGUN balance
        if (web3ModalChainId && web3ModalChainId !== 137) {
          console.log('⚠️ Web3Modal: Not on Polygon (chain', web3ModalChainId, '), OGUN balance unavailable')
        }
        setWeb3ModalOgunBalance(null)
        return
      }

      // Skip if already fetching for this address
      if (web3ModalBalanceFetchRef.current === web3ModalAddress) return
      web3ModalBalanceFetchRef.current = web3ModalAddress

      const ogunAddress = config.ogunTokenAddress
      if (!ogunAddress) {
        console.log('⚠️ Web3Modal: No OGUN token address configured')
        return
      }

      try {
        // Use window.ethereum for Web3Modal (it shares the provider)
        if (!window.ethereum) return

        const web3 = new Web3(window.ethereum as any)
        const ogunContract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], ogunAddress)
        const tokenAmount = await ogunContract.methods.balanceOf(web3ModalAddress).call()

        let validTokenAmount: string
        if (typeof tokenAmount === 'bigint') {
          validTokenAmount = tokenAmount.toString()
        } else if (typeof tokenAmount === 'string' || typeof tokenAmount === 'number') {
          validTokenAmount = String(tokenAmount)
        } else {
          validTokenAmount = '0'
        }

        const balance = Number(web3.utils.fromWei(validTokenAmount, 'ether')).toFixed(6)
        console.log('💎 Web3Modal OGUN balance:', balance)
        setWeb3ModalOgunBalance(balance)
      } catch (error) {
        console.error('⚠️ Web3Modal OGUN balance fetch failed:', error)
        setWeb3ModalOgunBalance(null)
      }
    }

    fetchWeb3ModalOgunBalance()
  }, [isWeb3ModalConnected, web3ModalAddress, web3ModalChainId])

  // Load persisted wallet choice on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem(WALLET_STORAGE_KEY) as WalletType
      if (savedType) {
        setActiveWalletType(savedType)
        // If direct connection, also load the address and subtype
        if (savedType === 'direct') {
          const savedAddress = localStorage.getItem(DIRECT_WALLET_ADDRESS_KEY)
          const savedSubtype = localStorage.getItem(DIRECT_WALLET_TYPE_KEY)
          const savedChain = localStorage.getItem(DIRECT_WALLET_CHAIN_KEY)
          if (savedAddress) setDirectAddress(savedAddress)
          if (savedSubtype) setDirectWalletSubtype(savedSubtype)
          if (savedChain) setDirectChainId(parseInt(savedChain, 10))
        }
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
    // Clear direct connection state
    if (activeWalletType === 'direct') {
      setDirectAddress(null)
      setDirectWalletSubtype(null)
      setDirectChainId(null)
      localStorage.removeItem(DIRECT_WALLET_ADDRESS_KEY)
      localStorage.removeItem(DIRECT_WALLET_TYPE_KEY)
      localStorage.removeItem(DIRECT_WALLET_CHAIN_KEY)
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

  // Set direct connection (called from WalletConnectButton after SDK connection)
  const setDirectConnection = useCallback((address: string, walletType: string, chainId?: number) => {
    console.log('🔗 Direct wallet connection:', walletType, address, chainId)
    setDirectAddress(address)
    setDirectWalletSubtype(walletType)
    setDirectChainId(chainId || 137)
    setActiveWalletType('direct')
    // Persist to localStorage
    localStorage.setItem(WALLET_STORAGE_KEY, 'direct')
    localStorage.setItem(DIRECT_WALLET_ADDRESS_KEY, address)
    localStorage.setItem(DIRECT_WALLET_TYPE_KEY, walletType)
    localStorage.setItem(DIRECT_WALLET_CHAIN_KEY, String(chainId || 137))
  }, [])

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
      activeOgunBalance = metamaskOgunBalance || null  // Added OGUN balance for MetaMask
      isConnected = !!metamaskAccount
      chainId = metamaskChainId || null
      web3 = metamaskWeb3 || null
      refetchBalance = metamaskRefetchBalance || (() => {})
      break
    case 'web3modal':
      activeAddress = web3ModalAddress || null
      activeOgunBalance = web3ModalOgunBalance  // Added OGUN balance for Web3Modal
      isConnected = isWeb3ModalConnected
      chainId = web3ModalChainId || null
      break
    case 'direct':
      // Direct SDK connection (from WalletConnectButton)
      activeAddress = directAddress
      isConnected = !!directAddress
      chainId = directChainId
      // Note: Balance fetching for direct connections would require additional setup
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
    setDirectConnection,
    directWalletSubtype,
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
    setDirectConnection: () => console.warn('Web3Modal not ready yet'),
    directWalletSubtype: null,
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
