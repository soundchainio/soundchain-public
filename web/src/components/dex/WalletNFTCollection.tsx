import React, { useState, useRef } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, ExternalLink, Wallet } from 'lucide-react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { getIpfsUrl } from 'utils/ipfs'
import { config } from 'config'

interface NFTTrack {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  audioUrl?: string
  tokenId?: number | string
}

interface WalletNFTCollectionProps {
  walletAddress: string
  balance?: string
  currency?: string
  nfts: NFTTrack[]
  onPlayTrack?: (track: NFTTrack, index: number) => void
  onTrackClick?: (trackId: string) => void
  currentTrackId?: string
  isPlaying?: boolean
  chainName?: string
}

export function WalletNFTCollection({
  walletAddress,
  balance = '0',
  currency = 'MATIC',
  nfts,
  onPlayTrack,
  onTrackClick,
  currentTrackId,
  isPlaying,
  chainName = 'Polygon'
}: WalletNFTCollectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const formatAddress = (addr: string) => {
    if (!addr) return '---'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    const scrollAmount = 200
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <Card className="retro-card overflow-hidden">
      {/* Wallet Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 text-sm">{formatAddress(walletAddress)}</span>
                <a
                  href={`${config.polygonscan}address/${walletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-gray-500">{chainName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-bold">{parseFloat(balance).toLocaleString()} {currency}</p>
            <p className="text-xs text-cyan-400">{nfts.length} NFTs</p>
          </div>
        </div>
      </div>

      {/* NFT Collection Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
            NFT COLLECTION
          </Badge>
          {nfts.length > 6 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scroll('left')}
                className="w-6 h-6 p-0 hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scroll('right')}
                className="w-6 h-6 p-0 hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Horizontal Scrolling NFT Grid */}
        {nfts.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {nfts.map((nft, index) => (
              <NFTThumbnail
                key={nft.id}
                nft={nft}
                isHovered={hoveredId === nft.id}
                isPlaying={Boolean(isPlaying && currentTrackId === nft.id)}
                isCurrentTrack={currentTrackId === nft.id}
                onMouseEnter={() => setHoveredId(nft.id)}
                onMouseLeave={() => setHoveredId(null)}
                onPlay={() => onPlayTrack?.(nft, index)}
                onClick={() => onTrackClick?.(nft.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            No NFTs in this wallet
          </div>
        )}
      </div>
    </Card>
  )
}

interface NFTThumbnailProps {
  nft: NFTTrack
  isHovered: boolean
  isPlaying: boolean
  isCurrentTrack: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onPlay: () => void
  onClick: () => void
}

function NFTThumbnail({
  nft,
  isHovered,
  isPlaying = false,
  isCurrentTrack,
  onMouseEnter,
  onMouseLeave,
  onPlay,
  onClick
}: NFTThumbnailProps) {
  const [imageError, setImageError] = useState(false)
  const defaultImage = '/default-pictures/album-artwork.png'
  const displayImage = imageError ? defaultImage : getIpfsUrl(nft.artworkUrl, defaultImage)

  return (
    <div
      className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isCurrentTrack ? 'ring-2 ring-cyan-400 scale-105' : 'hover:scale-105'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <img
        src={displayImage}
        alt={nft.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />

      {/* Play overlay on hover or when playing */}
      {(isHovered || isCurrentTrack) && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
          >
            {isPlaying && isCurrentTrack ? (
              <Pause className="w-4 h-4 text-black" />
            ) : (
              <Play className="w-4 h-4 text-black ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Playing indicator pulse */}
      {isPlaying && isCurrentTrack && (
        <div className="absolute bottom-0.5 left-0.5 right-0.5">
          <div className="h-0.5 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}

// Larger grid variant for full page view
export function WalletNFTGrid({
  nfts,
  onPlayTrack,
  onTrackClick,
  currentTrackId,
  isPlaying
}: {
  nfts: NFTTrack[]
  onPlayTrack?: (track: NFTTrack, index: number) => void
  onTrackClick?: (trackId: string) => void
  currentTrackId?: string
  isPlaying?: boolean
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
      {nfts.map((nft, index) => (
        <NFTGridCard
          key={nft.id}
          nft={nft}
          isPlaying={Boolean(isPlaying && currentTrackId === nft.id)}
          isCurrentTrack={Boolean(currentTrackId === nft.id)}
          onPlay={() => onPlayTrack?.(nft, index)}
          onClick={() => onTrackClick?.(nft.id)}
        />
      ))}
    </div>
  )
}

function NFTGridCard({
  nft,
  isPlaying = false,
  isCurrentTrack = false,
  onPlay,
  onClick
}: {
  nft: NFTTrack
  isPlaying?: boolean
  isCurrentTrack?: boolean
  onPlay: () => void
  onClick: () => void
}) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const defaultImage = '/default-pictures/album-artwork.png'
  const displayImage = imageError ? defaultImage : getIpfsUrl(nft.artworkUrl, defaultImage)

  return (
    <div
      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group ${
        isCurrentTrack ? 'ring-2 ring-cyan-400' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={displayImage}
        alt={nft.title}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
        onError={() => setImageError(true)}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Play button overlay */}
      {(isHovered || isCurrentTrack) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-all shadow-lg"
          >
            {isPlaying && isCurrentTrack ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-black ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Title on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs font-medium truncate">{nft.title}</p>
        {nft.artist && (
          <p className="text-gray-400 text-[10px] truncate">{nft.artist}</p>
        )}
      </div>

      {/* Playing indicator */}
      {isPlaying && isCurrentTrack && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}

export default WalletNFTCollection
