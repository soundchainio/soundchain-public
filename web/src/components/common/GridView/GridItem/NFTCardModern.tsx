import React, { useState, memo } from 'react'
import Link from 'next/link'
import { Play, Pause, Heart } from 'lucide-react'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Track, TrackWithListingItem, ListingItemWithPrice, Maybe, useMaticUsdQuery } from 'lib/graphql'
import { currency, limitTextToNumberOfCharacters } from 'utils/format'
import Asset from '../../../Asset/Asset'
import { Logo } from 'icons/Logo'

interface NFTCardModernProps {
  track: TrackWithListingItem | Track
  handleOnPlayClicked?: () => void
  showPrice?: boolean
}

interface ExtendedListingItem extends ListingItemWithPrice {
  chainId?: number
  tokenSymbol?: string
}

const chainBadges: { [key: number]: { name: string; color: string } } = {
  1: { name: 'ETH', color: 'bg-blue-500/20 text-blue-400' },
  137: { name: 'POL', color: 'bg-purple-500/20 text-purple-400' },
  8453: { name: 'BASE', color: 'bg-blue-600/20 text-blue-300' },
  42161: { name: 'ARB', color: 'bg-cyan-500/20 text-cyan-400' },
  7000: { name: 'ZETA', color: 'bg-green-500/20 text-green-400' },
}

const NFTCardModernComponent: React.FC<NFTCardModernProps> = ({
  track,
  handleOnPlayClicked,
  showPrice = true,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const { isCurrentlyPlaying, preloadTrack } = useAudioPlayerContext()
  const { data: maticUsd } = useMaticUsdQuery()

  const isPlaying = isCurrentlyPlaying(track.id)

  let listingItem: Maybe<ExtendedListingItem> = null
  if (track.__typename === 'TrackWithListingItem' && track.listingItem) {
    listingItem = track.listingItem as ExtendedListingItem
  }

  const price = listingItem?.priceToShow ?? Number(track.price?.value) ?? 0
  const currency_symbol = (listingItem?.tokenSymbol as string) || 'POL'
  const chainId = listingItem?.chainId || 137
  const chainBadge = chainBadges[chainId] || chainBadges[137]

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (track.playbackUrl) {
      preloadTrack(track.playbackUrl, track.artworkUrl)
    }
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (handleOnPlayClicked) handleOnPlayClicked()
  }

  const formatPrice = (val: number) => {
    if (val < 0.001) return '< 0.001'
    if (val < 1) return val.toFixed(4)
    if (val < 1000) return val.toFixed(2)
    return `${(val / 1000).toFixed(1)}K`
  }

  return (
    <Link href={`/tracks/${track.id}`} passHref>
      <div
        className="nft-card-modern group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-800">
          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse" />
          )}

          {/* Artwork */}
          <div className={`w-full h-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Asset
              src={track.artworkUrl}
              onLoad={() => setImageLoaded(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          {/* Hover Overlay */}
          <div
            className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={handlePlay}
              className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center transition-transform hover:scale-110"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-black" fill="black" />
              ) : (
                <Play className="w-6 h-6 text-black ml-1" fill="black" />
              )}
            </button>
          </div>

          {/* Chain Badge */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-semibold ${chainBadge.color}`}>
            {chainBadge.name}
          </div>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className={`absolute top-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur-sm transition-all ${
              isHovered ? 'opacity-100' : 'opacity-0'
            } hover:bg-black/70`}
          >
            <Heart
              className={`w-4 h-4 ${track.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Title & Artist */}
          <h3 className="text-white text-sm font-semibold truncate mb-0.5">
            {limitTextToNumberOfCharacters(track.title || 'Untitled', 24)}
          </h3>
          <p className="text-gray-400 text-xs truncate mb-3">
            {track.artist || 'Unknown Artist'}
          </p>

          {/* Price Section */}
          {showPrice && price > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  {currency_symbol === 'OGUN' ? (
                    <Logo className="w-4 h-4" />
                  ) : (
                    <span className="text-purple-400 text-xs">🟣</span>
                  )}
                  <span className="text-white font-bold text-sm">{formatPrice(price)}</span>
                  <span className="text-gray-400 text-xs">{currency_symbol}</span>
                </div>
                {currency_symbol === 'POL' && maticUsd?.maticUsd && price > 0 && (
                  <p className="text-gray-500 text-[10px]">
                    ≈ ${currency(price * parseFloat(maticUsd.maticUsd))}
                  </p>
                )}
              </div>

              {/* Quick Buy Button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition-colors"
              >
                Buy
              </button>
            </div>
          )}

          {/* Stats Row (when no price) */}
          {(!showPrice || price === 0) && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                {track.playbackCountFormatted || '0'}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {track.favoriteCount || 0}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// Memoize to prevent unnecessary re-renders
export const NFTCardModern = memo(NFTCardModernComponent, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.isFavorite === nextProps.track.isFavorite &&
    prevProps.showPrice === nextProps.showPrice
  )
})

export default NFTCardModern
