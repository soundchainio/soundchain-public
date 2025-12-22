'use client'

import { useState } from 'react'
import { Play, Pause, Heart, Share2, Clock, X, Trash2, ShoppingCart } from 'lucide-react'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { GetUserPlaylistsQuery, useDeletePlaylistTracksMutation, CurrencyType } from 'lib/graphql'
import Link from 'next/link'

type PlaylistType = GetUserPlaylistsQuery['getUserPlaylists']['nodes'][0]
type PlaylistTrackType = NonNullable<NonNullable<PlaylistType['tracks']>['nodes']>[0]

interface PlaylistDetailProps {
  playlist: PlaylistType
  onClose: () => void
  isOwner?: boolean
  currentUserWallet?: string
}

export const PlaylistDetail = ({ playlist, onClose, isOwner = false, currentUserWallet }: PlaylistDetailProps) => {
  const { playlistState, currentSong, isPlaying, togglePlay, isCurrentSong } = useAudioPlayerContext()
  const [deleteTrack] = useDeletePlaylistTracksMutation()

  const tracks = playlist.tracks?.nodes || []

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      const songs: Song[] = tracks.map(pt => ({
        trackId: pt.track.id,
        src: pt.track.playbackUrl,
        art: pt.track.artworkUrl || undefined,
        title: pt.track.title,
        artist: pt.track.artist,
        isFavorite: pt.track.isFavorite,
      }))
      playlistState(songs, 0)
    }
  }

  const handlePlayTrack = (index: number) => {
    const songs: Song[] = tracks.map(pt => ({
      trackId: pt.track.id,
      src: pt.track.playbackUrl,
      art: pt.track.artworkUrl || undefined,
      title: pt.track.title,
      artist: pt.track.artist,
      isFavorite: pt.track.isFavorite,
    }))
    playlistState(songs, index)
  }

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await deleteTrack({
        variables: {
          input: {
            playlistId: playlist.id,
            trackIds: [trackId],
          },
        },
      })
    } catch (error) {
      console.error('Failed to remove track:', error)
    }
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPrice = (price: number | null | undefined, currency: CurrencyType = CurrencyType.Matic) => {
    if (!price) return '0'
    return price.toFixed(2)
  }

  // Determine button state for a track
  const getTrackButton = (track: PlaylistTrackType['track']) => {
    const isOwnerOfNft = track.nftData?.owner?.toLowerCase() === currentUserWallet?.toLowerCase()
    const hasListing = track.listingCount > 0 && track.listingItem
    const price = track.listingItem?.pricePerItemToShow || track.price?.value || 0
    const currency = track.price?.currency || CurrencyType.Matic

    if (hasListing && !isOwnerOfNft) {
      // Can buy
      return {
        type: 'buy' as const,
        label: 'BUY NOW',
        price: formatPrice(price),
        currency: currency === CurrencyType.Matic ? 'M' : 'OGUN',
        className: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/10',
      }
    } else if (hasListing && isOwnerOfNft) {
      // Owner can edit listing
      return {
        type: 'edit' as const,
        label: 'EDIT',
        price: formatPrice(price),
        currency: currency === CurrencyType.Matic ? 'M' : 'OGUN',
        className: 'border-yellow-500 text-yellow-400 hover:bg-yellow-500/10',
      }
    } else if (isOwnerOfNft && !hasListing) {
      // Owner can list
      return {
        type: 'list' as const,
        label: 'LIST',
        price: null,
        currency: null,
        className: 'border-purple-500 text-purple-400 hover:bg-purple-500/10',
      }
    } else if (track.saleType === 'auction') {
      return {
        type: 'auction' as const,
        label: 'AUCTION',
        price: formatPrice(price),
        currency: currency === CurrencyType.Matic ? 'M' : 'OGUN',
        className: 'border-pink-500 text-pink-400 hover:bg-pink-500/10',
      }
    }
    // Not listed
    return {
      type: 'notlisted' as const,
      label: 'NOT LISTED',
      price: null,
      currency: null,
      className: 'border-gray-600 text-gray-500',
    }
  }

  // Get first 4 artworks for mosaic
  const firstFourArtworks = tracks.slice(0, 4).map(t => t.track.artworkUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border border-pink-500/20 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-neutral-800/80 backdrop-blur flex items-center justify-center hover:bg-neutral-700 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Left - Playlist Info */}
          <div className="w-full md:w-80 p-6 flex-shrink-0 bg-gradient-to-b from-pink-500/10 to-transparent">
            {/* Artwork */}
            <div className="aspect-square rounded-xl overflow-hidden shadow-2xl mb-6">
              {playlist.artworkUrl ? (
                <img src={playlist.artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
              ) : firstFourArtworks.length >= 4 ? (
                <div className="grid grid-cols-2 gap-0.5 w-full h-full bg-neutral-800">
                  {firstFourArtworks.map((url, i) => (
                    <div key={i} className="bg-neutral-700">
                      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center">
                  <span className="text-6xl">🎵</span>
                </div>
              )}
            </div>

            {/* Info */}
            <h1 className="text-2xl font-bold text-white mb-2">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-gray-400 text-sm mb-4">{playlist.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
              <span>{tracks.length} tracks</span>
              <span>•</span>
              <span>{playlist.favoriteCount} likes</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayAll}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:opacity-90 transition-opacity"
              >
                <Play className="w-5 h-5" fill="white" />
                Play All
              </button>
              <button className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors">
                <Heart className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors">
                <Share2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Right - Track List */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-neutral-900/90 backdrop-blur px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center text-xs text-gray-500 uppercase tracking-wider">
                <span className="w-8 text-center">#</span>
                <span className="flex-1 ml-4">Title</span>
                <span className="w-28 text-right hidden sm:block">Plays / Likes</span>
                <span className="w-36 text-right hidden md:block">Price</span>
                <span className="w-16 text-right">
                  <Clock className="w-4 h-4 inline" />
                </span>
                {isOwner && <span className="w-10" />}
              </div>
            </div>

            {/* Tracks */}
            <div className="p-2">
              {tracks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">No tracks yet</p>
                  <p className="text-sm">Add tracks to your playlist to get started</p>
                </div>
              ) : (
                tracks.map((pt, index) => {
                  const isCurrentTrack = isCurrentSong(pt.track.id)
                  const isTrackPlaying = isCurrentTrack && isPlaying
                  const buttonState = getTrackButton(pt.track)

                  return (
                    <div
                      key={pt.id}
                      className={`group flex items-center px-4 py-3 rounded-lg hover:bg-neutral-800/50 transition-colors ${
                        isCurrentTrack ? 'bg-pink-500/10' : ''
                      }`}
                    >
                      {/* Number / Play indicator */}
                      <div
                        className="w-8 text-center cursor-pointer"
                        onClick={() => isCurrentTrack ? togglePlay() : handlePlayTrack(index)}
                      >
                        {isTrackPlaying ? (
                          <Pause className="w-4 h-4 text-pink-400 mx-auto" />
                        ) : isCurrentTrack ? (
                          <Play className="w-4 h-4 text-pink-400 mx-auto" fill="currentColor" />
                        ) : (
                          <>
                            <span className="text-gray-500 group-hover:hidden">{index + 1}</span>
                            <Play className="w-4 h-4 text-white mx-auto hidden group-hover:block" fill="white" />
                          </>
                        )}
                      </div>

                      {/* Track info */}
                      <div
                        className="flex items-center gap-3 flex-1 ml-4 min-w-0 cursor-pointer"
                        onClick={() => isCurrentTrack ? togglePlay() : handlePlayTrack(index)}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          {pt.track.artworkUrl ? (
                            <img src={pt.track.artworkUrl} alt={pt.track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                              <span className="text-xs">🎵</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isCurrentTrack ? 'text-pink-400' : 'text-white'}`}>
                            {pt.track.title}
                          </p>
                          <p className="text-gray-500 text-sm truncate">{pt.track.artist}</p>
                        </div>
                      </div>

                      {/* Plays / Likes */}
                      <div className="w-28 text-right text-gray-500 text-xs hidden sm:flex flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {pt.track.playbackCountFormatted || '0'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {pt.track.favoriteCount || 0}
                        </span>
                      </div>

                      {/* Price / Action Button */}
                      <div className="w-36 text-right hidden md:block">
                        <Link
                          href={`/dex/track/${pt.track.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${buttonState.className}`}
                        >
                          {buttonState.price && (
                            <span className="flex items-center gap-1">
                              {buttonState.price}
                              <span className="text-[10px] opacity-70">{buttonState.currency}</span>
                            </span>
                          )}
                          <span>{buttonState.label}</span>
                        </Link>
                      </div>

                      {/* Duration */}
                      <div className="w-16 text-right text-gray-500 text-sm">
                        {formatDuration(pt.track.duration)}
                      </div>

                      {/* Remove button (owner only) */}
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTrack(pt.trackId)
                          }}
                          className="w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
