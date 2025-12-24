'use client'

import { useState } from 'react'
import { Play, Pause, Heart, Share2, Clock, X, Trash2, ExternalLink, Music } from 'lucide-react'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { GetUserPlaylistsQuery, useDeletePlaylistItemMutation, useDeletePlaylistMutation, PlaylistTrackSourceType } from 'lib/graphql'
import Link from 'next/link'

type PlaylistType = GetUserPlaylistsQuery['getUserPlaylists']['nodes'][0]
type PlaylistTrackType = NonNullable<NonNullable<PlaylistType['tracks']>['nodes']>[0]

interface PlaylistDetailProps {
  playlist: PlaylistType
  onClose: () => void
  onDelete?: () => void
  isOwner?: boolean
  currentUserWallet?: string
}

export const PlaylistDetail = ({ playlist, onClose, onDelete, isOwner = false, currentUserWallet }: PlaylistDetailProps) => {
  const { playlistState, currentSong, isPlaying, togglePlay, isCurrentSong } = useAudioPlayerContext()
  const [deletePlaylistItem] = useDeletePlaylistItemMutation()
  const [deletePlaylist] = useDeletePlaylistMutation()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const tracks = playlist.tracks?.nodes || []

  // Build playable songs from playlist tracks
  const buildSongs = (): Song[] => {
    return tracks
      .filter(pt => pt.sourceType === PlaylistTrackSourceType.Nft && pt.trackId)
      .map(pt => ({
        trackId: pt.trackId!,
        src: '', // Will be fetched by audio player
        art: pt.artworkUrl || undefined,
        title: pt.title || 'Unknown',
        artist: pt.artist || 'Unknown Artist',
        isFavorite: false,
      }))
  }

  const handlePlayAll = () => {
    const songs = buildSongs()
    if (songs.length > 0) {
      playlistState(songs, 0)
    }
  }

  const handlePlayTrack = (index: number) => {
    // Find the index in filtered playable tracks
    const playableTracks = tracks.filter(pt => pt.sourceType === PlaylistTrackSourceType.Nft && pt.trackId)
    const playableIndex = playableTracks.findIndex(pt => pt.id === tracks[index].id)
    if (playableIndex >= 0) {
      const songs = buildSongs()
      playlistState(songs, playableIndex)
    }
  }

  const handleOpenExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleRemoveTrack = async (playlistItemId: string) => {
    try {
      await deletePlaylistItem({
        variables: { playlistItemId },
      })
    } catch (error) {
      console.error('Failed to remove track:', error)
    }
  }

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist({
        variables: { playlistId: playlist.id },
      })
      onDelete?.()
      onClose()
    } catch (error) {
      console.error('Failed to delete playlist:', error)
    }
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get source type label
  const getSourceLabel = (sourceType: PlaylistTrackSourceType) => {
    switch (sourceType) {
      case PlaylistTrackSourceType.Nft: return 'NFT'
      case PlaylistTrackSourceType.Youtube: return 'YouTube'
      case PlaylistTrackSourceType.Spotify: return 'Spotify'
      case PlaylistTrackSourceType.Soundcloud: return 'SoundCloud'
      case PlaylistTrackSourceType.Bandcamp: return 'Bandcamp'
      case PlaylistTrackSourceType.AppleMusic: return 'Apple Music'
      case PlaylistTrackSourceType.Tidal: return 'Tidal'
      case PlaylistTrackSourceType.Vimeo: return 'Vimeo'
      case PlaylistTrackSourceType.Upload: return 'Upload'
      default: return 'External'
    }
  }

  // Get first 4 artworks for mosaic
  const firstFourArtworks = tracks.slice(0, 4).map(t => t.artworkUrl)

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
              {isOwner && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              )}
            </div>
          </div>

          {/* Right - Track List */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-neutral-900/90 backdrop-blur px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center text-xs text-gray-500 uppercase tracking-wider">
                <span className="w-8 text-center">#</span>
                <span className="flex-1 ml-4">Title</span>
                <span className="w-24 text-right hidden sm:block">Source</span>
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
                  const isNft = pt.sourceType === PlaylistTrackSourceType.Nft
                  const isCurrentTrack = isNft && pt.trackId ? isCurrentSong(pt.trackId) : false
                  const isTrackPlaying = isCurrentTrack && isPlaying
                  const hasExternalUrl = pt.externalUrl || pt.uploadedFileUrl

                  const handleClick = () => {
                    if (isNft && pt.trackId) {
                      if (isCurrentTrack) {
                        togglePlay()
                      } else {
                        handlePlayTrack(index)
                      }
                    } else if (hasExternalUrl) {
                      handleOpenExternal(pt.externalUrl || pt.uploadedFileUrl!)
                    }
                  }

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
                        onClick={handleClick}
                      >
                        {isTrackPlaying ? (
                          <Pause className="w-4 h-4 text-pink-400 mx-auto" />
                        ) : isCurrentTrack ? (
                          <Play className="w-4 h-4 text-pink-400 mx-auto" fill="currentColor" />
                        ) : hasExternalUrl ? (
                          <>
                            <span className="text-gray-500 group-hover:hidden">{index + 1}</span>
                            <ExternalLink className="w-4 h-4 text-cyan-400 mx-auto hidden group-hover:block" />
                          </>
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
                        onClick={handleClick}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          {pt.artworkUrl ? (
                            <img src={pt.artworkUrl} alt={pt.title || 'Track'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                              <Music className="w-4 h-4 text-neutral-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isCurrentTrack ? 'text-pink-400' : 'text-white'}`}>
                            {pt.title || 'Unknown Track'}
                          </p>
                          <p className="text-gray-500 text-sm truncate">{pt.artist || 'Unknown Artist'}</p>
                        </div>
                      </div>

                      {/* Source Type */}
                      <div className="w-24 text-right hidden sm:block">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isNft ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {getSourceLabel(pt.sourceType)}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="w-16 text-right text-gray-500 text-sm">
                        {formatDuration(pt.duration)}
                      </div>

                      {/* Remove button (owner only) */}
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTrack(pt.id)
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

            {/* Delete Playlist Confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
                <div className="bg-neutral-800 rounded-xl p-6 max-w-sm w-full mx-4">
                  <h3 className="text-lg font-bold text-white mb-2">Delete Playlist?</h3>
                  <p className="text-gray-400 mb-4">This action cannot be undone. All tracks will be removed from this playlist.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-4 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeletePlaylist}
                      className="flex-1 py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
