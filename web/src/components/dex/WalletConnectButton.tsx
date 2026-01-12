'use client'

/**
 * WalletConnectButton - Direct SDK Wallet Connections
 *
 * TRUE in-app wallet connections - NO external modals!
 * - WalletConnect v2: QR code displayed directly in dropdown
 * - Coinbase: Direct SDK with mobile deep links
 * - MetaMask: Direct eth_requestAccounts
 * - Rainbow/Trust: Scan WalletConnect QR
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Wallet, X, Check, Loader2, Copy, RefreshCw, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8e33134dfeea545054faa3493a504b8d'

// Wallet configuration
const WALLETS = [
  {
    id: 'metamask',
    name: 'METAMASK',
    fallbackIcon: '🦊',
    hot: true,
    description: 'Browser extension',
    type: 'extension' as const,
  },
  {
    id: 'walletconnect',
    name: 'WALLETCONNECT',
    fallbackIcon: '🔗',
    hot: true,
    description: 'Scan QR with any wallet',
    type: 'qr' as const,
  },
  {
    id: 'coinbase',
    name: 'COINBASE WALLET',
    fallbackIcon: '🔵',
    hot: false,
    description: 'Mobile app or extension',
    type: 'hybrid' as const,
  },
  {
    id: 'rainbow',
    name: 'RAINBOW',
    fallbackIcon: '🌈',
    hot: false,
    description: 'Scan QR with Rainbow',
    type: 'qr' as const,
  },
  {
    id: 'trust',
    name: 'TRUST WALLET',
    fallbackIcon: '💙',
    hot: false,
    description: 'Scan QR with Trust',
    type: 'qr' as const,
  },
]

interface WalletConnectButtonProps {
  className?: string
  onConnect?: (walletType: string, address: string) => void
  compact?: boolean
}

type ConnectionStep = 'select' | 'qr' | 'connecting' | 'success' | 'error'

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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const wcProviderRef = useRef<any>(null)

  // Unified wallet context
  const {
    activeAddress,
    isConnected,
    activeWalletType,
    disconnectWallet
  } = useUnifiedWallet()

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

  // Connect MetaMask directly
  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined') return

    // Check for MetaMask
    const ethereum = window.ethereum
    if (!ethereum || !ethereum.isMetaMask) {
      // Open MetaMask install page
      window.open('https://metamask.io/download/', '_blank')
      setError('MetaMask not installed - opening download page')
      return
    }

    setStep('connecting')
    setSelectedWallet('metamask')
    setError(null)

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        setStep('success')
        onConnect?.('metamask', accounts[0])
        setTimeout(() => handleClose(), 1500)
      }
    } catch (err: any) {
      console.error('MetaMask error:', err)
      setError(err.message || 'Failed to connect MetaMask')
      setStep('error')
    }
  }, [onConnect])

  // Initialize WalletConnect v2 and get QR URI
  const initWalletConnect = useCallback(async () => {
    setStep('connecting')
    setSelectedWallet('walletconnect')
    setError(null)

    try {
      // Dynamic import to avoid SSR issues
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

      // Disconnect any existing session
      if (wcProviderRef.current) {
        try {
          await wcProviderRef.current.disconnect()
        } catch (e) {
          // Ignore
        }
      }

      const provider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [137], // Polygon primary
        optionalChains: [1, 8453, 42161, 7000], // ETH, Base, Arbitrum, ZetaChain
        showQrModal: false, // WE control the QR display!
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform',
          url: 'https://soundchain.io',
          icons: ['https://soundchain.io/favicons/apple-touch-icon.png'],
        },
      })

      wcProviderRef.current = provider

      // Listen for URI (for QR code)
      provider.on('display_uri', (uri: string) => {
        console.log('WalletConnect URI:', uri)
        setWcUri(uri)
        setStep('qr')
      })

      // Listen for connection
      provider.on('connect', () => {
        const address = provider.accounts[0]
        if (address) {
          setStep('success')
          onConnect?.('walletconnect', address)
          setTimeout(() => handleClose(), 1500)
        }
      })

      // Listen for disconnect
      provider.on('disconnect', () => {
        setWcUri(null)
        setStep('select')
      })

      // Start connection (this triggers display_uri)
      await provider.connect()

    } catch (err: any) {
      console.error('WalletConnect error:', err)
      if (err.message?.includes('User rejected')) {
        setError('Connection rejected')
      } else {
        setError(err.message || 'WalletConnect failed')
      }
      setStep('error')
    }
  }, [onConnect])

  // Connect Coinbase Wallet directly
  const connectCoinbase = useCallback(async () => {
    setStep('connecting')
    setSelectedWallet('coinbase')
    setError(null)

    try {
      // Check for Coinbase extension first
      const coinbaseExtension = (window as any).coinbaseWalletExtension
      if (coinbaseExtension) {
        const accounts = await coinbaseExtension.request({ method: 'eth_requestAccounts' })
        if (accounts && accounts[0]) {
          setStep('success')
          onConnect?.('coinbase', accounts[0])
          setTimeout(() => handleClose(), 1500)
          return
        }
      }

      // Use Coinbase Wallet SDK for mobile
      const { CoinbaseWalletSDK } = await import('@coinbase/wallet-sdk')

      const sdk = new CoinbaseWalletSDK({
        appName: 'SoundChain',
        appLogoUrl: 'https://soundchain.io/favicons/apple-touch-icon.png',
      })

      const provider = sdk.makeWeb3Provider()

      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]

      if (accounts && accounts[0]) {
        setStep('success')
        onConnect?.('coinbase', accounts[0])
        setTimeout(() => handleClose(), 1500)
      }
    } catch (err: any) {
      console.error('Coinbase error:', err)
      setError(err.message || 'Failed to connect Coinbase')
      setStep('error')
    }
  }, [onConnect])

  // Rainbow/Trust use WalletConnect QR
  const connectViaWalletConnectQR = useCallback(async (walletId: string) => {
    setSelectedWallet(walletId)
    await initWalletConnect()
  }, [initWalletConnect])

  // Handle wallet selection
  const handleWalletClick = (walletId: string) => {
    setError(null)

    switch (walletId) {
      case 'metamask':
        connectMetaMask()
        break
      case 'walletconnect':
      case 'rainbow':
      case 'trust':
        connectViaWalletConnectQR(walletId)
        break
      case 'coinbase':
        connectCoinbase()
        break
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
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Get wallet name for QR display
  const getWalletName = () => {
    if (selectedWallet === 'rainbow') return 'Rainbow'
    if (selectedWallet === 'trust') return 'Trust Wallet'
    return 'your wallet'
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
                via {activeWalletType?.toUpperCase() || 'WALLET'}
              </div>
            </div>
            <button
              onClick={() => {
                disconnectWallet()
                handleClose()
              }}
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
        <span className={`text-cyan-400 font-mono font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
          CONNECT
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-neutral-900 border border-cyan-500/30 rounded-lg shadow-xl shadow-cyan-500/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Wallet Selection View */}
          {step === 'select' && (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-cyan-500/20 bg-black/50">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-mono text-xs">"wallet_selection":</span>
                  <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-gray-400 font-mono text-[10px] mt-1 uppercase tracking-wider">
                  Select wallet provider from list
                </div>
              </div>

              {/* Wallet List */}
              <div className="py-2 max-h-80 overflow-y-auto">
                {WALLETS.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletClick(wallet.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-500/10 transition-all duration-150"
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
                        {wallet.description}
                      </div>
                    </div>
                    {wallet.type === 'qr' && (
                      <Smartphone className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-cyan-500/20 bg-black/30">
                <div className="text-gray-600 font-mono text-[9px] text-center uppercase tracking-wider">
                  connection = terms_agreement
                </div>
              </div>
            </>
          )}

          {/* QR Code View */}
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

                {/* QR Code */}
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={wcUri}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
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

          {/* Connecting View */}
          {step === 'connecting' && (
            <div className="p-8 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <div className="text-white font-mono text-sm">Connecting...</div>
              <div className="text-gray-500 text-xs mt-2">
                {selectedWallet === 'metamask' && 'Confirm in MetaMask'}
                {selectedWallet === 'coinbase' && 'Opening Coinbase...'}
                {selectedWallet === 'walletconnect' && 'Initializing...'}
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
              <div className="text-red-400 text-xs text-center font-mono mb-4">
                {error}
              </div>
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-mono text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WalletConnectButton
