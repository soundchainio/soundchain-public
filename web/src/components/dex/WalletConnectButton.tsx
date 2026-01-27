'use client'

/**
 * WalletConnectButton - Direct SDK Wallet Connections
 *
 * TRUE in-app wallet connections - NO external modals!
 * - Desktop: QR codes displayed in dropdown
 * - Mobile: Deep links to open wallet apps directly
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Wallet, X, Check, Loader2, Copy, RefreshCw, Smartphone, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8e33134dfeea545054faa3493a504b8d'

// Session persistence keys for mobile return flow
const WC_PENDING_SESSION_KEY = 'soundchain_wc_pending_session'
const WC_PENDING_WALLET_KEY = 'soundchain_wc_pending_wallet'

// Detect mobile device
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Get specific wallet provider when multiple wallets are installed
// This fixes the "wallet collision" where Coinbase hijacks window.ethereum
const getSpecificProvider = (walletType: 'metamask' | 'coinbase' | 'trust' | 'any'): any => {
  if (typeof window === 'undefined') return null

  const ethereum = (window as any).ethereum
  if (!ethereum) return null

  // Check if multiple providers exist (EIP-5749)
  const providers = ethereum.providers || []

  if (walletType === 'metamask') {
    const metamaskProvider = providers.find((p: any) => p.isMetaMask && !p.isCoinbaseWallet)
    if (metamaskProvider) return metamaskProvider
    if (ethereum.isMetaMask && !ethereum.isCoinbaseWallet) return ethereum
    return null
  }

  if (walletType === 'coinbase') {
    const coinbaseProvider = providers.find((p: any) => p.isCoinbaseWallet)
    if (coinbaseProvider) return coinbaseProvider
    if (ethereum.isCoinbaseWallet) return ethereum
    return null
  }

  if (walletType === 'trust') {
    const trustProvider = providers.find((p: any) => p.isTrust)
    if (trustProvider) return trustProvider
    if (ethereum.isTrust) return ethereum
    return null
  }

  return ethereum
}

// Detect if in-app browser (MetaMask, Coinbase, Trust, etc.)
const isInAppBrowser = () => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  // Check user agent first (true in-app browser)
  const isWalletUA = ua.includes('metamask') ||
         ua.includes('coinbase') ||
         ua.includes('coinbasewallet') ||
         ua.includes('cbwallet') ||
         ua.includes('trust') ||
         ua.includes('rainbow')
  return isWalletUA
}

// Get wallet deep links for mobile - Using UNIVERSAL LINKS for reliability
const getWalletDeepLink = (walletId: string, wcUri?: string) => {
  const encodedUri = wcUri ? encodeURIComponent(wcUri) : ''

  switch (walletId) {
    case 'metamask':
      // MetaMask universal link (more reliable than metamask://)
      return wcUri
        ? `https://metamask.app.link/wc?uri=${encodedUri}`
        : `https://metamask.app.link/dapp/${typeof window !== 'undefined' ? window.location.host : 'soundchain.io'}`
    case 'trust':
      // Trust Wallet universal link
      return wcUri
        ? `https://link.trustwallet.com/wc?uri=${encodedUri}`
        : `https://link.trustwallet.com/open_url?url=${encodeURIComponent('https://soundchain.io')}`
    case 'rainbow':
      // Rainbow universal link
      return wcUri
        ? `https://rainbow.me/wc?uri=${encodedUri}`
        : `https://rainbow.me`
    case 'coinbase':
      // Coinbase Wallet - MUST pass WC URI for connection!
      return wcUri
        ? `https://go.cb-w.com/wc?uri=${encodedUri}`
        : `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent('https://soundchain.io')}`
    default:
      return null
  }
}

// Wallet configuration
const WALLETS = [
  {
    id: 'metamask',
    name: 'METAMASK',
    fallbackIcon: '🦊',
    hot: true,
    description: 'Popular wallet',
    mobileDescription: 'Open MetaMask app',
  },
  {
    id: 'walletconnect',
    name: 'WALLETCONNECT',
    fallbackIcon: '🔗',
    hot: true,
    description: 'Scan QR with any wallet',
    mobileDescription: 'Connect 300+ wallets',
  },
  {
    id: 'coinbase',
    name: 'COINBASE WALLET',
    fallbackIcon: '🔵',
    hot: false,
    description: 'Coinbase app',
    mobileDescription: 'Open Coinbase app',
  },
  {
    id: 'rainbow',
    name: 'RAINBOW',
    fallbackIcon: '🌈',
    hot: false,
    description: 'Rainbow wallet',
    mobileDescription: 'Open Rainbow app',
  },
  {
    id: 'trust',
    name: 'TRUST WALLET',
    fallbackIcon: '💙',
    hot: false,
    description: 'Trust Wallet',
    mobileDescription: 'Open Trust app',
  },
]

interface WalletConnectButtonProps {
  className?: string
  onConnect?: (walletType: string, address: string) => void
  compact?: boolean
}

type ConnectionStep = 'select' | 'qr' | 'connecting' | 'success' | 'error' | 'mobile-options'

export function WalletConnectButton({
  className = '',
  onConnect,
  compact = false
}: WalletConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<ConnectionStep>('select')
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [wcUri, setWcUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedUri, setCopiedUri] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [isWalletBrowser, setIsWalletBrowser] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const wcProviderRef = useRef<any>(null)

  // Unified wallet context
  const {
    activeAddress,
    activeBalance,
    activeOgunBalance,
    isConnected,
    activeWalletType,
    disconnectWallet,
    setDirectConnection,
    directWalletSubtype,
    nativeTokenSymbol,
    chainName,
  } = useUnifiedWallet()

  // Detect device type on mount and check for pending mobile sessions
  useEffect(() => {
    setIsMobileDevice(isMobile())
    setIsWalletBrowser(isInAppBrowser())

    // Check if returning from wallet app with a pending session
    const checkPendingSession = async () => {
      const pendingWallet = localStorage.getItem(WC_PENDING_WALLET_KEY)
      if (!pendingWallet || !isMobile()) return

      console.log('📱 Found pending mobile wallet session:', pendingWallet)

      try {
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

        // Try to restore existing session
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          chains: [137],
          optionalChains: [1, 8453, 42161, 7000],
          showQrModal: false,
          metadata: {
            name: 'SoundChain',
            description: 'Web3 Music Platform',
            url: 'https://soundchain.io',
            icons: ['https://soundchain.io/favicons/apple-touch-icon.png'],
          },
        })

        // Check if already connected
        if (provider.connected && provider.accounts.length > 0) {
          console.log('✅ Mobile session restored:', provider.accounts[0])
          const address = provider.accounts[0]
          const chainId = provider.chainId
          setDirectConnection(address, pendingWallet, chainId)

          // Clean up pending session
          localStorage.removeItem(WC_PENDING_SESSION_KEY)
          localStorage.removeItem(WC_PENDING_WALLET_KEY)
        } else {
          // Session expired or not connected, clean up
          console.log('⚠️ Pending session not connected, clearing...')
          localStorage.removeItem(WC_PENDING_SESSION_KEY)
          localStorage.removeItem(WC_PENDING_WALLET_KEY)
        }
      } catch (err) {
        console.error('Failed to restore pending session:', err)
        localStorage.removeItem(WC_PENDING_SESSION_KEY)
        localStorage.removeItem(WC_PENDING_WALLET_KEY)
      }
    }

    // Small delay to let page fully load after returning from wallet app
    setTimeout(checkPendingSession, 500)
  }, [setDirectConnection])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup WalletConnect provider on unmount
  useEffect(() => {
    return () => {
      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.disconnect()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    setStep('select')
    setSelectedWallet(null)
    setWcUri(null)
    setError(null)
  }

  // Connect via injected provider (works in wallet browsers)
  // Uses specific provider to avoid wallet collision
  const connectInjected = useCallback(async (walletType?: 'metamask' | 'coinbase' | 'trust') => {
    // Get the specific provider based on wallet type
    const provider = walletType ? getSpecificProvider(walletType) : (window as any).ethereum

    if (!provider) {
      setError(`${walletType || 'Wallet'} not detected`)
      setStep('error')
      return
    }

    setStep('connecting')
    setError(null)

    try {
      console.log(`[WalletConnect] Connecting to ${walletType || 'injected'} provider...`)
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        // Get chain ID
        const chainIdHex = await provider.request({ method: 'eth_chainId' })
        const chainId = parseInt(chainIdHex as string, 16)
        // Determine wallet type from the provider we used
        const detectedType = provider.isMetaMask ? 'metamask' :
                          provider.isCoinbaseWallet ? 'coinbase' :
                          provider.isTrust ? 'trust' : 'injected'
        // Update unified wallet context
        setDirectConnection(accounts[0], walletType || detectedType, chainId)
        setStep('success')
        onConnect?.(walletType || 'injected', accounts[0])
        setTimeout(() => handleClose(), 1500)
      }
    } catch (err: any) {
      console.error('Injected wallet error:', err)
      setError(err.message || 'Failed to connect')
      setStep('error')
    }
  }, [onConnect, setDirectConnection])

  // Connect MetaMask - uses specific provider to avoid Coinbase collision
  const connectMetaMask = useCallback(async () => {
    setSelectedWallet('metamask')

    // Get the specific MetaMask provider
    const metamaskProvider = getSpecificProvider('metamask')

    // On mobile, open MetaMask app via deep link
    if (isMobileDevice) {
      await initWalletConnectForMobile('metamask')
      return
    }

    // Desktop: Check if MetaMask provider exists
    if (metamaskProvider) {
      console.log('[WalletConnect] Found MetaMask provider, connecting...')
      await connectInjected('metamask')
      return
    }

    // MetaMask not installed - show download link
    window.open('https://metamask.io/download/', '_blank')
    setError('MetaMask not installed. Please install the extension.')
    setStep('error')
  }, [isMobileDevice, connectInjected])

  // Initialize WalletConnect v2 and get QR URI
  const initWalletConnect = useCallback(async (retryCount = 0) => {
    setStep('connecting')
    if (!selectedWallet) setSelectedWallet('walletconnect')
    setError(null)

    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

      // Disconnect any existing session
      if (wcProviderRef.current) {
        try {
          await wcProviderRef.current.disconnect()
        } catch (e) {}
      }

      // Add timeout for provider init (relay can be slow)
      const initPromise = EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [137],
        optionalChains: [1, 8453, 42161, 7000],
        showQrModal: false,
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform',
          url: 'https://soundchain.io',
          icons: ['https://soundchain.io/favicons/apple-touch-icon.png'],
        },
      })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 25000)
      )

      const provider = await Promise.race([initPromise, timeoutPromise]) as any

      wcProviderRef.current = provider

      provider.on('display_uri', (uri: string) => {
        console.log('WalletConnect URI:', uri)
        setWcUri(uri)

        // On mobile, show deep link options instead of QR
        if (isMobileDevice) {
          setStep('mobile-options')
        } else {
          setStep('qr')
        }
      })

      provider.on('connect', () => {
        const address = provider.accounts[0]
        const chainId = provider.chainId
        if (address) {
          // Update unified wallet context
          setDirectConnection(address, 'walletconnect', chainId)
          setStep('success')
          onConnect?.('walletconnect', address)
          setTimeout(() => handleClose(), 1500)
        }
      })

      provider.on('disconnect', () => {
        setWcUri(null)
        setStep('select')
      })

      await provider.connect()

    } catch (err: any) {
      console.error('WalletConnect error:', err)

      // Retry up to 3 times with exponential backoff for relay failures
      if (retryCount < 3 && (
        err.message?.includes('publish') ||
        err.message?.includes('timeout') ||
        err.message?.includes('relay') ||
        err.message?.includes('WebSocket')
      )) {
        const delay = 1000 * Math.pow(2, retryCount) // 1s, 2s, 4s
        console.log(`Retrying WalletConnect (attempt ${retryCount + 2}/4) in ${delay}ms...`)
        setTimeout(() => initWalletConnect(retryCount + 1), delay)
        return
      }

      if (err.message?.includes('User rejected')) {
        setError('Connection rejected')
      } else if (err.message?.includes('timeout')) {
        setError('Connection timed out. Please try again.')
      } else if (err.message?.includes('publish')) {
        setError('Network issue. Please check your connection and try again.')
      } else {
        setError(err.message || 'WalletConnect failed')
      }
      setStep('error')
    }
  }, [onConnect, isMobileDevice, selectedWallet, setDirectConnection])

  // Initialize WalletConnect for mobile deep link (with auto-retry)
  const initWalletConnectForMobile = useCallback(async (walletId: string, retryCount = 0) => {
    setSelectedWallet(walletId)
    setStep('connecting')
    setError(null)

    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

      if (wcProviderRef.current) {
        try {
          await wcProviderRef.current.disconnect()
        } catch (e) {}
      }

      // Longer timeout for mobile - relay is often slow on cellular
      const initPromise = EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [137],
        optionalChains: [1, 8453, 42161, 7000],
        showQrModal: false,
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform',
          url: 'https://soundchain.io',
          icons: ['https://soundchain.io/favicons/apple-touch-icon.png'],
        },
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      )

      const provider = await Promise.race([initPromise, timeoutPromise])
      wcProviderRef.current = provider

      // Track if display_uri fired
      let uriGenerated = false

      provider.on('display_uri', (uri: string) => {
        uriGenerated = true
        console.log('📱 Mobile WalletConnect URI generated')
        setWcUri(uri)

        // CRITICAL: Save pending session BEFORE opening wallet app
        // This allows us to restore the connection when user returns
        localStorage.setItem(WC_PENDING_WALLET_KEY, walletId)
        localStorage.setItem(WC_PENDING_SESSION_KEY, Date.now().toString())

        // Open the wallet app with the URI using universal link
        const deepLink = getWalletDeepLink(walletId, uri)
        if (deepLink) {
          console.log('📱 Opening wallet app:', deepLink.substring(0, 50) + '...')
          // Use window.location.href for mobile - window.open often blocked
          window.location.href = deepLink
        }
        setStep('mobile-options')
      })

      provider.on('connect', () => {
        const address = provider.accounts[0]
        const chainId = provider.chainId
        if (address) {
          console.log('✅ Mobile wallet connected:', address)
          // Clean up pending session
          localStorage.removeItem(WC_PENDING_SESSION_KEY)
          localStorage.removeItem(WC_PENDING_WALLET_KEY)
          // Update unified wallet context
          setDirectConnection(address, walletId, chainId)
          setStep('success')
          onConnect?.(walletId, address)
          setTimeout(() => handleClose(), 1500)
        }
      })

      // Longer timeout for connect() on mobile
      const connectPromise = provider.connect()
      const connectTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => {
          // If URI was generated, don't show error (user is in wallet app)
          if (!uriGenerated) {
            reject(new Error('Connection timeout'))
          }
        }, 30000)
      )

      await Promise.race([connectPromise, connectTimeout])

    } catch (err: any) {
      console.error('Mobile WalletConnect error:', err)

      // Auto-retry up to 2 times with exponential backoff
      if (retryCount < 2 && (
        err.message?.includes('timeout') ||
        err.message?.includes('relay') ||
        err.message?.includes('publish') ||
        err.message?.includes('WebSocket')
      )) {
        const delay = 1500 * Math.pow(2, retryCount) // 1.5s, 3s
        console.log(`📱 Auto-retrying mobile WalletConnect (attempt ${retryCount + 2}/3) in ${delay}ms...`)
        setError(`Relay slow, retrying... (${retryCount + 2}/3)`)
        setTimeout(() => initWalletConnectForMobile(walletId, retryCount + 1), delay)
        return
      }

      // All retries exhausted
      localStorage.removeItem(WC_PENDING_SESSION_KEY)
      localStorage.removeItem(WC_PENDING_WALLET_KEY)
      setError('Relay timed out. Tap Try Again or try Wi-Fi instead of cellular.')
      setStep('error')
    }
  }, [onConnect, setDirectConnection])

  // Connect Coinbase Wallet - uses specific provider
  const connectCoinbase = useCallback(async () => {
    setSelectedWallet('coinbase')
    setStep('connecting')
    setError(null)

    // Get the specific Coinbase provider
    const coinbaseProvider = getSpecificProvider('coinbase')

    // On mobile, use WalletConnect flow with Coinbase deep link
    if (isMobileDevice) {
      await initWalletConnectForMobile('coinbase')
      return
    }

    // Desktop: Check if Coinbase provider exists (extension or injected)
    if (coinbaseProvider) {
      console.log('[WalletConnect] Found Coinbase provider, connecting...')
      await connectInjected('coinbase')
      return
    }

    // Desktop - fallback to Coinbase SDK (creates new connection)
    try {
      const { CoinbaseWalletSDK } = await import('@coinbase/wallet-sdk')
      const sdk = new CoinbaseWalletSDK({
        appName: 'SoundChain',
        appLogoUrl: 'https://soundchain.io/favicons/apple-touch-icon.png',
      })
      const provider = sdk.makeWeb3Provider()
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]

      if (accounts && accounts[0]) {
        const chainIdHex = await provider.request({ method: 'eth_chainId' }) as string
        const chainId = parseInt(chainIdHex, 16)
        setDirectConnection(accounts[0], 'coinbase', chainId)
        setStep('success')
        onConnect?.('coinbase', accounts[0])
        setTimeout(() => handleClose(), 1500)
      }
    } catch (err: any) {
      console.error('Coinbase error:', err)
      setError(err.message || 'Failed to connect Coinbase')
      setStep('error')
    }
  }, [isMobileDevice, connectInjected, onConnect, setDirectConnection, initWalletConnectForMobile])

  // Handle wallet selection
  const handleWalletClick = (walletId: string) => {
    setError(null)
    setSelectedWallet(walletId)

    // If in a wallet's in-app browser, connect to that specific wallet
    if (isWalletBrowser) {
      // Determine which wallet's browser we're in
      const ua = navigator.userAgent.toLowerCase()
      if (ua.includes('metamask')) {
        connectInjected('metamask')
      } else if (ua.includes('coinbase') || ua.includes('cbwallet')) {
        connectInjected('coinbase')
      } else if (ua.includes('trust')) {
        connectInjected('trust')
      } else {
        connectInjected()
      }
      return
    }

    switch (walletId) {
      case 'metamask':
        connectMetaMask()
        break
      case 'walletconnect':
        initWalletConnect()
        break
      case 'coinbase':
        connectCoinbase()
        break
      case 'rainbow':
      case 'trust':
        if (isMobileDevice) {
          initWalletConnectForMobile(walletId)
        } else {
          setSelectedWallet(walletId)
          initWalletConnect()
        }
        break
    }
  }

  // Open wallet app on mobile
  const openWalletApp = (walletId: string) => {
    const deepLink = getWalletDeepLink(walletId, wcUri || undefined)
    if (deepLink) {
      window.location.href = deepLink
    }
  }

  // Copy WalletConnect URI
  const copyUri = () => {
    if (wcUri) {
      navigator.clipboard.writeText(wcUri)
      setCopiedUri(true)
      setTimeout(() => setCopiedUri(false), 2000)
    }
  }

  // Format address for display
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Get wallet name for display
  const getWalletName = () => {
    const wallet = WALLETS.find(w => w.id === selectedWallet)
    return wallet?.name || 'Wallet'
  }

  // If connected, show connected state
  if (isConnected && activeAddress) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 border border-cyan-500/50 rounded-lg bg-black/50 hover:bg-cyan-500/10 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-cyan-400 font-mono text-sm">
            {formatAddress(activeAddress)}
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-neutral-900 border border-cyan-500/30 rounded-lg shadow-xl shadow-cyan-500/10 z-50 overflow-hidden">
            <div className="p-3 border-b border-cyan-500/20">
              <div className="text-cyan-400 font-mono text-xs mb-1">"connected":</div>
              <div className="text-white font-mono text-sm truncate">{activeAddress}</div>
              <div className="text-gray-500 text-xs mt-1">
                via {(activeWalletType === 'direct' ? directWalletSubtype : activeWalletType)?.toUpperCase() || 'WALLET'}
                {chainName && <span> · {chainName}</span>}
              </div>
              {(activeBalance || activeOgunBalance) && (
                <div className="mt-2 flex gap-3 text-xs font-mono">
                  {activeBalance && (
                    <span className="text-green-400">{Number(activeBalance).toFixed(4)} {nativeTokenSymbol}</span>
                  )}
                  {activeOgunBalance && (
                    <span className="text-yellow-400">{Number(activeOgunBalance).toFixed(2)} OGUN</span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => { disconnectWallet(); handleClose(); }}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 font-mono text-sm transition-colors"
            >
              DISCONNECT
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Connect Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2
          border border-cyan-500/50 rounded-lg
          bg-black/50 hover:bg-cyan-500/10
          hover:border-cyan-400
          transition-all duration-200
          ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}
        `}
      >
        <Wallet className={`text-cyan-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <span className={`text-cyan-400 font-mono font-bold hidden sm:inline ${compact ? 'text-xs' : 'text-sm'}`}>
          CONNECT
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-neutral-900 border border-cyan-500/30 rounded-lg shadow-xl shadow-cyan-500/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Wallet Selection View */}
          {step === 'select' && (
            <>
              <div className="px-4 py-3 border-b border-cyan-500/20 bg-black/50">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-mono text-xs">"wallet_selection":</span>
                  <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-gray-400 font-mono text-[10px] mt-1 uppercase tracking-wider">
                  {isMobileDevice ? 'Tap to open wallet app' : 'Select wallet provider'}
                </div>
              </div>

              <div className="py-2 max-h-80 overflow-y-auto">
                {WALLETS.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletClick(wallet.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-500/10 transition-all duration-150 active:bg-cyan-500/20"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-xl">
                      {wallet.fallbackIcon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm font-bold">
                          {wallet.name}
                        </span>
                        {wallet.hot && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500/20 text-orange-400 rounded border border-orange-500/30">
                            HOT
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-[10px] font-mono">
                        {isMobileDevice ? wallet.mobileDescription : wallet.description}
                      </div>
                    </div>
                    {isMobileDevice ? (
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    ) : wallet.id !== 'metamask' && wallet.id !== 'coinbase' ? (
                      <Smartphone className="w-4 h-4 text-gray-600" />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-cyan-500/20 bg-black/30">
                <div className="text-gray-600 font-mono text-[9px] text-center uppercase tracking-wider">
                  {isMobileDevice ? 'opens wallet app on your device' : 'connection = terms_agreement'}
                </div>
              </div>
            </>
          )}

          {/* QR Code View (Desktop) */}
          {step === 'qr' && wcUri && (
            <>
              <div className="px-4 py-3 border-b border-cyan-500/20 bg-black/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStep('select'); setWcUri(null); }}
                    className="text-gray-400 hover:text-white text-xs font-mono"
                  >
                    ← BACK
                  </button>
                  <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 flex flex-col items-center">
                <div className="text-white font-mono text-sm mb-4 text-center">
                  Scan with {getWalletName()}
                </div>

                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG value={wcUri} size={200} level="M" includeMargin={false} />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={copyUri}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-mono text-gray-300 transition-colors"
                  >
                    {copiedUri ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copiedUri ? 'Copied!' : 'Copy URI'}
                  </button>
                  <button
                    onClick={() => initWalletConnect()}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-mono text-gray-300 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>

                <div className="mt-4 text-gray-500 text-[10px] font-mono text-center">
                  Waiting for connection...
                </div>
              </div>
            </>
          )}

          {/* Mobile Options View */}
          {step === 'mobile-options' && wcUri && (
            <>
              <div className="px-4 py-3 border-b border-cyan-500/20 bg-black/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStep('select'); setWcUri(null); }}
                    className="text-gray-400 hover:text-white text-xs font-mono"
                  >
                    ← BACK
                  </button>
                  <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="text-white font-mono text-sm mb-4 text-center">
                  Open in wallet app
                </div>

                <div className="space-y-2">
                  {['metamask', 'trust', 'rainbow', 'coinbase'].map((walletId) => {
                    const wallet = WALLETS.find(w => w.id === walletId)
                    if (!wallet) return null
                    return (
                      <button
                        key={walletId}
                        onClick={() => openWalletApp(walletId)}
                        className="w-full px-4 py-3 flex items-center gap-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        <span className="text-xl">{wallet.fallbackIcon}</span>
                        <span className="text-white font-mono text-sm">{wallet.name}</span>
                        <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-700">
                  <button
                    onClick={copyUri}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-mono text-gray-300 transition-colors"
                  >
                    {copiedUri ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copiedUri ? 'Copied!' : 'Copy connection link'}
                  </button>
                </div>

                <div className="mt-4 text-gray-500 text-[10px] font-mono text-center">
                  Waiting for connection...
                </div>
              </div>
            </>
          )}

          {/* Connecting View */}
          {step === 'connecting' && (
            <div className="p-8 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <div className="text-white font-mono text-sm">Connecting...</div>
              <div className="text-gray-500 text-xs mt-2">
                {isMobileDevice ? 'Opening wallet app...' : 'Please wait...'}
              </div>
            </div>
          )}

          {/* Success View */}
          {step === 'success' && (
            <div className="p-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-white font-mono text-sm">Connected!</div>
              <div className="text-green-400 text-xs mt-2 font-mono">
                {selectedWallet?.toUpperCase()}
              </div>
            </div>
          )}

          {/* Error View */}
          {step === 'error' && (
            <div className="p-6 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-white font-mono text-sm mb-2">Connection Failed</div>
              <div className="text-red-400 text-xs text-center font-mono mb-4">{error}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedWallet) {
                      handleWalletClick(selectedWallet)
                    } else {
                      setStep('select')
                    }
                  }}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-xs font-mono text-cyan-400 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Try Again
                </button>
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-mono text-white transition-colors"
                >
                  Other Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WalletConnectButton
