import React, { memo, useState } from 'react'
import Link from 'next/link'
import { Play, Pause, ChevronRight } from 'lucide-react'

interface CoinbaseNFTCardProps {
  track: {
    id: string
    title: string
    artist: string
    artistProfileId?: string
    artworkUrl?: string
    playbackCount?: number
    playbackCountFormatted?: string
    nftData?: {
      tokenId?: string
      owner?: string
    }
    listingItem?: {
      price?: number
      pricePerItem?: number
      pricePerItemToShow?: number
      acceptsOGUN?: boolean
    }
  }
  onPlay: () => void
  isPlaying: boolean
  isCurrentTrack: boolean
  onTrackClick?: (trackId: string) => void
}

const CoinbaseNFTCardComponent: React.FC<CoinbaseNFTCardProps> = ({
  track,
  onPlay,
  isPlaying,
  isCurrentTrack,
  onTrackClick
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const defaultImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop'

  const hasListing = track.listingItem?.price || track.listingItem?.pricePerItem || track.listingItem?.pricePerItemToShow
  const price = track.listingItem?.pricePerItemToShow || track.listingItem?.pricePerItem || track.listingItem?.price || 0
  const currency = track.listingItem?.acceptsOGUN ? 'OGUN' : 'MATIC'

  return (
    <div
      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer rounded-xl group"
      onClick={() => onTrackClick?.(track.id)}
    >
      {/* Left: Artwork + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Circular artwork with play overlay */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-neutral-800">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-neutral-700 animate-pulse rounded-full" />
            )}
            <img
              src={track.artworkUrl || defaultImage}
              alt={track.title}
              className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
          {/* Play button overlay on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/60 transition-opacity ${
              isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isPlaying && isCurrentTrack ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
          {/* Playing indicator ring */}
          {isCurrentTrack && isPlaying && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse" />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium text-sm truncate">
              {track.title}
            </h3>
          </div>
          <p className="text-neutral-400 text-xs truncate">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Right: Value/Stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {hasListing ? (
          <div className="text-right">
            <p className="text-white font-medium text-sm">
              {price} {currency}
            </p>
            <p className="text-green-400 text-xs">Listed</p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-white font-medium text-sm">
              #{track.nftData?.tokenId || '---'}
            </p>
            <p className="text-neutral-500 text-xs">
              {track.playbackCountFormatted || '0'} plays
            </p>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
      </div>
    </div>
  )
}

export const CoinbaseNFTCard = memo(CoinbaseNFTCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isCurrentTrack === nextProps.isCurrentTrack &&
    prevProps.track.listingItem?.price === nextProps.track.listingItem?.price
  )
})

// Grid variant for collection view
export const CoinbaseNFTGridCard: React.FC<CoinbaseNFTCardProps> = ({
  track,
  onPlay,
  isPlaying,
  isCurrentTrack,
  onTrackClick
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const defaultImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop'

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onTrackClick?.(track.id)}
    >
      {/* Square artwork */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-800 mb-2">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-700 animate-pulse" />
        )}
        <img
          src={track.artworkUrl || defaultImage}
          alt={track.title}
          className={`w-full h-full object-cover transition-all duration-200 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
        {/* Play button overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onPlay() }}
          className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
            isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            {isPlaying && isCurrentTrack ? (
              <Pause className="w-6 h-6 text-black" />
            ) : (
              <Play className="w-6 h-6 text-black ml-0.5" />
            )}
          </div>
        </button>
        {/* Playing indicator */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-white font-medium">Playing</span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-white font-medium text-sm truncate">
        {track.title}
      </h3>
      <p className="text-neutral-500 text-xs truncate">
        {track.artist}
      </p>
    </div>
  )
}

export default CoinbaseNFTCard
