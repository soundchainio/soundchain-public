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

  // Fullscreen Desktop View - Split monitor style
  if (isFullscreen && !isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        {/* Close/Minimize Button */}
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Exit fullscreen"
        >
          <ArrowsPointingInIcon className="h-5 w-5 text-white" />
        </button>

        {/* Left Side - Large Cover Art */}
        <div className="flex w-1/2 items-center justify-center p-12">
          <div className="relative aspect-square w-full max-w-[600px] overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
            <Asset src={currentSong.art} sizes="600px" />
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>

        {/* Right Side - Track Details & Controls */}
        <div className="flex w-1/2 flex-col justify-center overflow-y-auto p-12 text-white">
          <div className="max-w-lg">
            {/* Track Info */}
            <div className="mb-8">
              <NextLink href={`/tracks/${currentSong.trackId}`} className="group">
                <h1 className="text-5xl font-black tracking-tight group-hover:text-cyan-400 transition-colors">
                  {currentSong.title || 'Unknown Title'}
                </h1>
              </NextLink>
              <p className="mt-2 text-2xl text-neutral-400">{currentSong.artist || 'Unknown Artist'}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <AudioSlider className="audio-player" min={0} max={duration} value={progress} onChange={onSliderChange} />
              <div className="mt-2 flex justify-between text-sm text-neutral-500">
                <span>{timeFromSecs(progress || 0)}</span>
                <span onClick={onPlaybackDurationClick} className="cursor-pointer hover:text-white">
                  {showTotalPlaybackDuration ? timeFromSecs(duration || 0) : remainingTime(progress, duration || 0)}
                </span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="mb-8 flex items-center justify-center gap-8">
              <button
                aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
                className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                onClick={toggleShuffle}
              >
                <Shuffle width={20} stroke={isShuffleOn ? '#22d3ee' : '#808080'} />
              </button>
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label="Previous track"
                onClick={playPrevious}
              >
                <Rewind className="h-6 w-6" />
              </button>
              <button
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-white/20"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
              >
                {isPlaying ? <Pause fill="black" className="h-8 w-8" /> : <Play fill="black" className="h-8 w-8 ml-1" />}
              </button>
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                aria-label="Next track"
                onClick={playNext}
                disabled={!hasNext}
              >
                <Forward className="h-6 w-6" />
              </button>
              <button
                aria-label="Playlist"
                className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
              >
                <Playlists fillColor={isPlaylistOpen ? '#22d3ee' : '#808080'} />
              </button>
            </div>

            {/* Volume Control */}
            <div className="mb-8 flex items-center gap-4">
              <SpeakerXMarkIcon className="h-5 w-5 text-neutral-500" />
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
              <SpeakerWaveIcon className="h-5 w-5 text-neutral-500" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 hover:bg-white/20 transition-colors"
                onClick={handleFavorite}
              >
                {isFavorite ? <HeartFull className="h-5 w-5" /> : <HeartBorder className="h-5 w-5" />}
                <span>{isFavorite ? 'Liked' : 'Like'}</span>
              </button>
              <TrackShareButton trackId={currentSong.trackId} title={currentSong.title} artist={currentSong.artist} />
              <NextLink
                href={`/tracks/${currentSong.trackId}`}
                className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 hover:bg-white/20 transition-colors"
              >
                <Info className="h-5 w-5" />
                <span>Details</span>
              </NextLink>
            </div>

            {/* Playlist Section */}
            {isPlaylistOpen && (
              <div className="mt-8 max-h-[300px] overflow-y-auto rounded-xl bg-white/5 p-4">
                <h3 className="mb-4 text-lg font-bold">Up Next</h3>
                <div className="space-y-2">
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
          {!isMobile && (
            <button
              aria-label="Fullscreen"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              onClick={() => setIsFullscreen(true)}
            >
              <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
            </button>
          )}
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
