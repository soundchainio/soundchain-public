import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Grid3X3, List, Play, Pause, Music2, Check, X, Loader2, ChevronRight } from 'lucide-react'
import { useExploreTracksQuery, Track } from 'lib/graphql'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { getIpfsUrl } from 'utils/ipfs'
import { useDebounce } from 'hooks/useDebounce'

interface NFTMusicPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (track: Track) => void
  selectedTrackId?: string
}

type ViewMode = 'grid' | 'list'
type FilterTab = 'trending' | 'following' | 'myNfts' | 'all'

export const NFTMusicPicker = ({
  isOpen,
  onClose,
  onSelect,
  selectedTrackId,
}: NFTMusicPickerProps) => {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeTab, setActiveTab] = useState<FilterTab>('trending')
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { play, isCurrentSong, isPlaying, togglePlay } = useAudioPlayerContext()

  // Query tracks using explore query which supports search
  const { data, loading } = useExploreTracksQuery({
    variables: {
      search: debouncedSearch || undefined,
      page: { first: 50 },
    },
    skip: !isOpen,
  })

  const tracks = data?.exploreTracks?.nodes || []

  // Handle 15-second preview
  const handlePreview = useCallback((track: Track) => {
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }

    // If this track is already previewing, toggle play/pause
    if (isCurrentSong(track.id)) {
      togglePlay()
      return
    }

    // Start playing preview
    const audioUrl = getIpfsUrl(track.playbackUrl || track.ipfsUrl)
    if (audioUrl) {
      play({
        src: audioUrl,
        trackId: track.id,
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        art: getIpfsUrl(track.artworkUrl),
      })
      setPreviewingTrackId(track.id)

      // Auto-stop after 15 seconds
      previewTimeoutRef.current = setTimeout(() => {
        togglePlay()
        setPreviewingTrackId(null)
      }, 15000)
    }
  }, [play, isCurrentSong, togglePlay])

  // Select track for reel
  const handleSelect = useCallback((track: Track) => {
    // Stop any preview
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    onSelect(track)
    onClose()
  }, [onSelect, onClose])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed z-[101] inset-4 sm:inset-8 md:inset-12 lg:inset-16 flex flex-col bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Add Music to Reel</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search and filters */}
        <div className="px-4 py-3 space-y-3 border-b border-neutral-800">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search tracks, artists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors text-sm"
            />
          </div>

          {/* Filter tabs and view toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['trending', 'following', 'myNfts', 'all'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {tab === 'trending' && 'Trending'}
                  {tab === 'following' && 'Following'}
                  {tab === 'myNfts' && 'My NFTs'}
                  {tab === 'all' && 'All'}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-neutral-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
              <Music2 className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No tracks found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {tracks.map((track) => (
                <TrackGridCard
                  key={track.id}
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  isPreviewing={previewingTrackId === track.id && isPlaying}
                  isCurrentTrack={isCurrentSong(track.id)}
                  onPreview={() => handlePreview(track)}
                  onSelect={() => handleSelect(track)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <TrackListItem
                  key={track.id}
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  isPreviewing={previewingTrackId === track.id && isPlaying}
                  isCurrentTrack={isCurrentSong(track.id)}
                  onPreview={() => handlePreview(track)}
                  onSelect={() => handleSelect(track)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-neutral-800 bg-neutral-900/80">
          <p className="text-xs text-neutral-500 text-center">
            Tap to preview (15 sec) • Hold to attach • Using NFT music enables SCID rewards
          </p>
        </div>
      </div>
    </>
  )
}

// Grid card component
const TrackGridCard = ({
  track,
  isSelected,
  isPreviewing,
  isCurrentTrack,
  onPreview,
  onSelect,
}: {
  track: Track
  isSelected: boolean
  isPreviewing: boolean
  isCurrentTrack: boolean
  onPreview: () => void
  onSelect: () => void
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isHolding, setIsHolding] = useState(false)

  const artworkUrl = getIpfsUrl(track.artworkUrl, '/default-pictures/album-artwork.png')

  // Long press to select
  const handlePointerDown = () => {
    setIsHolding(true)
    holdTimeoutRef.current = setTimeout(() => {
      onSelect()
    }, 500)
  }

  const handlePointerUp = () => {
    setIsHolding(false)
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      // If released before 500ms, treat as tap (preview)
      onPreview()
    }
  }

  const handlePointerLeave = () => {
    setIsHolding(false)
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-neutral-800 transition-all cursor-pointer ${
        isSelected
          ? 'ring-2 ring-cyan-500 scale-[1.02]'
          : 'hover:scale-[1.02] hover:ring-1 hover:ring-cyan-500/50'
      } ${isHolding ? 'scale-95 ring-2 ring-purple-500' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* Artwork */}
      <div className="aspect-square relative">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-neutral-700 animate-pulse" />
        )}
        {imageError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
            <Music2 className="w-8 h-8 text-neutral-600" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={track.title || 'Track'}
            className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Play overlay */}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
          isPreviewing || isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isPreviewing ? 'bg-cyan-500' : 'bg-white/20 backdrop-blur-sm'
          }`}>
            {isPreviewing ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-black" />
          </div>
        )}

        {/* SCID eligible badge */}
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-purple-500/90 text-[9px] font-bold text-white">
          SCID
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-white text-xs font-medium truncate">{track.title || 'Untitled'}</p>
        <p className="text-neutral-400 text-[10px] truncate">{track.artist || 'Unknown'}</p>
      </div>
    </div>
  )
}

// List item component
const TrackListItem = ({
  track,
  isSelected,
  isPreviewing,
  isCurrentTrack,
  onPreview,
  onSelect,
}: {
  track: Track
  isSelected: boolean
  isPreviewing: boolean
  isCurrentTrack: boolean
  onPreview: () => void
  onSelect: () => void
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const artworkUrl = getIpfsUrl(track.artworkUrl, '/default-pictures/album-artwork.png')

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
        isSelected
          ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50'
          : 'bg-neutral-800/50 hover:bg-neutral-800'
      }`}
    >
      {/* Artwork with play button */}
      <div
        className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group"
        onClick={onPreview}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-neutral-700 animate-pulse" />
        )}
        {imageError ? (
          <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-neutral-600" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={track.title || 'Track'}
            className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
          isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isPreviewing ? (
            <Pause className="w-5 h-5 text-cyan-400" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{track.title || 'Untitled'}</p>
        <p className="text-neutral-400 text-xs truncate">{track.artist || 'Unknown'}</p>
      </div>

      {/* Duration */}
      <span className="text-neutral-500 text-xs tabular-nums">
        {formatDuration(track.duration)}
      </span>

      {/* SCID badge */}
      <div className="px-1.5 py-0.5 rounded bg-purple-500/80 text-[9px] font-bold text-white">
        SCID
      </div>

      {/* Select button */}
      <button
        onClick={onSelect}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isSelected
            ? 'bg-cyan-500 text-black'
            : 'bg-neutral-700 text-white hover:bg-cyan-500 hover:text-black'
        }`}
      >
        {isSelected ? (
          <>
            <Check className="w-3 h-3" />
            Selected
          </>
        ) : (
          <>
            Use
            <ChevronRight className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  )
}

export default NFTMusicPicker
