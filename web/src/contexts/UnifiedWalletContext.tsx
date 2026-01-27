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

// External wallet info stored in context for multi-wallet portfolio display
export interface ExternalWalletInfo {
  address: string
  walletType: string // 'metamask' | 'coinbase' | 'walletconnect' | 'phantom'
  chainId: number
  chainName: string
  balance: string
  ogunBalance: string
}

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
  connectMetaMask: () => void  // Added explicit MetaMask connection
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
  // Multi-chain viewing support (EVM networks share the same address)
  nativeTokenSymbol: string  // POL, ETH, etc. based on selected chain
  // All connected external wallets (for multi-wallet portfolio)
  connectedExternalWallets: ExternalWalletInfo[]
  registerExternalWallet: (wallet: ExternalWalletInfo) => void
  removeExternalWallet: (walletType: string) => void
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
  connectMetaMask: () => {},
  disconnectWallet: () => {},
  switchToMagic: () => {},
  switchToMetaMask: () => {},
  switchToWeb3Modal: () => {},
  refetchBalance: () => {},
  web3: null,
  isWeb3ModalReady: false,
  setDirectConnection: () => {},
  directWalletSubtype: null,
  nativeTokenSymbol: 'POL',
  connectedExternalWallets: [],
  registerExternalWallet: () => {},
  removeExternalWallet: () => {},
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

// Native token symbols per chain
const chainSymbols: Record<number, string> = {
  1: 'ETH',
  137: 'POL',
  8453: 'ETH',
  42161: 'ETH',
  10: 'ETH',
  43114: 'AVAX',
  56: 'BNB',
  7000: 'ZETA',
  80002: 'POL',
}

// Public RPCs for balance fetching (read-only, no wallet needed)
const chainRpcs: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  137: 'https://polygon-rpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  7000: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
}

const getRpcForChain = (chainId: number): string => chainRpcs[chainId] || 'https://polygon-rpc.com'

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
  const [web3ModalNativeBalance, setWeb3ModalNativeBalance] = useState<string | null>(null)
  const web3ModalBalanceFetchRef = useRef<string | null>(null)

  // Direct connection balance state
  const [directNativeBalance, setDirectNativeBalance] = useState<string | null>(null)
  const [directOgunBalance, setDirectOgunBalance] = useState<string | null>(null)
  const directBalanceFetchRef = useRef<string | null>(null)

  // Direct SDK connection state (for WalletConnectButton)
  const [directAddress, setDirectAddress] = useState<string | null>(null)
  const [directWalletSubtype, setDirectWalletSubtype] = useState<string | null>(null)
  const [directChainId, setDirectChainId] = useState<number | null>(null)

  // Multi-wallet portfolio: all connected external wallets
  const [connectedExternalWallets, setConnectedExternalWallets] = useState<ExternalWalletInfo[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('soundchain_external_wallets')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const registerExternalWallet = useCallback((wallet: ExternalWalletInfo) => {
    setConnectedExternalWallets(prev => {
      // Replace if same walletType, otherwise add
      const filtered = prev.filter(w => w.walletType !== wallet.walletType)
      const next = [...filtered, wallet]
      localStorage.setItem('soundchain_external_wallets', JSON.stringify(next))
      return next
    })
  }, [])

  const removeExternalWallet = useCallback((walletType: string) => {
    setConnectedExternalWallets(prev => {
      const next = prev.filter(w => w.walletType !== walletType)
      localStorage.setItem('soundchain_external_wallets', JSON.stringify(next))
      return next
    })
  }, [])

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
    connect: connectMetaMaskHook,  // Added connect function
  } = useMetaMask()

  // Fetch balances for Web3Modal connections
  useEffect(() => {
    const fetchWeb3ModalBalances = async () => {
      if (!isWeb3ModalConnected || !web3ModalAddress) {
        setWeb3ModalOgunBalance(null)
        setWeb3ModalNativeBalance(null)
        return
      }

      // Skip if already fetching for this address+chain combo
      const fetchKey = `${web3ModalAddress}-${web3ModalChainId}`
      if (web3ModalBalanceFetchRef.current === fetchKey) return
      web3ModalBalanceFetchRef.current = fetchKey

      try {
        // Use public RPC based on chain for balance fetching
        const rpcUrl = getRpcForChain(web3ModalChainId || 137)
        const web3Instance = new Web3(rpcUrl)

        // Fetch native balance (POL/ETH)
        const nativeWei = await web3Instance.eth.getBalance(web3ModalAddress)
        const nativeBalance = Number(web3Instance.utils.fromWei(nativeWei, 'ether')).toFixed(6)
        setWeb3ModalNativeBalance(nativeBalance)
        console.log(`💰 Web3Modal native balance: ${nativeBalance}`)

        // Fetch OGUN balance (only on Polygon)
        if (web3ModalChainId === 137) {
          const ogunAddress = config.ogunTokenAddress
          if (ogunAddress) {
            const ogunContract = new web3Instance.eth.Contract(SoundchainOGUN20.abi as AbiItem[], ogunAddress)
            const tokenAmount = await ogunContract.methods.balanceOf(web3ModalAddress).call()
            const validAmount = tokenAmount ? tokenAmount.toString() : '0'
            const ogunBalance = Number(web3Instance.utils.fromWei(validAmount, 'ether')).toFixed(6)
            setWeb3ModalOgunBalance(ogunBalance)
            console.log(`💎 Web3Modal OGUN balance: ${ogunBalance}`)
          }
        } else {
          setWeb3ModalOgunBalance(null)
        }
      } catch (error) {
        console.error('⚠️ Web3Modal balance fetch failed:', error)
        setWeb3ModalNativeBalance(null)
        setWeb3ModalOgunBalance(null)
      }
    }

    fetchWeb3ModalBalances()
  }, [isWeb3ModalConnected, web3ModalAddress, web3ModalChainId])

  // Fetch balances for direct SDK connections (MetaMask/Coinbase/WalletConnect via WalletConnectButton)
  useEffect(() => {
    const fetchDirectBalances = async () => {
      if (!directAddress || activeWalletType !== 'direct') {
        setDirectNativeBalance(null)
        setDirectOgunBalance(null)
        return
      }

      const fetchKey = `${directAddress}-${directChainId}`
      if (directBalanceFetchRef.current === fetchKey) return
      directBalanceFetchRef.current = fetchKey

      try {
        const rpcUrl = getRpcForChain(directChainId || 137)
        const web3Instance = new Web3(rpcUrl)

        // Fetch native balance
        const nativeWei = await web3Instance.eth.getBalance(directAddress)
        const nativeBalance = Number(web3Instance.utils.fromWei(nativeWei, 'ether')).toFixed(6)
        setDirectNativeBalance(nativeBalance)
        console.log(`💰 Direct wallet native balance: ${nativeBalance}`)

        // Fetch OGUN balance (only on Polygon)
        if (directChainId === 137 || !directChainId) {
          const ogunAddress = config.ogunTokenAddress
          if (ogunAddress) {
            const ogunContract = new web3Instance.eth.Contract(SoundchainOGUN20.abi as AbiItem[], ogunAddress)
            const tokenAmount = await ogunContract.methods.balanceOf(directAddress).call()
            const validAmount = tokenAmount ? tokenAmount.toString() : '0'
            const ogunBalance = Number(web3Instance.utils.fromWei(validAmount, 'ether')).toFixed(6)
            setDirectOgunBalance(ogunBalance)
            console.log(`💎 Direct wallet OGUN balance: ${ogunBalance}`)
          }
        } else {
          setDirectOgunBalance(null)
        }
      } catch (error) {
        console.error('⚠️ Direct wallet balance fetch failed:', error)
        setDirectNativeBalance(null)
        setDirectOgunBalance(null)
      }
    }

    fetchDirectBalances()
  }, [directAddress, directChainId, activeWalletType])

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

  // Auto-detect MetaMask connection (for when user connects via switchToMetaMask)
  useEffect(() => {
    if (metamaskAccount && activeWalletType !== 'metamask' && activeWalletType !== 'magic') {
      // MetaMask just connected and we're not on magic - switch to it
      console.log('🦊 MetaMask connected, switching wallet type')
      setActiveWalletType('metamask')
      localStorage.setItem(WALLET_STORAGE_KEY, 'metamask')
    }
  }, [metamaskAccount, activeWalletType])

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
      setDirectNativeBalance(null)
      setDirectOgunBalance(null)
      directBalanceFetchRef.current = null
      localStorage.removeItem(DIRECT_WALLET_ADDRESS_KEY)
      localStorage.removeItem(DIRECT_WALLET_TYPE_KEY)
      localStorage.removeItem(DIRECT_WALLET_CHAIN_KEY)
    }
    if (activeWalletType === 'web3modal') {
      setWeb3ModalNativeBalance(null)
      setWeb3ModalOgunBalance(null)
      web3ModalBalanceFetchRef.current = null
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
      // Already connected - just switch
      persistWalletChoice('metamask')
    } else {
      // Not connected - initiate connection then switch
      console.log('🦊 Initiating MetaMask connection...')
      connectMetaMaskHook()
      // Will auto-switch when account becomes available via useEffect below
    }
  }, [metamaskAccount, persistWalletChoice, connectMetaMaskHook])

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
      activeBalance = web3ModalNativeBalance
      activeOgunBalance = web3ModalOgunBalance
      isConnected = isWeb3ModalConnected
      chainId = web3ModalChainId || null
      // Use injected provider for signing transactions
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try { web3 = new Web3((window as any).ethereum) } catch {}
      }
      refetchBalance = () => {
        web3ModalBalanceFetchRef.current = null
      }
      break
    case 'direct':
      activeAddress = directAddress
      activeBalance = directNativeBalance
      activeOgunBalance = directOgunBalance
      isConnected = !!directAddress
      chainId = directChainId
      // Use injected provider for signing transactions
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try { web3 = new Web3((window as any).ethereum) } catch {}
      }
      refetchBalance = () => {
        directBalanceFetchRef.current = null
      }
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
  const nativeTokenSymbol = chainId ? chainSymbols[chainId] || 'ETH' : 'POL'

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
    connectMetaMask: connectMetaMaskHook,
    disconnectWallet,
    switchToMagic,
    switchToMetaMask,
    switchToWeb3Modal,
    setDirectConnection,
    directWalletSubtype,
    refetchBalance,
    web3,
    isWeb3ModalReady: true,
    nativeTokenSymbol,
    connectedExternalWallets,
    registerExternalWallet,
    removeExternalWallet,
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
    connectMetaMask: () => console.warn('MetaMask context not ready yet'),
    disconnectWallet: () => {},
    switchToMagic: () => {},
    switchToMetaMask: () => {},
    switchToWeb3Modal: () => console.warn('Web3Modal not ready yet'),
    setDirectConnection: () => console.warn('Web3Modal not ready yet'),
    directWalletSubtype: null,
    refetchBalance: magicRefetchBalance || (() => {}),
    web3: magicWeb3 || null,
    isWeb3ModalReady: false,
    nativeTokenSymbol: 'POL',
    connectedExternalWallets: [],
    registerExternalWallet: () => {},
    removeExternalWallet: () => {},
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
      // Dynamically import Web3Modal hooks
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
