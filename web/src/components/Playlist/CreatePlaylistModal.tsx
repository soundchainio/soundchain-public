'use client'

import { useState, useCallback, useRef } from 'react'
import { X, ImagePlus, Loader2, Plus, Search, Link2, Music2, Trash2 } from 'lucide-react'
import { useCreatePlaylistMutation, useExploreTracksQuery, SortExploreTracksField, SortOrder } from 'lib/graphql'
import { useUpload } from 'hooks/useUpload'
import Asset from 'components/Asset/Asset'

interface Track {
  id: string
  title: string | null
  artist: string | null
  artworkUrl: string | null
}

interface ExternalLink {
  id: string
  url: string
  platform: string
}

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (playlistId: string) => void
}

// Detect platform from URL
const detectPlatform = (url: string): string => {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube'
  if (lowerUrl.includes('spotify.com')) return 'Spotify'
  if (lowerUrl.includes('music.apple.com')) return 'Apple Music'
  if (lowerUrl.includes('music.amazon') || lowerUrl.includes('amazon.com/music')) return 'Amazon Music'
  if (lowerUrl.includes('tidal.com')) return 'Tidal'
  if (lowerUrl.includes('bandcamp.com')) return 'Bandcamp'
  if (lowerUrl.includes('soundcloud.com')) return 'SoundCloud'
  if (lowerUrl.includes('instagram.com/reel')) return 'IG Reels'
  if (lowerUrl.includes('instagram.com')) return 'Instagram'
  if (lowerUrl.includes('tiktok.com')) return 'TikTok'
  if (lowerUrl.includes('audiomack.com')) return 'Audiomack'
  return 'Link'
}

// Platform colors
const platformColors: Record<string, string> = {
  'YouTube': 'bg-red-500',
  'Spotify': 'bg-green-500',
  'Apple Music': 'bg-pink-500',
  'Amazon Music': 'bg-blue-500',
  'Tidal': 'bg-cyan-500',
  'Bandcamp': 'bg-teal-500',
  'SoundCloud': 'bg-orange-500',
  'IG Reels': 'bg-gradient-to-r from-purple-500 to-pink-500',
  'Instagram': 'bg-gradient-to-r from-purple-500 to-pink-500',
  'TikTok': 'bg-black',
  'Audiomack': 'bg-orange-600',
  'Link': 'bg-neutral-500',
}

export const CreatePlaylistModal = ({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) => {
  const [title, setTitle] = useState('')
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([])
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([])
  const [showTrackSearch, setShowTrackSearch] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [trackSearchQuery, setTrackSearchQuery] = useState('')
  const [linkInput, setLinkInput] = useState('')

  // File input ref for artwork upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload hook for artwork
  const { preview: artworkPreview, uploading: artworkUploading, upload: uploadArtwork } = useUpload(
    artworkUrl || undefined,
    (url) => setArtworkUrl(url)
  )

  const [createPlaylist] = useCreatePlaylistMutation()

  // Handle artwork file selection
  const handleArtworkClick = () => {
    fileInputRef.current?.click()
  }

  const handleArtworkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPG, PNG)')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB')
        return
      }
      try {
        await uploadArtwork([file])
      } catch (err) {
        console.error('Artwork upload failed:', err)
        setError('Failed to upload artwork. Please try again.')
      }
    }
  }

  // Load more tracks (50 instead of 10) for better discovery
  const { data: tracksData, loading: tracksLoading } = useExploreTracksQuery({
    variables: {
      page: { first: 50 },
      sort: { field: SortExploreTracksField.CreatedAt, order: SortOrder.Desc },
      search: trackSearchQuery || undefined,
    },
    skip: !showTrackSearch,
  })

  const handleAddTrack = useCallback((track: Track) => {
    if (!selectedTracks.find(t => t.id === track.id)) {
      setSelectedTracks(prev => [...prev, track])
    }
  }, [selectedTracks])

  const handleRemoveTrack = useCallback((trackId: string) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId))
  }, [])

  const handleAddLink = useCallback(() => {
    if (!linkInput.trim()) return

    // Basic URL validation
    let url = linkInput.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    const platform = detectPlatform(url)
    const newLink: ExternalLink = {
      id: `link-${Date.now()}`,
      url,
      platform,
    }

    setExternalLinks(prev => [...prev, newLink])
    setLinkInput('')
    setShowLinkInput(false)
  }, [linkInput])

  const handleRemoveLink = useCallback((linkId: string) => {
    setExternalLinks(prev => prev.filter(l => l.id !== linkId))
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
            description: externalLinks.length > 0
              ? `External links: ${externalLinks.map(l => l.url).join(', ')}`
              : null,
            artworkUrl: artworkUrl || undefined,
          },
        },
        errorPolicy: 'all',
      })

      if (result.data?.createPlaylist?.playlist?.id) {
        // TODO: Add selected tracks to playlist via addPlaylistItem mutation
        // TODO: Store external links in playlist metadata
        onSuccess?.(result.data.createPlaylist.playlist.id)
        setTitle('')
        setArtworkUrl(null)
        setSelectedTracks([])
        setExternalLinks([])
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

  const tracks = tracksData?.exploreTracks?.nodes || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Simple title with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white">Create Playlist</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleArtworkChange}
            className="hidden"
          />

          {/* Cover Image */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleArtworkClick}
              disabled={artworkUploading}
              className="w-full h-32 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center cursor-pointer hover:border-green-500/50 transition-colors group overflow-hidden relative"
            >
              {artworkUploading ? (
                <div className="flex items-center gap-3 text-green-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </div>
              ) : artworkPreview || artworkUrl ? (
                <>
                  <img
                    src={artworkPreview || artworkUrl || ''}
                    alt="Playlist artwork"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-sm font-medium">Change</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 text-neutral-400 group-hover:text-green-400 transition-colors">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm font-medium">Add Cover Artwork</span>
                </div>
              )}
            </button>
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
              placeholder="My Awesome Playlist"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
              maxLength={100}
            />
          </div>

          {/* Add Track Button */}
          <button
            type="button"
            onClick={() => { setShowTrackSearch(!showTrackSearch); setShowLinkInput(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-green-500/50 transition-all"
          >
            <Music2 className="w-5 h-5" />
            <span className="font-medium">Add track from library</span>
          </button>

          {/* Add External Link Button */}
          <button
            type="button"
            onClick={() => { setShowLinkInput(!showLinkInput); setShowTrackSearch(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            <Link2 className="w-5 h-5" />
            <span className="font-medium">Add external link</span>
            <span className="ml-auto text-xs text-neutral-500">YouTube, Spotify, Apple Music...</span>
          </button>

          {/* External Link Input */}
          {showLinkInput && (
            <div className="bg-neutral-800 border border-cyan-500/50 rounded-xl p-4 space-y-3">
              <p className="text-xs text-neutral-400">
                Paste a link from YouTube, Spotify, Apple Music, Amazon Music, Tidal, Bandcamp, SoundCloud, IG Reels, or any music platform
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  className="flex-1 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={!linkInput.trim()}
                  className="px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Track Search - Stacked Avatar Style */}
          {showTrackSearch && (
            <div className="bg-neutral-800 border border-green-500/50 rounded-xl overflow-hidden">
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

              {/* Stacked Avatar Grid */}
              <div className="p-4">
                {tracksLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                  </div>
                ) : tracks.length > 0 ? (
                  <>
                    {/* Stacked avatars preview */}
                    <div className="flex items-center mb-4">
                      <div className="flex -space-x-3">
                        {tracks.slice(0, 8).map((track, i) => (
                          <div
                            key={track.id}
                            className="w-10 h-10 rounded-full border-2 border-neutral-800 overflow-hidden bg-neutral-700"
                            style={{ zIndex: 10 - i }}
                          >
                            {track.artworkUrl ? (
                              <Asset src={track.artworkUrl} sizes="40px" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-500 to-cyan-500" />
                            )}
                          </div>
                        ))}
                        {tracks.length > 8 && (
                          <div className="w-10 h-10 rounded-full border-2 border-neutral-800 bg-neutral-700 flex items-center justify-center text-xs font-bold text-white">
                            +{tracks.length - 8}
                          </div>
                        )}
                      </div>
                      <span className="ml-4 text-sm text-neutral-400">{tracks.length} tracks available</span>
                    </div>

                    {/* Scrollable track list */}
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {tracks.map((track) => {
                        const isSelected = selectedTracks.some(t => t.id === track.id)
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => !isSelected && handleAddTrack({
                              id: track.id,
                              title: track.title,
                              artist: track.artist,
                              artworkUrl: track.artworkUrl,
                            })}
                            disabled={isSelected}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-green-500/20 cursor-default'
                                : 'hover:bg-neutral-700 cursor-pointer'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-neutral-700 overflow-hidden flex-shrink-0">
                              {track.artworkUrl ? (
                                <Asset src={track.artworkUrl} sizes="40px" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-green-500 to-cyan-500" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-white text-sm font-medium truncate">{track.title}</p>
                              <p className="text-neutral-500 text-xs truncate">{track.artist}</p>
                            </div>
                            {isSelected ? (
                              <span className="text-green-400 text-xs font-semibold">Added</span>
                            ) : (
                              <Plus className="w-4 h-4 text-green-400" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-neutral-500 text-sm">
                    No tracks found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Items Preview */}
          {(selectedTracks.length > 0 || externalLinks.length > 0) && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-400">
                Playlist Items ({selectedTracks.length + externalLinks.length})
              </label>

              {/* Stacked preview of selected tracks */}
              {selectedTracks.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-neutral-800 rounded-xl">
                  <div className="flex -space-x-2">
                    {selectedTracks.slice(0, 5).map((track, i) => (
                      <div
                        key={track.id}
                        className="w-8 h-8 rounded-full border-2 border-neutral-800 overflow-hidden bg-neutral-700"
                        style={{ zIndex: 10 - i }}
                      >
                        {track.artworkUrl ? (
                          <Asset src={track.artworkUrl} sizes="32px" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-cyan-500" />
                        )}
                      </div>
                    ))}
                    {selectedTracks.length > 5 && (
                      <div className="w-8 h-8 rounded-full border-2 border-neutral-800 bg-neutral-700 flex items-center justify-center text-xs font-bold text-white">
                        +{selectedTracks.length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-neutral-300">{selectedTracks.length} tracks</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTracks([])}
                    className="ml-auto text-xs text-red-400 hover:text-red-300"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* External links list */}
              {externalLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl"
                >
                  <div className={`w-8 h-8 rounded-full ${platformColors[link.platform]} flex items-center justify-center`}>
                    <Link2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{link.platform}</p>
                    <p className="text-xs text-neutral-500 truncate">{link.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
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
      </div>
    </div>
  )
}
