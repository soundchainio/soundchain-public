import React, { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Play, Pause, Heart, RotateCcw, X, Maximize2, Share2, ShoppingCart, ExternalLink, Music2 } from 'lucide-react'
import { config } from 'config'
import { getIpfsUrl } from 'utils/ipfs'

interface TrackNFTCardProps {
  track: {
    id: string
    title: string
    artist: string
    artistId?: string
    artistProfileId?: string
    artworkUrl?: string
    playbackCount?: number
    playbackCountFormatted?: string
    favoriteCount?: number
    duration?: number
    genres?: string[]
    nftData?: {
      tokenId?: string
      transactionHash?: string
      minter?: string
      owner?: string
      contractAddress?: string
    }
    listingItem?: {
      price?: number
      pricePerItem?: number
      pricePerItemToShow?: number
      acceptsOGUN?: boolean
    }
    isFavorite?: boolean
    releaseDate?: string
    description?: string
    bpm?: number
    key?: string
  }
  onPlay: () => void
  isPlaying: boolean
  isCurrentTrack: boolean
  onFavorite?: () => void
  listView?: boolean
  onArtistClick?: (artistId: string) => void
  onTrackClick?: (trackId: string) => void
}

const TrackNFTCardComponent: React.FC<TrackNFTCardProps> = ({
  track,
  onPlay,
  isPlaying,
  isCurrentTrack,
  onFavorite,
  listView = false,
  onArtistClick,
  onTrackClick
}) => {
  const router = useRouter()
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formatNumber = (num: number) => {
    if (num < 1000) return num.toString()
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getRarityFromPlays = (plays: number = 0) => {
    if (plays > 1000) return { label: 'legendary', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
    if (plays > 100) return { label: 'epic', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
    if (plays > 10) return { label: 'rare', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
    return { label: 'common', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
  }

  const rarity = getRarityFromPlays(track.playbackCount)
  const hasListing = track.listingItem?.price || track.listingItem?.pricePerItem || track.listingItem?.pricePerItemToShow
  const price = track.listingItem?.pricePerItemToShow || track.listingItem?.pricePerItem || track.listingItem?.price || 0
  const currency = track.listingItem?.acceptsOGUN ? 'OGUN' : 'MATIC'
  const defaultImage = '/default-pictures/album-artwork.png'

  // Transform IPFS URLs and handle fallbacks
  const displayImage = imageError ? defaultImage : getIpfsUrl(track.artworkUrl, defaultImage)

  // Share track function - MUST be defined before any early returns to avoid hooks order issues
  const handleShare = useCallback(async () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/tracks/${track.id}`
    const shareData = {
      title: `${track.title} by ${track.artist}`,
      text: `Listen to "${track.title}" by ${track.artist} on SoundChain`,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      }
    } catch (err) {
      // User cancelled or error
      console.log('Share cancelled or failed')
    }
  }, [track.id, track.title, track.artist])

  // List view - simple row
  if (listView) {
    return (
      <Card className="retro-card transition-all duration-200 hover:border-cyan-400/50">
        <div className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative group">
                <img src={displayImage} alt={track.title} className="w-full h-full object-cover" onError={() => setImageError(true)} />
                <Button
                  onClick={(e) => { e.stopPropagation(); onPlay() }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isPlaying && isCurrentTrack ? <Pause className="w-6 h-6 text-cyan-400" /> : <Play className="w-6 h-6 text-cyan-400" />}
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white truncate">{track.title}</h3>
                  <Badge className={rarity.color}>{rarity.label}</Badge>
                </div>
                <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                <div className="text-xs text-cyan-400">{track.playbackCountFormatted || '0'} plays</div>
              </div>
            </div>
            {hasListing && (
              <div className="text-right">
                <div className="retro-text text-white">{price} {currency}</div>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onFavorite?.() }}>
              <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Fullscreen modal - render in portal for proper z-index
  if (isFullscreen) {
    return (
      <>
        {/* Backdrop - click to close */}
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        />
        {/* Modal content */}
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 pointer-events-none">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto">
            {/* Close button */}
            <Button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-2 right-2 md:top-4 md:right-4 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-2"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </Button>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 bg-gray-900/95 rounded-2xl p-4 md:p-6 border border-cyan-500/30 max-h-[85vh] overflow-y-auto">
              {/* Large artwork */}
              <div className="relative w-full md:w-1/2 aspect-square rounded-xl overflow-hidden flex-shrink-0">
                {/* Fallback placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-purple-900/20 flex items-center justify-center">
                  <Music2 className="w-16 h-16 text-cyan-500/30" />
                </div>
                <img
                  src={displayImage}
                  alt={track.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                  <Button
                    onClick={(e) => { e.stopPropagation(); onPlay() }}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 flex items-center justify-center"
                  >
                    {isPlaying && isCurrentTrack ? <Pause className="w-8 h-8 md:w-10 md:h-10 text-black" /> : <Play className="w-8 h-8 md:w-10 md:h-10 text-black ml-1" />}
                  </Button>
                </div>
                <Badge className={`${rarity.color} absolute top-3 right-3`}>{rarity.label}</Badge>
              </div>

              {/* Details panel - scrollable */}
              <div className="w-full md:w-1/2 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {/* Title & Artist */}
                  <div>
                    <Link href={`/tracks/${track.id}`} onClick={() => setIsFullscreen(false)}>
                      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 hover:text-cyan-400 transition-colors cursor-pointer">{track.title}</h1>
                    </Link>
                    {track.artist ? (
                      <Link href={`/dex/users/${track.artist}`} onClick={() => setIsFullscreen(false)}>
                        <p className="text-base md:text-lg text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">{track.artist}</p>
                      </Link>
                    ) : (
                      <p className="text-base md:text-lg text-cyan-400">Unknown Artist</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <div className="bg-gray-800/60 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-lg md:text-xl font-bold text-white">{formatNumber(track.playbackCount || 0)}</div>
                      <div className="text-[10px] md:text-xs text-gray-400">Plays</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-lg md:text-xl font-bold text-white">{track.favoriteCount || 0}</div>
                      <div className="text-[10px] md:text-xs text-gray-400">Favorites</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-lg md:text-xl font-bold text-white">{formatDuration(track.duration)}</div>
                      <div className="text-[10px] md:text-xs text-gray-400">Duration</div>
                    </div>
                  </div>

                  {/* Description */}
                  {track.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-1">Description</h3>
                      <p className="text-sm text-gray-300">{track.description}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-400">Track Info</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(track.genres?.length ?? 0) > 0 && (
                        <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                          <span className="text-gray-500">Genre</span>
                          <span className="text-cyan-400">{track.genres?.[0]}</span>
                        </div>
                      )}
                      {track.bpm && (
                        <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                          <span className="text-gray-500">BPM</span>
                          <span className="text-cyan-400">{track.bpm}</span>
                        </div>
                      )}
                      {track.key && (
                        <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                          <span className="text-gray-500">Key</span>
                          <span className="text-cyan-400">{track.key}</span>
                        </div>
                      )}
                      {track.releaseDate && (
                        <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                          <span className="text-gray-500">Released</span>
                          <span className="text-cyan-400">{new Date(track.releaseDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NFT Data */}
                  {track.nftData && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-400">NFT Info</h3>
                      <div className="space-y-1 text-sm">
                        {track.nftData.tokenId && (
                          <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                            <span className="text-gray-500">Token ID</span>
                            {track.nftData.transactionHash ? (
                              <a
                                href={`${config.polygonscan}tx/${track.nftData.transactionHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 font-mono hover:text-cyan-300 flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {track.nftData.tokenId}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-cyan-400 font-mono">{track.nftData.tokenId}</span>
                            )}
                          </div>
                        )}
                        {track.nftData.contractAddress && (
                          <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                            <span className="text-gray-500">Contract</span>
                            <a
                              href={`${config.polygonscan}address/${track.nftData.contractAddress}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 font-mono text-xs hover:text-cyan-300 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {track.nftData.contractAddress.slice(0, 8)}...{track.nftData.contractAddress.slice(-6)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between bg-gray-800/40 rounded px-2 py-1">
                          <span className="text-gray-500">Chain</span>
                          <span className="text-cyan-400">Polygon</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons - always visible at bottom */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
                  <Button onClick={(e) => { e.stopPropagation(); onPlay() }} className="flex-1 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-black font-bold">
                    {isPlaying && isCurrentTrack ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Play</>}
                  </Button>
                  <Link href={`/tracks/${track.id}`} onClick={() => setIsFullscreen(false)}>
                    <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/10 active:bg-purple-500/20 text-purple-400">
                      <ExternalLink className="w-4 h-4 mr-2" /> Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onFavorite?.() }}
                    className="border-gray-600 hover:bg-gray-800 active:bg-red-500/20"
                  >
                    <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleShare() }}
                    className="border-gray-600 hover:bg-gray-800 active:bg-cyan-500/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {hasListing && (
                    <Button
                      className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-black font-bold"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/tracks/${track.id}/buy-now${currency === 'OGUN' ? '?isPaymentOGUN=true' : ''}`)
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" /> {price} {currency}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Compact card with flip
  return (
    <div className="track-nft-card-container cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`nft-flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front Side - High-res polished card */}
        <div className="nft-flip-card-front">
          <Card className={`retro-card transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-xl hover:shadow-cyan-500/20 h-full border border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl overflow-hidden backdrop-blur-sm ${isCurrentTrack ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30' : ''}`}
            style={{ willChange: 'transform' }}>
            <div className="flip-hint"><RotateCcw className="w-2.5 h-2.5" /></div>

            {/* Album art - square aspect ratio with enhanced rendering */}
            <div className="aspect-square bg-gray-800 overflow-hidden relative group">
              {/* Skeleton placeholder with shimmer */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
              )}
              <img
                src={displayImage}
                alt={track.title}
                className={`w-full h-full object-cover transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                style={{ imageRendering: 'auto', WebkitBackfaceVisibility: 'hidden' }}
              />

              {/* Play overlay - polished with glow */}
              <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-all duration-300 ${isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <Button
                  onClick={(e) => { e.stopPropagation(); onPlay() }}
                  className="w-11 h-11 rounded-full bg-cyan-500 hover:bg-cyan-400 hover:scale-110 flex items-center justify-center p-0 shadow-lg shadow-cyan-500/50 transition-all duration-200"
                >
                  {isPlaying && isCurrentTrack ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
                </Button>
              </div>

              {/* Badges - polished with backdrop blur */}
              <Badge className={`${rarity.color} absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 uppercase font-bold tracking-wide backdrop-blur-sm shadow-sm`}>{rarity.label}</Badge>

              {hasListing && (
                <Badge className="bg-green-500/90 text-white absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0.5 uppercase font-bold tracking-wide backdrop-blur-sm shadow-sm">
                  FOR SALE
                </Badge>
              )}

              {/* Fullscreen button */}
              <Button
                onClick={(e) => { e.stopPropagation(); setIsFullscreen(true) }}
                className="absolute bottom-1.5 right-1.5 w-6 h-6 p-0 bg-black/60 hover:bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>

            {/* Compact info section - polished */}
            <div className="p-2.5 space-y-1 bg-gradient-to-t from-black/40 to-transparent">
              <h3 className="text-white text-xs font-semibold truncate leading-tight drop-shadow-sm">{track.title}</h3>
              <p className="text-gray-400 text-[10px] truncate font-medium">{track.artist}</p>
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-cyan-400 font-medium tabular-nums">{track.playbackCountFormatted || '0'} plays</span>
                  {(track.favoriteCount ?? 0) > 0 && (
                    <span className="text-[9px] text-red-400 flex items-center gap-0.5 font-medium">
                      <Heart className="w-2.5 h-2.5 fill-current" /> {track.favoriteCount}
                    </span>
                  )}
                </div>
                {hasListing ? (
                  <div className="text-[10px] font-bold text-green-400 drop-shadow-sm">{price} {currency}</div>
                ) : (
                  <Button
                    onClick={(e) => { e.stopPropagation(); onFavorite?.() }}
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-red-500/20 transition-colors"
                  >
                    <Heart className={`w-3 h-3 transition-all ${track.isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400'}`} />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Back Side - Scrollable details */}
        <div className="nft-flip-card-back">
          <div className="p-2 h-full flex flex-col text-white">
            <div className="flip-hint"><RotateCcw className="w-2.5 h-2.5" /></div>
            <div className="retro-title text-center mb-1 text-[10px]">TRACK DETAILS</div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto space-y-1.5 text-[9px] custom-scrollbar-mini pr-1">
              {/* Stats */}
              <div className="metadata-section-compact">
                <div className="flex justify-between"><span className="text-gray-500">PLAYS:</span><span className="text-cyan-400">{formatNumber(track.playbackCount || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">FAVORITES:</span><span className="text-cyan-400">{track.favoriteCount || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">DURATION:</span><span className="text-cyan-400">{formatDuration(track.duration)}</span></div>
              </div>

              {/* Genre & Music Info */}
              <div className="metadata-section-compact">
                {track.genres?.[0] && <div className="flex justify-between"><span className="text-gray-500">GENRE:</span><span className="text-cyan-400">{track.genres[0]}</span></div>}
                {track.bpm && <div className="flex justify-between"><span className="text-gray-500">BPM:</span><span className="text-cyan-400">{track.bpm}</span></div>}
                {track.key && <div className="flex justify-between"><span className="text-gray-500">KEY:</span><span className="text-cyan-400">{track.key}</span></div>}
              </div>

              {/* NFT Data */}
              {track.nftData?.tokenId && (
                <div className="metadata-section-compact">
                  <div className="flex justify-between"><span className="text-gray-500">TOKEN:</span><span className="text-cyan-400">{track.nftData.tokenId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">CHAIN:</span><span className="text-cyan-400">Polygon</span></div>
                </div>
              )}

              {/* Listing */}
              {hasListing && (
                <div className="metadata-section-compact bg-green-500/10 rounded">
                  <div className="flex justify-between"><span className="text-gray-500">PRICE:</span><span className="text-green-400 font-bold">{price} {currency}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">STATUS:</span><span className="text-green-400">FOR SALE</span></div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 mt-1">
              <Button
                onClick={(e) => { e.stopPropagation(); onPlay() }}
                size="sm"
                className="flex-1 h-6 text-[9px] bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
              >
                {isPlaying && isCurrentTrack ? 'PAUSE' : 'PLAY'}
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); setIsFullscreen(true) }}
                size="sm"
                className="h-6 px-2 text-[9px] bg-gray-700 hover:bg-gray-600"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders of cards that haven't changed
export const TrackNFTCard = memo(TrackNFTCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.artworkUrl === nextProps.track.artworkUrl &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isCurrentTrack === nextProps.isCurrentTrack &&
    prevProps.listView === nextProps.listView &&
    prevProps.track.isFavorite === nextProps.track.isFavorite &&
    prevProps.track.listingItem?.price === nextProps.track.listingItem?.price
  )
})
