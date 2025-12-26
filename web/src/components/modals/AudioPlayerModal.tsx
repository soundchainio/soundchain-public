'use client'

import { useEffect, useState } from 'react'
import Asset from 'components/Asset/Asset'
import { Modal } from 'components/Modal'
import { TrackListItem } from 'components/TrackListItem'
import { TrackShareButton } from 'components/TrackShareButton'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useMe } from 'hooks/useMe'
import { DownArrow } from 'icons/DownArrow'
import { Forward } from 'icons/ForwardButton'
import { Pause } from 'icons/PauseBottomAudioPlayer'
import { Play } from 'icons/PlayBottomAudioPlayer'
import { Playlists } from 'icons/Playlists'
import { Rewind } from 'icons/RewindButton'
import { Shuffle } from 'icons/Shuffle'
import { TrackDocument, useToggleFavoriteMutation } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { remainingTime, timeFromSecs } from 'utils/calculateTime'
import { checkIsMobile } from 'utils/IsMobile'
import { Flame, Share2, ChevronDown, BadgeCheck, ListMusic, SkipBack, SkipForward } from 'lucide-react'
import { SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'

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
  const { dispatchShowAudioPlayerModal } = useModalDispatch()
  const {
    currentSong,
    isPlaying,
    isShuffleOn,
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
    setPlayerFavorite,
    isPlaylistOpen,
    setIsPlaylistOpen,
  } = useAudioPlayerContext()

  const [showTotalPlaybackDuration, setShowTotalPlaybackDuration] = useState(true)
  const [isMobile, setIsMobile] = useState(true)
  const me = useMe()

  const isOpen = modalState.showAudioPlayer
  const shouldStartFullscreen = modalState.audioPlayerFullscreen

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false)
  }

  const onSliderChange = (value: number) => {
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
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden">
        {/* Full-bleed Background Artwork */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${currentSong.art || '/default-pictures/album-artwork.png'})`,
          }}
        />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" />

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

            <div className="bg-black/30 backdrop-blur-sm rounded-full">
              <TrackShareButton
                trackId={currentSong.trackId}
                title={currentSong.title}
                artist={currentSong.artist}
              />
            </div>
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

            {/* Progress Bar */}
            <div className="w-full max-w-[400px] mx-auto mb-4">
              <GradientProgressBar
                progress={progress}
                duration={duration}
                onChange={onSliderChange}
              />
              <div className="flex justify-between mt-2 text-sm text-white/60">
                <span className="drop-shadow-lg">{timeFromSecs(progress || 0)}</span>
                <span
                  onClick={() => setShowTotalPlaybackDuration(!showTotalPlaybackDuration)}
                  className="cursor-pointer hover:text-white transition-colors drop-shadow-lg"
                >
                  {showTotalPlaybackDuration ? timeFromSecs(duration || 0) : remainingTime(progress, duration || 0)}
                </span>
              </div>
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

              {/* Playlist toggle */}
              <button
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Show playlist"
              >
                <ListMusic
                  className={`w-6 h-6 ${isPlaylistOpen ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-white/60'}`}
                />
              </button>
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
    </Modal>
  )
}

export default AudioPlayerModal
