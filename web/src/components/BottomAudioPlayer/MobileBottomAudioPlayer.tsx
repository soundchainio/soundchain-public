import { Slider } from '@reach/slider'
import { config } from 'config'
import { useModalDispatch } from 'contexts/providers/modal'
import Hls from 'hls.js'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useMe } from 'hooks/useMe'
import { Pause } from 'icons/PauseBottomAudioPlayer'
import { Play } from 'icons/PlayBottomAudioPlayer'
import mux from 'mux-embed'
import { useEffect, useRef } from 'react'
import Asset from 'components/Asset'
import tw from 'tailwind-styled-components'
import { VolumeOffIcon, VolumeUpIcon } from '@heroicons/react/solid'
import { IoIosArrowUp } from 'react-icons/io'
import { Playlists } from 'icons/Playlists'
import { BotttomPlayerTrackSlider } from './components/BotttomPlayerTrackSlider'
import { Ellipsis } from 'icons/Ellipsis'

export const BottomAudioPlayer = () => {
  const me = useMe()
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    currentSong,
    isPlaying,
    duration,
    progress,
    setVolume,
    progressFromSlider,
    hasNext,
    volume,
    togglePlay,
    playNext,
    setPlayingState,
    setDurationState,
    setProgressState,
    setProgressStateFromSlider,
  } = useAudioPlayerContext()
  const { dispatchShowAudioPlayerModal } = useModalDispatch()

  useEffect(() => {
    if (!audioRef.current || !currentSong.src) {
      return
    }

    let hls: Hls

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
      if (hls) {
        hls.destroy()
      }
    }
  }, [currentSong, me?.id])

  useEffect(() => {
    if (!audioRef.current) {
      return
    }
    if (isPlaying) {
      audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, currentSong])

  useEffect(() => {
    if (audioRef.current && (progressFromSlider || progressFromSlider === 0)) {
      audioRef.current.currentTime = progressFromSlider
      setProgressStateFromSlider(null)
    }
  }, [progressFromSlider, setProgressStateFromSlider])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  function handleTimeUpdate() {
    if (audioRef?.current?.currentTime) {
      setProgressState(Math.floor(audioRef.current.currentTime))
    }
  }

  function handleDurationChange() {
    if (audioRef.current && audioRef.current.duration) {
      setDurationState(audioRef.current.duration)
    }
  }

  function handleEndedSong() {
    if (hasNext) {
      playNext()
    } else {
      setProgressState(0)
    }
  }

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value)
  }

  if (!currentSong.src) {
    return null
  }

  const song: Song = {
    trackId: currentSong.trackId,
    src: currentSong.src,
    art: currentSong.art,
    title: currentSong.title,
    artist: currentSong.artist,
    isFavorite: currentSong.isFavorite,
  }

  return (
    <div className="flex flex-col gap-2 bg-neutral-900 py-2">
      <div className="flex justify-between px-2">
        <button className="flex min-w-0 flex-1 items-center gap-2" aria-label="Open audio player controls">
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center bg-gray-80">
            <Asset src={currentSong.art} sizes="2.5rem" />
          </div>
          <div className="flex flex-col items-start text-xs text-white">
            <h3 className="w-[50px] truncate font-black">{currentSong.title || 'Unknown title'}</h3>
            <p className="ml-1 w-[50px] truncate font-medium">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <Ellipsis className="mr-2 h-[5px] cursor-pointer" fill="#808080" />
          <BotttomPlayerTrackSlider song={song} hideShuffle hideSlider />

          <IoIosArrowUp
            size={25}
            color="white"
            className="mr-2 hover:cursor-pointer"
            onClick={() => dispatchShowAudioPlayerModal(true)}
          />
        </div>
      </div>

      <Slider
        className="audio-player mx-4 my-2 w-[200px]"
        min={0}
        max={duration}
        value={progress}
        onChange={onSliderChange}
      />
      <audio
        ref={audioRef}
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={handleEndedSong}
        className="h-0 w-0 opacity-0"
      />
    </div>
  )
}

export default BottomAudioPlayer
