import { useEffect, useRef, useState } from 'react'

import Hls from 'hls.js'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Info } from 'icons/Info'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import Link from 'next/link'
import { remainingTime, timeFromSecs } from 'utils/calculateTime'

import { AudioSlider } from 'components/ui/audio-slider'

import Asset from './Asset/Asset'

export interface Song {
  src: string
  title?: string | null
  trackId?: string
  artist?: string | null
  art?: string | null
  isFavorite?: boolean | null
}

export const AudioPlayer = ({ src, title, artist, art, trackId }: Song) => {
  const [playing, setPlaying] = useState<boolean>(false)
  const [playState, setPlayState] = useState<number>(0)
  const [duration, setDuration] = useState<number>()
  const audioRef = useRef<HTMLAudioElement>(null)
  const { isPlaying: isBottomPlayerPlaying, togglePlay: pauseBottomPlayer } = useAudioPlayerContext()

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      isBottomPlayerPlaying && pauseBottomPlayer()
      audioRef.current?.play()
      setPlaying(true)
    }
  }

  // Called only when user releases the slider - this is when we actually seek
  const onSliderCommit = (value: number) => {
    setPlayState(value)
    if (audioRef.current) {
      audioRef.current.currentTime = value
    }
  }

  useEffect(() => {
    let hls: Hls
    let audioEl: HTMLAudioElement | null = null
    const handleTimeUpdate = () => {
      if (audioEl) setPlayState(Math.floor(audioEl.currentTime))
    }
    const handleEnded = () => {
      setPlayState(0)
      setPlaying(false)
    }

    if (audioRef.current) {
      audioEl = audioRef.current
      const audio = audioEl

      if (src.startsWith('blob:') || audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src
      } else if (Hls.isSupported()) {
        hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(audio)
      }


      audio.onloadedmetadata = function () {
        if (audio) setDuration(audio.duration)
      }

      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
      if (audioEl) {
        audioEl.removeEventListener('timeupdate', handleTimeUpdate)
        audioEl.removeEventListener('ended', handleEnded)
      }
    }
    // TODO: Fix this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return (
    <div className="items-center rounded-lg bg-black p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-20 items-center">
          <Asset src={art} sizes="5rem" />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex gap-2">
            <div className="flex items-center">
              <button
                className="flex h-8 w-8 items-center rounded-full bg-white"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <Pause className="m-auto scale-125 text-white" />
                ) : (
                  <Play className="m-auto scale-125 text-white" />
                )}
              </button>
            </div>
            <Link href={trackId ? `/tracks/${trackId}` : '#'} passHref>
              <div className={`flex w-full ${trackId && 'cursor-pointer'}`}>
                <div>
                  <div className="text-xs font-black text-white">
                    <div>{title ? title : 'Unknown Title'}</div>
                  </div>
                  {artist && <div className="text-xs font-black text-gray-80">{artist}</div>}
                </div>
                {trackId && (
                  <div className="ml-auto">
                    <Info />
                  </div>
                )}
              </div>
            </Link>
          </div>
          <div className="mt-2 flex flex-col text-white">
            <AudioSlider className="audio-player ml-1" min={0} max={duration} value={playState} onCommit={onSliderCommit} />
            <div className="mt-2 flex text-xs text-gray-80">
              <div className="flex-1">{timeFromSecs(playState || 0)}</div>
              <div className="flex-1 text-right">{remainingTime(playState, duration || 0)} </div>
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} className="h-0 w-0 opacity-0" />
    </div>
  )
}
