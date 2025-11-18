import tw from 'tailwind-styled-components'
import Asset from '../../Asset/Asset'
import mux from 'mux-embed'
import Hls from 'hls.js'
import { Slider } from '@reach/slider'
import { config } from 'config'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useEffect, useRef, useState } from 'react'
import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'
import { BotttomPlayerTrackSlider } from './components/BotttomPlayerTrackSlider'
import { Playlists } from 'icons/Playlists'
import { VolumeOffIcon, VolumeUpIcon } from '@heroicons/react/24/solid'
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io'

export const BottomAudioPlayer = () => {
  const me = useMe()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    currentSong,
    isPlaying,
    progressFromSlider,
    hasNext,
    setVolume,
    volume,
    playNext,
    setPlayingState,
    setDurationState,
    setProgressState,
    setProgressStateFromSlider,
    setIsPlaylistOpen,
  } = useAudioPlayerContext()

  const { dispatchShowAudioPlayerModal } = useModalDispatch()

  useEffect(() => {
    if (!audioRef.current || !currentSong.src) return

    let hls: Hls | null = null

    if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      audioRef.current.src = currentSong.src
    } else if (Hls.isSupported()) {
      hls = new Hls()
      hls.loadSource(currentSong.src)
      hls.attachMedia(audioRef.current)
    }

    mux.monitor(audioRef.current, {
      debug: false,
      data: {
        env_key: config.muxData,
        viewer_user_id: me?.id ?? '',
        player_name: 'Main Player',
        player_init_time: Date.now(),
        video_id: currentSong.trackId,
        video_title: `${currentSong.artist} - ${currentSong.title}`,
        video_producer: currentSong.artist,
      },
    })

    return () => {
      if (hls) hls.destroy()
    }
  }, [currentSong, me?.id])

  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying) audioRef.current.play()
    else audioRef.current.pause()
  }, [isPlaying, currentSong])

  useEffect(() => {
    if (audioRef.current && (progressFromSlider || progressFromSlider === 0)) {
      audioRef.current.currentTime = progressFromSlider
      setProgressStateFromSlider(null)
    }
  }, [progressFromSlider, setProgressStateFromSlider])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  function handleTimeUpdate() {
    if (audioRef.current?.currentTime) setProgressState(Math.floor(audioRef.current.currentTime))
  }

  function handleDurationChange() {
    if (audioRef.current?.duration) setDurationState(audioRef.current.duration)
  }

  function handleEndedSong() {
    if (hasNext) playNext()
    else setProgressState(0)
  }

  const showPlayList = () => {
    dispatchShowAudioPlayerModal(true)
    setIsPlaylistOpen(true)
  }

  const toggleCollapse = () => setIsCollapsed(!isCollapsed)

  if (!currentSong.src) return null

  const song: Song = {
    trackId: currentSong.trackId,
    src: currentSong.src,
    art: currentSong.art,
    title: currentSong.title,
    artist: currentSong.artist,
    isFavorite: currentSong.isFavorite,
  }

  return (
    <Container style={{ height: isCollapsed ? '60px' : '90px' }}>
      {!isCollapsed && (
        <TrackDetails>
          <ImageContainer>
            <Asset src={currentSong.art} />
          </ImageContainer>
          <Title>
            <h2 className="w-[150px] truncate font-medium text-white">{currentSong.title || 'Unknown Title'}</h2>
            <p className="w-[150px] truncate font-normal text-neutral-400">{currentSong.artist || 'Unknown artist'}</p>
          </Title>
          <FavoriteTrack />
        </TrackDetails>
      )}
      <BotttomPlayerTrackSlider song={song} playerClassNames="mr-12" />
      <TrackControls>
        <button aria-label="Playlist" className="flex h-10 w-10 items-center justify-end" onClick={showPlayList}>
          <Playlists fillColor="white" />
        </button>
        <div className="flex items-center gap-2">
          <VolumeOffIcon width={16} viewBox="-8 0 20 20" color="white" />
          <div className="">
            <Slider
              className="volume-slider w-[50px]"
              min={0}
              max={1}
              value={volume}
              onChange={value => setVolume(value)}
              step={0.1}
            />
          </div>
          <VolumeUpIcon width={16} color="white" className="ml-1" />
        </div>
        <IoIosArrowUp
          size={25}
          color="white"
          className="ml-2 hover:cursor-pointer"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        />
        <IoIosArrowDown
          size={25}
          color="white"
          className="ml-2 hover:cursor-pointer"
          onClick={toggleCollapse}
        />
      </TrackControls>
      <audio
        ref={audioRef}
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={handleEndedSong}
        className="h-0 w-0 opacity-0"
      />
    </Container>
  )
}

export default BottomAudioPlayer

const Container = tw.div`
  flex 
  justify-between
  items-center
  bg-neutral-900 
  h-[90px]
  mt-4
  transition-all duration-300
`

const TrackDetails = tw.div`
  flex
  items-center
`

const ImageContainer = tw.div`
  h-[120px]
  w-[120px]
`

const Title = tw.div`
  flex
  flex-col
  items-start
  mr-6
  ml-3
`

const TrackControls = tw.div`
  flex 
  items-center 
  mt-4 
  mr-4 
  justify-center 
  gap-2 
  h-full
`
