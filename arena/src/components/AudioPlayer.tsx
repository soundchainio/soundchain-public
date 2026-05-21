/**
 * Arena AudioPlayer — minimal stub of the soundchain.io AudioPlayer.
 *
 * The full music-platform AudioPlayer (web/src/components/AudioPlayer.tsx)
 * carries HLS streaming, Magic auth, useLogStream telemetry, and OGUN reward
 * toasts — all of which are music-platform concerns that don't belong in arena.
 *
 * Arena's NFT-card inline-playback inside the Gym only needs a basic HTML5
 * audio element with title/artist labels. That's this.
 */

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

export interface Song {
  src: string
  title: string
  artist: string
  art?: string
  trackId?: string
}

export const AudioPlayer = ({ src, title, artist, art }: Song) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => setPlaying(false)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play().catch(() => {}) } else { a.pause() }
  }

  return (
    <div className="flex items-center gap-3 w-full">
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt={title} className="w-12 h-12 rounded object-cover flex-shrink-0" />
      )}
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full bg-arena-red text-white flex items-center justify-center flex-shrink-0 hover:opacity-90 transition"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-mono text-white truncate">{title}</div>
        <div className="text-[10px] font-mono text-gray-400 truncate">{artist}</div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
    </div>
  )
}
