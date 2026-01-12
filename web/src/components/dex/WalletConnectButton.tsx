'use client'

/**
 * WalletConnectButton - Retro-style wallet connection UI
 *
 * Clean accordion-style wallet selector matching SoundChain's
 * cyberpunk aesthetic. No external popups - all in-app.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Wallet, X, ExternalLink, Check, Loader2 } from 'lucide-react'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import Web3 from 'web3'

// Wallet configuration
const WALLETS = [
  {
    id: 'metamask',
    name: 'METAMASK',
    icon: '/images/wallets/metamask.svg',
    fallbackIcon: '🦊',
    hot: true,
    description: 'Browser extension',
  },
  {
    id: 'walletconnect',
    name: 'WALLETCONNECT',
    icon: '/images/wallets/walletconnect.svg',
    fallbackIcon: '🔗',
    hot: true,
    description: '300+ mobile wallets',
  },
  {
    id: 'coinbase',
    name: 'COINBASE WALLET',
    icon: '/images/wallets/coinbase.svg',
    fallbackIcon: '🔵',
    hot: false,
    description: 'Coinbase app',
  },
  {
    id: 'rainbow',
    name: 'RAINBOW',
    icon: '/images/wallets/rainbow.svg',
    fallbackIcon: '🌈',
    hot: false,
    description: 'Rainbow wallet',
  },
  {
    id: 'trust',
    name: 'TRUST WALLET',
    icon: '/images/wallets/trust.svg',
    fallbackIcon: '💙',
    hot: false,
    description: 'Trust Wallet app',
  },
]

interface WalletConnectButtonProps {
  className?: string
  onConnect?: (walletType: string, address: string) => void
  compact?: boolean
}

export function WalletConnectButton({
  className = '',
  onConnect,
  compact = false
}: WalletConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Wallet contexts
  const { connectWallet: connectMagicWallet, walletConnectedAddress } = useMagicContext()
  const {
    connectWeb3Modal,
    activeAddress,
    isConnected,
    activeWalletType,
    disconnectWallet
  } = useUnifiedWallet()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Connect MetaMask directly
  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not installed')
      // Open MetaMask install page
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    setConnecting('metamask')
    setError(null)

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        onConnect?.('metamask', accounts[0])
        setIsOpen(false)
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err)
      setError(err.message || 'Failed to connect MetaMask')
    } finally {
      setConnecting(null)
    }
  }, [onConnect])

  // Connect via WalletConnect (uses Web3Modal under the hood)
  const connectWalletConnect = useCallback(async () => {
    setConnecting('walletconnect')
    setError(null)

    try {
      // Use the unified wallet's Web3Modal connection
      await connectWeb3Modal()
      setIsOpen(false)
    } catch (err: any) {
      console.error('WalletConnect error:', err)
      setError(err.message || 'Failed to connect')
    } finally {
      setConnecting(null)
    }
  }, [connectWeb3Modal])

  // Connect Coinbase Wallet
  const connectCoinbase = useCallback(async () => {
    setConnecting('coinbase')
    setError(null)

    try {
      // Check for Coinbase Wallet extension
      const coinbaseWallet = (window as any).coinbaseWalletExtension || (window as any).ethereum?.isCoinbaseWallet

      if (coinbaseWallet) {
        const provider = (window as any).coinbaseWalletExtension || window.ethereum
        const accounts = await provider.request({ method: 'eth_requestAccounts' })
        if (accounts && accounts[0]) {
          onConnect?.('coinbase', accounts[0])
          setIsOpen(false)
        }
      } else {
        // Fallback to Web3Modal which includes Coinbase
        await connectWeb3Modal()
        setIsOpen(false)
      }
    } catch (err: any) {
      console.error('Coinbase connection error:', err)
      setError(err.message || 'Failed to connect Coinbase')
    } finally {
      setConnecting(null)
    }
  }, [connectWeb3Modal, onConnect])

  // Connect Rainbow (via WalletConnect)
  const connectRainbow = useCallback(async () => {
    setConnecting('rainbow')
    setError(null)

    try {
      // Rainbow connects via WalletConnect
      await connectWeb3Modal()
      setIsOpen(false)
    } catch (err: any) {
      console.error('Rainbow connection error:', err)
      setError(err.message || 'Failed to connect Rainbow')
    } finally {
      setConnecting(null)
    }
  }, [connectWeb3Modal])

  // Connect Trust Wallet (via WalletConnect)
  const connectTrust = useCallback(async () => {
    setConnecting('trust')
    setError(null)

    try {
      // Trust connects via WalletConnect
      await connectWeb3Modal()
      setIsOpen(false)
    } catch (err: any) {
      console.error('Trust connection error:', err)
      setError(err.message || 'Failed to connect Trust')
    } finally {
      setConnecting(null)
    }
  }, [connectWeb3Modal])

  // Handle wallet selection
  const handleWalletClick = (walletId: string) => {
    switch (walletId) {
      case 'metamask':
        connectMetaMask()
        break
      case 'walletconnect':
        connectWalletConnect()
        break
      case 'coinbase':
        connectCoinbase()
        break
      case 'rainbow':
        connectRainbow()
        break
      case 'trust':
        connectTrust()
        break
    }
  }

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
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
                setIsOpen(false)
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
          flex items-center gap-2 px-4 py-2
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

      {/* Dropdown Accordion */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-neutral-900 border border-cyan-500/30 rounded-lg shadow-xl shadow-cyan-500/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-cyan-500/20 bg-black/50">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-mono text-xs">"wallet_selection":</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-gray-400 font-mono text-[10px] mt-1 uppercase tracking-wider">
              Select wallet provider from list
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
              <div className="text-red-400 text-xs font-mono">{error}</div>
            </div>
          )}

          {/* Wallet List */}
          <div className="py-2">
            {WALLETS.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletClick(wallet.id)}
                disabled={connecting !== null}
                className={`
                  w-full px-4 py-3 flex items-center gap-3
                  hover:bg-cyan-500/10 transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${connecting === wallet.id ? 'bg-cyan-500/10' : ''}
                `}
              >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-lg">
                  {wallet.fallbackIcon}
                </div>

                {/* Name & Description */}
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

                {/* Loading/Status */}
                {connecting === wallet.id ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-gray-600" />
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
        </div>
      )}
    </div>
  )
}

export default WalletConnectButton
