'use client'

import { useState, useCallback } from 'react'
import { X, Music, ImagePlus, Loader2, Plus, Trash2, Search } from 'lucide-react'
import { useCreatePlaylistMutation, useTracksQuery, SortTrackField, SortOrder } from 'lib/graphql'
import Asset from 'components/Asset/Asset'

interface Track {
  id: string
  title: string | null
  artist: string | null
  artworkUrl: string | null
}

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (playlistId: string) => void
}

type ModalTab = 'post' | 'playlist' | 'mint'

export const CreatePlaylistModal = ({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('playlist')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([])
  const [showTrackSearch, setShowTrackSearch] = useState(false)
  const [trackSearchQuery, setTrackSearchQuery] = useState('')

  const [createPlaylist] = useCreatePlaylistMutation()

  // Search for tracks to add
  const { data: tracksData, loading: tracksLoading } = useTracksQuery({
    variables: {
      page: { first: 10 },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      search: trackSearchQuery || undefined,
    },
    skip: !showTrackSearch,
  })

  const handleAddTrack = useCallback((track: Track) => {
    if (!selectedTracks.find(t => t.id === track.id)) {
      setSelectedTracks(prev => [...prev, track])
    }
    setShowTrackSearch(false)
    setTrackSearchQuery('')
  }, [selectedTracks])

  const handleRemoveTrack = useCallback((trackId: string) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Please enter a playlist name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createPlaylist({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim() || null,
          },
        },
        errorPolicy: 'all',
      })

      if (result.data?.createPlaylist?.playlist?.id) {
        // TODO: Add selected tracks to playlist via addPlaylistItem mutation
        onSuccess?.(result.data.createPlaylist.playlist.id)
        setTitle('')
        setDescription('')
        setSelectedTracks([])
        onClose()
      } else if (result.errors?.length) {
        console.error('GraphQL errors:', result.errors)
        setError('Failed to create playlist. Please try again.')
      }
    } catch (err) {
      console.error('Failed to create playlist:', err)
      setError('Failed to create playlist. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Tabs - Post | Playlist | Mint */}
        <div className="flex border-b border-neutral-800">
          {(['post', 'playlist', 'mint'] as ModalTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'text-white bg-neutral-800/50 border-b-2 border-green-500'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={onClose}
            className="px-4 py-4 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Playlist Tab Content */}
        {activeTab === 'playlist' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Cover Image */}
            <div className="flex justify-center">
              <div className="w-full h-32 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center cursor-pointer hover:border-green-500/50 transition-colors group">
                <div className="flex items-center gap-3 text-neutral-400 group-hover:text-green-400 transition-colors">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm font-medium">Change Artwork</span>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Banging Beats"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
                maxLength={100}
              />
            </div>

            {/* Add Track Button */}
            <button
              type="button"
              onClick={() => setShowTrackSearch(!showTrackSearch)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-green-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add track</span>
            </button>

            {/* Track Search Dropdown */}
            {showTrackSearch && (
              <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-neutral-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={trackSearchQuery}
                      onChange={(e) => setTrackSearchQuery(e.target.value)}
                      placeholder="Search tracks..."
                      className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {tracksLoading ? (
                    <div className="p-4 text-center text-neutral-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </div>
                  ) : tracksData?.tracks?.nodes?.length ? (
                    tracksData.tracks.nodes.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => handleAddTrack({
                          id: track.id,
                          title: track.title,
                          artist: track.artist,
                          artworkUrl: track.artworkUrl,
                        })}
                        className="w-full flex items-center gap-3 p-3 hover:bg-neutral-700 transition-colors"
                      >
                        <div className="w-10 h-10 rounded bg-neutral-700 overflow-hidden flex-shrink-0">
                          {track.artworkUrl && (
                            <Asset src={track.artworkUrl} sizes="40px" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white text-sm font-medium truncate">{track.title}</p>
                          <p className="text-neutral-500 text-xs truncate">{track.artist}</p>
                        </div>
                        <Plus className="w-4 h-4 text-green-400" />
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-neutral-500 text-sm">
                      No tracks found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Tracks */}
            {selectedTracks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Tracks
                </label>
                <div className="space-y-2">
                  {selectedTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-3 bg-neutral-800 border border-neutral-700 rounded-xl"
                    >
                      <div className="w-12 h-12 rounded-lg bg-neutral-700 overflow-hidden flex-shrink-0">
                        {track.artworkUrl && (
                          <Asset src={track.artworkUrl} sizes="48px" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{track.title}</p>
                        <p className="text-neutral-500 text-sm truncate">{track.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTrack(track.id)}
                        className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Create Button */}
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full py-4 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'CREATE PLAYLIST'
              )}
            </button>
          </form>
        )}

        {/* Post Tab Placeholder */}
        {activeTab === 'post' && (
          <div className="p-6 text-center">
            <Music className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
            <p className="text-neutral-400">Create a new post</p>
            <p className="text-neutral-600 text-sm mt-2">Coming soon - use the feed to create posts</p>
          </div>
        )}

        {/* Mint Tab Placeholder */}
        {activeTab === 'mint' && (
          <div className="p-6 text-center">
            <Music className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
            <p className="text-neutral-400">Mint a new track NFT</p>
            <p className="text-neutral-600 text-sm mt-2">Coming soon - use the Create button in the header</p>
          </div>
        )}
      </div>
    </div>
  )
}
