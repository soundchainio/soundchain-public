/**
 * ConnectedWalletsPanel - Hybrid Multi-Chain Wallet Aggregator
 *
 * Shows ALL connected wallets across ALL chains in one unified view.
 * This is SoundChain's unique differentiator - the only hybrid wallet
 * connection platform in Web3 music.
 *
 * Supported chains: Ethereum, Polygon, Solana, Base, ZetaChain, Arbitrum, etc.
 */

import React, { useState, useRef, useCallback } from 'react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Plus,
  X,
  Play,
  Pause,
  Check,
  Loader2,
  Wallet,
  Zap
} from 'lucide-react'
import { getIpfsUrl } from 'utils/ipfs'

// Chain configurations
export const CHAIN_CONFIG: Record<string, ChainInfo> = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    color: 'from-blue-500 to-purple-500',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    explorer: 'https://etherscan.io',
    icon: '⟠',
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    explorer: 'https://polygonscan.com',
    icon: '⬡',
  },
  solana: {
    id: -1, // Non-EVM
    name: 'Solana',
    symbol: 'SOL',
    color: 'from-green-400 to-cyan-500',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    explorer: 'https://solscan.io',
    icon: '◎',
  },
  base: {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    color: 'from-blue-600 to-blue-400',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    explorer: 'https://basescan.org',
    icon: '🔵',
  },
  zetachain: {
    id: 7000,
    name: 'ZetaChain',
    symbol: 'ZETA',
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    explorer: 'https://explorer.zetachain.com',
    icon: '⚡',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    explorer: 'https://arbiscan.io',
    icon: '🔷',
  },
}

interface ChainInfo {
  id: number
  name: string
  symbol: string
  color: string
  borderColor: string
  textColor: string
  explorer: string
  icon: string
}

export interface ConnectedWallet {
  id: string
  address: string
  chainKey: string // Key into CHAIN_CONFIG
  balance: string
  nftCount: number
  nfts: WalletNFT[]
  walletType: 'magic' | 'metamask' | 'coinbase' | 'walletconnect' | 'phantom' | 'rainbow'
  isActive?: boolean
}

export interface WalletNFT {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  audioUrl?: string
  tokenId?: string | number
}

interface ConnectedWalletsPanelProps {
  wallets: ConnectedWallet[]
  onConnectWallet?: (chainKey: string) => void
  onDisconnectWallet?: (walletId: string) => void
  onPlayTrack?: (nft: WalletNFT, walletId: string, index: number) => void
  onTrackClick?: (nftId: string) => void
  currentTrackId?: string
  isPlaying?: boolean
  isConnecting?: boolean
  connectingChain?: string
}

export function ConnectedWalletsPanel({
  wallets,
  onConnectWallet,
  onDisconnectWallet,
  onPlayTrack,
  onTrackClick,
  currentTrackId,
  isPlaying,
  isConnecting,
  connectingChain,
}: ConnectedWalletsPanelProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [showChainMenu, setShowChainMenu] = useState(false)

  const handleCopyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }, [])

  const formatAddress = (addr: string) => {
    if (!addr) return '---'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatBalance = (balance: string, decimals: number = 2) => {
    const num = parseFloat(balance)
    if (isNaN(num)) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    return num.toFixed(decimals)
  }

  // Available chains to connect
  const availableChains = Object.keys(CHAIN_CONFIG).filter(
    chainKey => !wallets.some(w => w.chainKey === chainKey)
  )

  return (
    <div className="space-y-3 px-2 sm:px-0">
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Connected Wallets
          </h2>
          <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] sm:text-xs px-1.5 py-0.5">
            {wallets.length}
          </Badge>
        </div>

        {/* Add Wallet Button - Mobile: Icon only, Desktop: Icon + Text */}
        {availableChains.length > 0 && onConnectWallet && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:bg-cyan-500/20 active:bg-cyan-500/30 px-2 sm:px-3 h-8"
              disabled={isConnecting}
              onClick={() => setShowChainMenu(!showChainMenu)}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-1">Add</span>
            </Button>

            {/* Dropdown for chain selection - Mobile: Full width bottom sheet style */}
            {showChainMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                  onClick={() => setShowChainMenu(false)}
                />
                <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:right-0 sm:top-full sm:left-auto sm:bottom-auto sm:mt-1 w-full sm:w-56 bg-gray-900 border-t sm:border border-gray-700 rounded-t-2xl sm:rounded-lg shadow-xl z-50 max-h-[60vh] overflow-y-auto">
                  <div className="py-2 sm:py-1">
                    <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider sm:hidden">
                      Select Chain
                    </div>
                    {availableChains.map(chainKey => {
                      const chain = CHAIN_CONFIG[chainKey]
                      return (
                        <button
                          key={chainKey}
                          onClick={() => {
                            onConnectWallet(chainKey)
                            setShowChainMenu(false)
                          }}
                          disabled={isConnecting && connectingChain === chainKey}
                          className="w-full px-4 py-3 sm:py-2 text-left text-sm sm:text-sm text-white hover:bg-gray-800 active:bg-gray-700 flex items-center gap-3"
                        >
                          <span className="text-xl sm:text-lg">{chain.icon}</span>
                          <div className="flex-1">
                            <span className="block font-medium">{chain.name}</span>
                            <span className="text-xs text-gray-500 sm:hidden">{chain.symbol}</span>
                          </div>
                          {isConnecting && connectingChain === chainKey && (
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {/* Mobile close button */}
                  <div className="sm:hidden border-t border-gray-800 p-3">
                    <Button
                      variant="ghost"
                      className="w-full text-gray-400"
                      onClick={() => setShowChainMenu(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Wallet Cards */}
      <div className="space-y-3">
        {wallets.map(wallet => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onCopyAddress={handleCopyAddress}
            copiedAddress={copiedAddress}
            onDisconnect={onDisconnectWallet}
            onPlayTrack={onPlayTrack}
            onTrackClick={onTrackClick}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
          />
        ))}

        {/* Empty State */}
        {wallets.length === 0 && (
          <Card className="p-8 text-center border-dashed border-2 border-gray-700">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-4">No wallets connected yet</p>
            <p className="text-gray-500 text-xs mb-4">
              Connect wallets from multiple chains to view your entire NFT collection
            </p>
            {onConnectWallet && (
              <Button
                onClick={() => onConnectWallet('polygon')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect First Wallet
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Cross-Chain Info */}
      {wallets.length >= 2 && (
        <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <Zap className="w-4 h-4" />
            <span className="font-bold">Cross-Chain Enabled</span>
            <span className="text-gray-400">• Powered by ZetaChain</span>
          </div>
        </Card>
      )}
    </div>
  )
}

// Individual Wallet Card Component
interface WalletCardProps {
  wallet: ConnectedWallet
  onCopyAddress: (address: string) => void
  copiedAddress: string | null
  onDisconnect?: (walletId: string) => void
  onPlayTrack?: (nft: WalletNFT, walletId: string, index: number) => void
  onTrackClick?: (nftId: string) => void
  currentTrackId?: string
  isPlaying?: boolean
}

function WalletCard({
  wallet,
  onCopyAddress,
  copiedAddress,
  onDisconnect,
  onPlayTrack,
  onTrackClick,
  currentTrackId,
  isPlaying,
}: WalletCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const chain = CHAIN_CONFIG[wallet.chainKey] || CHAIN_CONFIG.polygon

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 150
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <Card className={`overflow-hidden ${chain.borderColor} bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800`}>
      {/* Wallet Header - Mobile Optimized */}
      <div className="p-3 sm:p-4 border-b border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Chain Icon - Smaller on mobile */}
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br ${chain.color} flex items-center justify-center text-white text-base sm:text-lg shadow-lg`}>
              {chain.icon}
            </div>

            <div className="min-w-0">
              {/* Address - Truncated more on mobile */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <code className={`font-mono text-xs sm:text-sm ${chain.textColor} truncate`}>
                  {formatAddress(wallet.address)}
                </code>
                <button
                  onClick={() => onCopyAddress(wallet.address)}
                  className="text-gray-500 hover:text-white active:text-cyan-400 transition-colors p-1 -m-1"
                >
                  {copiedAddress === wallet.address ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <a
                  href={`${chain.explorer}/address/${wallet.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-white active:text-cyan-400 transition-colors p-1 -m-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Chain Name */}
              <p className="text-[10px] sm:text-xs text-gray-500">{chain.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Balance - Stacked on mobile */}
            <div className="text-right">
              <p className="text-white font-bold text-sm sm:text-base">
                {parseFloat(wallet.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-[10px] sm:text-xs text-gray-400 ml-1">{chain.symbol}</span>
              </p>
              <p className={`text-[10px] sm:text-xs ${chain.textColor}`}>
                {wallet.nftCount} NFTs
              </p>
            </div>

            {/* Disconnect Button - Touch-friendly */}
            {onDisconnect && wallet.walletType !== 'magic' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDisconnect(wallet.id)}
                className="text-gray-500 hover:text-red-400 active:text-red-500 hover:bg-red-500/10 w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* NFT Collection - Mobile Optimized */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <Badge className={`${chain.textColor} bg-white/5 text-[10px] sm:text-xs uppercase tracking-wider px-1.5 py-0.5`}>
            NFT Collection
          </Badge>

          {wallet.nfts.length > 4 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scroll('left')}
                className="w-7 h-7 sm:w-6 sm:h-6 p-0 hover:bg-white/10 active:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scroll('right')}
                className="w-7 h-7 sm:w-6 sm:h-6 p-0 hover:bg-white/10 active:bg-white/20"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Horizontal Scrolling NFT Grid - Touch scroll enabled */}
        {wallet.nfts.length > 0 ? (
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory touch-pan-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {wallet.nfts.map((nft, index) => (
              <NFTThumbnail
                key={nft.id}
                nft={nft}
                walletId={wallet.id}
                index={index}
                isPlaying={Boolean(isPlaying && currentTrackId === nft.id)}
                isCurrentTrack={currentTrackId === nft.id}
                onPlay={() => onPlayTrack?.(nft, wallet.id, index)}
                onClick={() => onTrackClick?.(nft.id)}
                chainColor={chain.textColor}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4 sm:py-6 text-gray-600 text-xs sm:text-sm">
            No NFTs found on {chain.name}
          </div>
        )}
      </div>
    </Card>
  )
}

// NFT Thumbnail Component
interface NFTThumbnailProps {
  nft: WalletNFT
  walletId: string
  index: number
  isPlaying: boolean
  isCurrentTrack: boolean
  onPlay: () => void
  onClick: () => void
  chainColor: string
}

function NFTThumbnail({
  nft,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onClick,
  chainColor,
}: NFTThumbnailProps) {
  const [imageError, setImageError] = useState(false)
  const [isTouched, setIsTouched] = useState(false)
  const defaultImage = '/default-pictures/album-artwork.png'
  const displayImage = imageError ? defaultImage : getIpfsUrl(nft.artworkUrl, defaultImage)

  // Mobile: Show overlay on touch, hide after delay
  const handleTouch = () => {
    setIsTouched(true)
    setTimeout(() => setIsTouched(false), 3000)
  }

  return (
    <div
      className={`relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 snap-start ${
        isCurrentTrack ? `ring-2 ${chainColor.replace('text-', 'ring-')} scale-105` : 'active:scale-95'
      }`}
      onTouchStart={handleTouch}
      onClick={onClick}
    >
      <img
        src={displayImage}
        alt={nft.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        loading="lazy"
      />

      {/* Play overlay - Always visible on mobile for touch, or when playing */}
      {(isTouched || isCurrentTrack) && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 active:from-cyan-400 active:to-purple-400 flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            {isPlaying && isCurrentTrack ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Playing indicator pulse */}
      {isPlaying && isCurrentTrack && (
        <div className="absolute bottom-0.5 left-0.5 right-0.5">
          <div className="h-1 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}

export default ConnectedWalletsPanel
