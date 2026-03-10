'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Asset from 'components/Asset/Asset'
import { Modal } from 'components/Modal'
import { TrackListItem } from 'components/TrackListItem'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useMe } from 'hooks/useMe'
import { DownArrow } from 'icons/DownArrow'
import { Forward } from 'icons/ForwardButton'
import { Pause } from 'icons/PauseBottomAudioPlayer'
import { Play } from 'icons/PlayBottomAudioPlayer'
import { Playlists } from 'icons/Playlists'
import { Rewind } from 'icons/RewindButton'
import { Repeat } from 'icons/Repeat'
import { Shuffle } from 'icons/Shuffle'
import { TrackDocument, useToggleFavoriteMutation } from 'lib/graphql'
import { useTrackComments } from 'hooks/useTrackComments'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { remainingTime, timeFromSecs } from 'utils/calculateTime'
import { checkIsMobile } from 'utils/IsMobile'
import { Flame, Share2, ChevronDown, BadgeCheck, ListMusic, SkipBack, SkipForward, Link2, MessageSquare, Film, ExternalLink } from 'lucide-react'
import { SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { toast } from 'react-toastify'

// Default fallback artwork
const DEFAULT_ARTWORK = '/default-pictures/album-artwork.png'

// Dynamic import for WaveformWithComments (uses wavesurfer.js which needs client-side)
const WaveformWithComments = dynamic(() => import('components/WaveformWithComments'), { ssr: false })

// Dynamic import for CreateStoryModal
const CreateStoryModal = dynamic(() => import('components/dex/CreateStoryModal').then(m => ({ default: m.CreateStoryModal })), { ssr: false })

// Gradient Progress Bar Component
const GradientProgressBar = ({
  progress,
  duration,
  onChange
}: {
  progress: number
  duration: number
  onChange: (value: number) => void
}) => {
  const percentage = duration > 0 ? (progress / duration) * 100 : 0

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newProgress = (x / rect.width) * duration
    onChange(newProgress)
  }

  return (
    <div
      className="relative h-1.5 bg-neutral-800 rounded-full cursor-pointer group"
      onClick={handleClick}
    >
      {/* Gradient progress fill */}
      <div
        className="absolute h-full rounded-full transition-all duration-100"
        style={{
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, #26D1A8 0%, #62AAFF 25%, #AC4EFD 50%, #F1419E 75%, #FED503 100%)'
        }}
      />
      {/* Hover indicator */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${percentage}% - 6px)` }}
      />
    </div>
  )
}

export const AudioPlayerModal = () => {
  const router = useRouter()
  const modalState = useModalState()
  const [toggleFavorite] = useToggleFavoriteMutation()
  const { dispatchShowAudioPlayerModal, dispatchShowPostModal } = useModalDispatch()
  const {
    currentSong,
    isPlaying,
    isShuffleOn,
    loopMode,
    duration,
    progress,
    hasNext,
    volume,
    playlist,
    isFavorite,
    togglePlay,
    setProgressStateFromSlider,
    setVolume,
    playPrevious,
    playNext,
    jumpTo,
    toggleShuffle,
    toggleLoop,
    setPlayerFavorite,
    isPlaylistOpen,
    setIsPlaylistOpen,
  } = useAudioPlayerContext()

  const [showTotalPlaybackDuration, setShowTotalPlaybackDuration] = useState(true)
  const [isMobile, setIsMobile] = useState(true)
  const [artworkError, setArtworkError] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const me = useMe()

  // Use artwork URL with fallback - track errors for background image
  const artworkUrl = (!currentSong.art || artworkError) ? DEFAULT_ARTWORK : currentSong.art

  // External track detection — parse EXTERNAL:sourceType:url format
  const isExternalTrack = currentSong.src?.startsWith('EXTERNAL:')
  const externalEmbed = useMemo(() => {
    if (!isExternalTrack) return null
    const parts = currentSong.src.split(':')
    const sourceType = parts[1]?.toLowerCase()
    const url = parts.slice(2).join(':')
    if (!url) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://soundchain.fm'
    let embedUrl = url
    if (sourceType === 'youtube') {
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (match) {
        const listParam = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)
        embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&enablejsapi=1&origin=${origin}${listParam ? `&list=${listParam[1]}` : ''}`
      }
    } else if (sourceType === 'spotify') {
      const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
      if (match) embedUrl = `https://open.spotify.com/embed/${match[1]}/${match[2]}`
    } else if (sourceType === 'soundcloud') {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=true`
    } else if (sourceType === 'bandcamp') {
      embedUrl = `https://bandcamp.com/EmbeddedPlayer/size=large/bgcol=333333/linkcol=e99708/tracklist=false/artwork=small/transparent=true/url=${encodeURIComponent(url)}/`
    } else if (sourceType === 'vimeo') {
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
      if (match) embedUrl = `https://player.vimeo.com/video/${match[1]}?autoplay=1`
    } else if (sourceType === 'apple_music') {
      embedUrl = url.replace('music.apple.com', 'embed.music.apple.com')
    } else if (sourceType === 'tidal') {
      const match = url.match(/tidal\.com\/(?:browse\/)?(track|album|playlist)\/(\d+)/)
      if (match) embedUrl = `https://embed.tidal.com/${match[1]}s/${match[2]}`
    }
    return { url: embedUrl, sourceType }
  }, [currentSong.src, isExternalTrack])

  // Reset error state when track changes
  useEffect(() => {
    setArtworkError(false)
  }, [currentSong.trackId])

  // Track comments for waveform
  const { comments, addComment, likeComment } = useTrackComments({
    trackId: currentSong.trackId,
  })

  const isOpen = modalState.showAudioPlayer
  const shouldStartFullscreen = modalState.audioPlayerFullscreen

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false)
  }

  // Called only when user releases the slider - this is when we actually seek
  const onSliderCommit = (value: number) => {
    setProgressStateFromSlider(value)
  }

  const handleFavorite = async () => {
    if (me?.profile.id) {
      await toggleFavorite({ variables: { trackId: currentSong.trackId }, refetchQueries: [TrackDocument] })
      setPlayerFavorite(!isFavorite)
    } else {
      router.push('/login')
    }
  }

  const handleShareURL = async () => {
    const url = `${window.location.origin}/tracks/${currentSong.trackId}`
    try {
      await navigator.share({
        title: 'SoundChain',
        text: `Listen to this SoundChain track: ${currentSong.title} - ${currentSong.artist}`,
        url,
      })
    } catch {
      await navigator.clipboard.writeText(url)
      toast('URL copied to clipboard')
    }
    setShowShareMenu(false)
  }

  const handleShareAsPost = () => {
    setShowShareMenu(false)
    dispatchShowAudioPlayerModal(false)
    dispatchShowPostModal({ show: true, trackId: currentSong.trackId })
  }

  const handleShareToStory = () => {
    setShowShareMenu(false)
    setShowStoryModal(true)
  }

  // Close share menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShareMenu])

  useEffect(() => {
    handleClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath])

  useEffect(() => {
    setIsMobile(checkIsMobile)
  }, [])

  // Immersive fullscreen Now Playing - artwork fills entire screen
  return (
    <Modal
      show={isOpen}
      title=""
      leftButton={undefined}
      rightButton={undefined}
      onClose={handleClose}
      fullScreen
    >
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black">
        {/* Hidden img to detect load errors for background image */}
        {currentSong.art && !artworkError && !isExternalTrack && (
          <img
            src={currentSong.art}
            alt=""
            className="hidden"
            onError={() => setArtworkError(true)}
          />
        )}

        {isExternalTrack && externalEmbed ? (
          <>
            {/* External track — embed iframe as background */}
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 top-12 bottom-48">
              <iframe
                src={externalEmbed.url}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={currentSong.title || 'External Track'}
              />
            </div>
            {/* Gradient overlay at bottom for controls readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black pointer-events-none" />
          </>
        ) : (
          <>
            {/* Full-bleed Background Artwork */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${artworkUrl})`,
              }}
            />
            {/* Dark gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" />
          </>
        )}

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header - Now Playing with Share */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button
              onClick={handleClose}
              className="p-2 -ml-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 active:bg-black/60 transition-colors"
              aria-label="Close"
            >
              <ChevronDown className="w-6 h-6 text-white" />
            </button>

            <h2 className="text-white font-semibold text-sm tracking-wide drop-shadow-lg">Now Playing</h2>

            <div className="w-10" /> {/* Spacer to balance header */}
          </div>

          {/* Spacer to push controls to bottom */}
          <div className="flex-1" />

          {/* Bottom Controls Panel */}
          <div className="px-6 pb-safe bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-16">
            {/* Track Info with Fire icon */}
            <div className="w-full max-w-[400px] mx-auto flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <NextLink href={`/dex/track/${currentSong.trackId}`} className="block group">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white truncate group-hover:text-cyan-400 transition-colors drop-shadow-lg">
                      {currentSong.title || 'Unknown Title'}
                    </h1>
                    <BadgeCheck className="w-6 h-6 text-cyan-400 flex-shrink-0 drop-shadow-lg" />
                  </div>
                </NextLink>
                <p className="text-white/70 text-base sm:text-lg truncate mt-1 drop-shadow-lg">
                  {currentSong.artist || 'Unknown Artist'}
                </p>
              </div>

              {/* Fire/Favorite Button */}
              <button
                onClick={handleFavorite}
                className="p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 active:bg-black/60 transition-all active:scale-95"
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Flame
                  className={`w-7 h-7 transition-colors ${
                    isFavorite
                      ? 'text-orange-500 fill-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]'
                      : 'text-white/70 hover:text-orange-400'
                  }`}
                />
              </button>
            </div>

            {/* Waveform / External Platform Badge */}
            <div className="w-full px-4 mb-4">
              {isExternalTrack ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400/70 text-xs font-mono uppercase tracking-wider">
                    Playing via {externalEmbed?.sourceType || 'embed'}
                  </span>
                </div>
              ) : currentSong.src ? (
                <WaveformWithComments
                  trackId={currentSong.trackId}
                  audioUrl={currentSong.src}
                  duration={duration || 180}
                  comments={comments}
                  onAddComment={addComment}
                  onLikeComment={likeComment}
                  isPlaying={isPlaying}
                  currentTime={progress}
                  onSeek={onSliderCommit}
                  onPlayPause={togglePlay}
                  variant="glass"
                />
              ) : null}
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
              >
                <Shuffle
                  className={`w-6 h-6 ${isShuffleOn ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-white/60'}`}
                />
              </button>

              {/* Previous */}
              <button
                onClick={playPrevious}
                className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                aria-label="Previous track"
              >
                <SkipBack className="w-9 h-9 text-white fill-white drop-shadow-lg" />
              </button>

              {/* Play/Pause - Main button */}
              <button
                onClick={togglePlay}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl shadow-white/30"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause fill="black" className="w-8 h-8 sm:w-9 sm:h-9" />
                ) : (
                  <Play fill="black" className="w-8 h-8 sm:w-9 sm:h-9 ml-1" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={playNext}
                disabled={!hasNext}
                className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-40"
                aria-label="Next track"
              >
                <SkipForward className="w-9 h-9 text-white fill-white drop-shadow-lg" />
              </button>

              {/* Loop/Repeat */}
              <button
                onClick={toggleLoop}
                className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
                aria-label={`Loop: ${loopMode}`}
                title={loopMode === 'off' ? 'Loop off' : loopMode === 'all' ? 'Loop all' : 'Loop one'}
              >
                <Repeat
                  width={24}
                  showOne={loopMode === 'one'}
                  className={`w-6 h-6 ${loopMode !== 'off' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-white/60'}`}
                />
              </button>

              {/* Share */}
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Share"
                >
                  <Share2 className={`w-6 h-6 ${showShareMenu ? 'text-cyan-400' : 'text-white/60'}`} />
                </button>

                {/* Share Menu Popup */}
                {showShareMenu && (
                  <div className="absolute bottom-full mb-2 right-0 w-48 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-150 z-50">
                    <button
                      onClick={handleShareURL}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      <Link2 className="w-4 h-4 text-cyan-400" />
                      Share URL
                    </button>
                    <button
                      onClick={handleShareAsPost}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      Share as Post
                    </button>
                    <button
                      onClick={handleShareToStory}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      <Film className="w-4 h-4 text-pink-400" />
                      Share to Story/Reel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Volume Control - Desktop only */}
            <div className="hidden md:flex w-full max-w-[300px] mx-auto items-center gap-3 mb-4">
              <SpeakerXMarkIcon className="w-5 h-5 text-white/60" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
              />
              <SpeakerWaveIcon className="w-5 h-5 text-white/60" />
            </div>

            {/* Playlist Section (Expandable) */}
            {isPlaylistOpen && playlist.length > 0 && (
              <div className="w-full max-w-[400px] mx-auto mb-4 max-h-[180px] overflow-y-auto rounded-xl bg-black/40 backdrop-blur-md p-3 animate-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-white font-semibold text-sm mb-3 px-1">Up Next</h3>
                <div className="space-y-1">
                  {playlist.map((song, idx) => (
                    <button
                      key={song.trackId}
                      onClick={() => jumpTo(idx)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        currentSong.trackId === song.trackId
                          ? 'bg-cyan-500/30 text-cyan-400'
                          : 'hover:bg-white/10 text-white'
                      }`}
                    >
                      <span className="w-5 text-xs text-white/50 flex-shrink-0">{idx + 1}</span>
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <Asset src={song.art} sizes="40px" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{song.title}</p>
                        <p className="text-xs text-white/50 truncate">{song.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Story/Reel Creation Modal */}
      {showStoryModal && (
        <CreateStoryModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          prefillTrack={{
            trackId: currentSong.trackId,
            title: currentSong.title || 'Unknown Title',
            artist: currentSong.artist || 'Unknown Artist',
            artworkUrl: artworkUrl,
          }}
        />
      )}
    </Modal>
  )
}

export default AudioPlayerModal
