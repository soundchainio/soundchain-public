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
import { HeartBorder } from 'icons/HeartBorder'
import { HeartFull } from 'icons/HeartFull'
import { Info } from 'icons/Info'
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

import { SpeakerXMarkIcon, SpeakerWaveIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline'
import { AudioSlider } from 'components/ui/audio-slider'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const me = useMe()

  const isOpen = modalState.showAudioPlayer

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false)
  }

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value)
  }

  const onPlaybackDurationClick = () => {
    setShowTotalPlaybackDuration(!showTotalPlaybackDuration)
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
    // TODO: fix this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath])

  useEffect(() => {
    setIsMobile(checkIsMobile)
  }, [])

  // Fullscreen View - Responsive for all screen sizes
  // Breakpoints: watch (<200px), glasses (400px), xxs (375px), xs (420px), sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
  // Special: glasses-landscape for Meta Ray-Ban and similar smart glasses (wide but short viewport)
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row glasses-landscape:flex-row bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden">
        {/* Close/Minimize Button - scales for all screens including watch */}
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute right-1 top-1 xxs:right-2 xxs:top-2 xs:right-4 xs:top-4 lg:right-6 lg:top-6 z-10 flex h-6 w-6 xxs:h-8 xxs:w-8 xs:h-10 xs:w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label="Exit fullscreen"
        >
          <ArrowsPointingInIcon className="h-3 w-3 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5 text-white" />
        </button>

        {/* Cover Art Section - Responsive from watch to 4K, optimized for glasses */}
        <div className="flex items-center justify-center p-2 xxs:p-3 xs:p-4 sm:p-6 md:p-8 lg:p-12 lg:w-1/2 glasses-landscape:w-2/5 glasses-landscape:p-4 flex-shrink-0">
          <div className="relative aspect-square w-full max-w-[80px] xxs:max-w-[100px] xs:max-w-[140px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-[420px] xl:max-w-[520px] 2xl:max-w-[600px] glasses-landscape:max-w-[180px] overflow-hidden rounded-lg xxs:rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50">
            <Asset src={currentSong.art} sizes="(max-width: 200px) 80px, (max-width: 375px) 100px, (max-width: 420px) 140px, (max-width: 640px) 220px, (max-width: 768px) 300px, (max-width: 1024px) 420px, 600px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>

        {/* Controls Section - Responsive layout, optimized for glasses */}
        <div className="flex flex-1 flex-col justify-center overflow-y-auto p-1 xxs:p-2 xs:p-3 sm:p-4 md:p-6 lg:p-12 lg:w-1/2 glasses-landscape:w-3/5 glasses-landscape:p-3 text-white">
          <div className="w-full max-w-lg mx-auto lg:mx-0 glasses-landscape:max-w-none">
            {/* Track Info - Responsive text sizes from watch to desktop */}
            <div className="mb-1 xxs:mb-2 xs:mb-3 sm:mb-4 lg:mb-8 text-center lg:text-left">
              <NextLink href={`/tracks/${currentSong.trackId}`} className="group">
                <h1 className="text-xs xxs:text-sm xs:text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight group-hover:text-cyan-400 transition-colors line-clamp-2">
                  {currentSong.title || 'Unknown Title'}
                </h1>
              </NextLink>
              <p className="mt-0.5 xxs:mt-1 text-[10px] xxs:text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-neutral-400 truncate">
                {currentSong.artist || 'Unknown Artist'}
              </p>
            </div>

            {/* Progress Bar - Hidden on watch, shown on larger screens */}
            <div className="hidden xxs:block mb-2 xs:mb-3 sm:mb-4 lg:mb-8">
              <AudioSlider className="audio-player" min={0} max={duration} value={progress} onChange={onSliderChange} />
              <div className="mt-0.5 xs:mt-1 sm:mt-2 flex justify-between text-[8px] xxs:text-[10px] xs:text-xs sm:text-sm text-neutral-500">
                <span>{timeFromSecs(progress || 0)}</span>
                <span onClick={onPlaybackDurationClick} className="cursor-pointer hover:text-white">
                  {showTotalPlaybackDuration ? timeFromSecs(duration || 0) : remainingTime(progress, duration || 0)}
                </span>
              </div>
            </div>

            {/* Main Controls - Optimized for all screens including watch and smart glasses */}
            {/* glasses-landscape: larger touch targets, high contrast for outdoor use */}
            <div className="mb-2 xxs:mb-3 xs:mb-4 sm:mb-6 lg:mb-8 glasses-landscape:mb-2 flex items-center justify-center gap-1 xxs:gap-2 xs:gap-3 sm:gap-4 lg:gap-6 xl:gap-8 glasses-landscape:gap-4">
              {/* Shuffle - hidden on watch/tiny screens, shown on glasses */}
              <button
                aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
                className="hidden sm:flex glasses-landscape:flex h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 glasses-landscape:h-10 glasses-landscape:w-10 items-center justify-center rounded-full hover:bg-white/10 glasses-landscape:bg-white/5 transition-colors"
                onClick={toggleShuffle}
              >
                <Shuffle width={14} className="md:w-4 lg:w-5 glasses-landscape:w-5" stroke={isShuffleOn ? '#22d3ee' : '#808080'} />
              </button>
              {/* Previous - larger on glasses for voice/gesture control */}
              <button
                className="flex h-8 w-8 xxs:h-9 xxs:w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 glasses-landscape:h-12 glasses-landscape:w-12 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 glasses-landscape:bg-white/5 transition-colors"
                aria-label="Previous track"
                onClick={playPrevious}
              >
                <Rewind className="h-3 w-3 xxs:h-4 xxs:w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 glasses-landscape:h-6 glasses-landscape:w-6" />
              </button>
              {/* Play/Pause - Main button, extra prominent on glasses */}
              <button
                className="flex h-12 w-12 xxs:h-14 xxs:w-14 xs:h-16 xs:w-16 sm:h-18 sm:w-18 md:h-20 md:w-20 lg:h-24 lg:w-24 glasses-landscape:h-16 glasses-landscape:w-16 items-center justify-center rounded-full bg-white hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-white/20 glasses-landscape:shadow-white/40"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause fill="black" className="h-4 w-4 xxs:h-5 xxs:w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 glasses-landscape:h-8 glasses-landscape:w-8" />
                ) : (
                  <Play fill="black" className="h-4 w-4 xxs:h-5 xxs:w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 glasses-landscape:h-8 glasses-landscape:w-8 ml-0.5 sm:ml-1" />
                )}
              </button>
              {/* Next - larger on glasses */}
              <button
                className="flex h-8 w-8 xxs:h-9 xxs:w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 glasses-landscape:h-12 glasses-landscape:w-12 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 glasses-landscape:bg-white/5 transition-colors disabled:opacity-50"
                aria-label="Next track"
                onClick={playNext}
                disabled={!hasNext}
              >
                <Forward className="h-3 w-3 xxs:h-4 xxs:w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 glasses-landscape:h-6 glasses-landscape:w-6" />
              </button>
              {/* Playlist - shown on glasses */}
              <button
                aria-label="Playlist"
                className="hidden sm:flex glasses-landscape:flex h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 glasses-landscape:h-10 glasses-landscape:w-10 items-center justify-center rounded-full hover:bg-white/10 glasses-landscape:bg-white/5 transition-colors"
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
              >
                <Playlists fillColor={isPlaylistOpen ? '#22d3ee' : '#808080'} />
              </button>
            </div>

            {/* Volume Control - Hidden on watch/phone screens */}
            <div className="hidden md:flex mb-4 lg:mb-8 items-center gap-2 md:gap-3 lg:gap-4">
              <SpeakerXMarkIcon className="h-4 w-4 lg:h-5 lg:w-5 text-neutral-500" />
              <div className="flex-1">
                <AudioSlider
                  className="volume-slider"
                  min={0}
                  max={1}
                  value={volume}
                  onChange={value => setVolume(value)}
                  step={0.01}
                />
              </div>
              <SpeakerWaveIcon className="h-4 w-4 lg:h-5 lg:w-5 text-neutral-500" />
            </div>

            {/* Action Buttons - Responsive layout, simplified on small screens */}
            <div className="hidden xxs:flex items-center justify-center lg:justify-start gap-1 xs:gap-2 sm:gap-3 lg:gap-4 flex-wrap">
              <button
                className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 rounded-full bg-white/10 px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 hover:bg-white/20 active:bg-white/30 transition-colors text-[10px] xs:text-xs sm:text-sm"
                onClick={handleFavorite}
              >
                {isFavorite ? <HeartFull className="h-3 w-3 xs:h-4 xs:w-4 lg:h-5 lg:w-5" /> : <HeartBorder className="h-3 w-3 xs:h-4 xs:w-4 lg:h-5 lg:w-5" />}
                <span className="hidden xs:inline">{isFavorite ? 'Liked' : 'Like'}</span>
              </button>
              <div className="hidden xs:block">
                <TrackShareButton trackId={currentSong.trackId} title={currentSong.title} artist={currentSong.artist} />
              </div>
              <NextLink
                href={`/tracks/${currentSong.trackId}`}
                className="hidden md:flex items-center gap-1 sm:gap-2 rounded-full bg-white/10 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 hover:bg-white/20 transition-colors text-xs sm:text-sm"
              >
                <Info className="h-4 w-4 lg:h-5 lg:w-5" />
                <span>Details</span>
              </NextLink>
            </div>

            {/* Playlist Section - Hidden on watch, responsive heights */}
            {isPlaylistOpen && (
              <div className="hidden sm:block mt-3 lg:mt-8 max-h-[120px] md:max-h-[180px] lg:max-h-[300px] overflow-y-auto rounded-lg lg:rounded-xl bg-white/5 p-2 sm:p-3 lg:p-4">
                <h3 className="mb-1 lg:mb-4 text-xs md:text-sm lg:text-lg font-bold">Up Next</h3>
                <div className="space-y-1 sm:space-y-2">
                  {playlist.map((song, idx) => (
                    <TrackListItem
                      key={song.trackId}
                      variant="playlist"
                      index={idx + 1}
                      song={song}
                      handleOnPlayClicked={() => jumpTo(idx)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Modal
      show={isOpen}
      title={'Now Playing'}
      leftButton={
        <div className="ml-6 flex justify-start">
          <button aria-label="Close" className="flex h-10 w-10 items-center justify-center" onClick={handleClose}>
            <DownArrow />
          </button>
        </div>
      }
      rightButton={
        <div className="mr-6 flex items-center gap-2">
          <button
            aria-label="Fullscreen"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20"
            onClick={() => setIsFullscreen(true)}
          >
            <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
          </button>
          <TrackShareButton trackId={currentSong.trackId} title={currentSong.title} artist={currentSong.artist} />
        </div>
      }
      onClose={handleClose}
    >
      <div className="flex h-full flex-col items-center text-white">
        <div className="h-full w-full px-8 sm:max-w-xs sm:px-0">
          <div style={{ display: 'grid', height: '80vh', gridTemplateRows: '75% 25%' }}>
            <div className={`flex flex-col truncate ${isPlaylistOpen ? 'justify-start' : 'justify-end'}`}>
              <div className={isPlaylistOpen ? 'flex items-center gap-4' : 'block'}>
                <div className="flex justify-center">
                  <div
                    className={
                      isPlaylistOpen
                        ? 'relative h-10 w-10 overflow-hidden rounded-lg'
                        : 'relative flex max-h-80 w-3/4 overflow-hidden rounded-lg bg-gray-80 after:block after:pb-full sm:w-full'
                    }
                  >
                    <Asset src={currentSong.art} />
                  </div>
                </div>
                <div className="my-4 flex w-full min-w-0 justify-between">
                  <div className="flex w-full gap-4">
                    <NextLink href={`/tracks/${currentSong.trackId}`} className="flex min-w-0 flex-1 flex-col">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate font-black">{currentSong.title || 'Unknown title'}</h2>
                        <Info className="flex-shrink-0" />
                      </div>
                      <h3 className="font-medium">{currentSong.artist || 'Unknown artist'}</h3>
                    </NextLink>
                    <button className="flex items-center" onClick={handleFavorite}>
                      {isFavorite && <HeartFull />}
                      {!isFavorite && <HeartBorder />}
                    </button>
                  </div>
                </div>
              </div>
              <div className={isPlaylistOpen ? 'visible mb-5 overflow-y-auto' : 'hidden'}>
                <h2 className="text-sm font-bold">Playlist</h2>
                <div className="overflow-y-auto">
                  {playlist.map((song, idx) => (
                    <div key={song.trackId} className="sm:pr-2">
                      <TrackListItem
                        variant="playlist"
                        index={idx + 1}
                        song={song}
                        handleOnPlayClicked={() => jumpTo(idx)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <AudioSlider className="audio-player" min={0} max={duration} value={progress} onChange={onSliderChange} />
              <div className="mt-2 flex cursor-default justify-between text-xs text-gray-80">
                <div>{timeFromSecs(progress || 0)}</div>
                <div onClick={onPlaybackDurationClick}>
                  {showTotalPlaybackDuration ? timeFromSecs(duration || 0) : remainingTime(progress, duration || 0)}
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button
                  aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
                  className="flex h-10 w-10 items-center justify-center rounded-full "
                  onClick={toggleShuffle}
                >
                  <Shuffle
                    width={16}
                    stroke={isShuffleOn ? 'white' : '#808080'}
                    className={isShuffleOn ? 'drop-shadow-white' : ''}
                  />
                </button>
                <div className="flex justify-center gap-4">
                  <button
                    className={'flex h-12 w-12 items-center justify-center rounded-full'}
                    aria-label="Previous track"
                    onClick={playPrevious}
                  >
                    <Rewind className={'hover:fill-current active:text-gray-80'} />
                  </button>
                  <button
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white hover:scale-110 active:scale-100"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause fill="black" /> : <Play fill="black" />}
                  </button>
                  <button
                    className={`${
                      !hasNext && 'cursor-default'
                    } flex h-12 w-12 items-center justify-center rounded-full`}
                    aria-label="Next track"
                    onClick={playNext}
                    disabled={!hasNext}
                  >
                    <Forward className={`${hasNext && 'hover:fill-current'} active:text-gray-80`} />
                  </button>
                </div>
                <button
                  aria-label="Playlist"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-80"
                  onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                >
                  <Playlists fillColor="#808080" />
                </button>
              </div>
              {!isMobile && (
                <div className="flex items-center gap-4 pt-8">
                  <SpeakerXMarkIcon className="h-4 w-4" />
                  <div className="flex-1">
                    <AudioSlider
                      className="volume-slider"
                      min={0}
                      max={1}
                      value={volume}
                      onChange={value => setVolume(value)}
                      step={0.1}
                    />
                  </div>
                  <SpeakerWaveIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default AudioPlayerModal
