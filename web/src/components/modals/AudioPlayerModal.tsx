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

import { SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
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
        <div className="mr-6 flex justify-end">
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
                  onClick={() => setIsPlaylistOpen(!isOpen)}
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
