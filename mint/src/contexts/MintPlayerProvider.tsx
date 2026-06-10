import { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useStreamLogger } from 'hooks/useStreamLogger'

/**
 * MintPlayerProvider — one global <audio> for the whole mint app, so playback
 * survives navigation and a single persistent FooterPlayer can drive it (the
 * soundchain.io footer-player experience, ported to mint).
 *
 * Owns the OGUN stream-reward logging too: every IPFS play past 30s pays the
 * 70/30 split exactly once (useStreamLogger), so play surfaces don't each have
 * to wire it. marketplace / [id] / detail-modal all call toggle() instead of
 * managing their own Audio element.
 */
export interface PlayerTrack {
  id: string
  audioUrl: string
  title?: string
  artist?: string
  coverArtUrl?: string
}

interface PlayerContextValue {
  current: PlayerTrack | null
  playingId: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  toggle: (track: PlayerTrack) => void
  isActive: (id: string) => boolean
  seekToFraction: (frac: number) => void
  close: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function useMintPlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('useMintPlayer must be used inside MintPlayerProvider')
  return ctx
}

export function MintPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingIdRef = useRef<string | null>(null)
  const [current, setCurrent] = useState<PlayerTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const logger = useStreamLogger({
    onCreatorReward: (r, t) => toast.success(`+${r.toFixed(3)} OGUN → creator of "${t || 'track'}"`, { autoClose: 3500 }),
    onReward: (r) => toast.success(`+${r.toFixed(3)} OGUN earned for listening`, { autoClose: 3500 }),
  })

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio()
      a.addEventListener('play', () => setIsPlaying(true))
      a.addEventListener('pause', () => setIsPlaying(false))
      a.addEventListener('ended', () => {
        playingIdRef.current = null
        setIsPlaying(false)
      })
      a.addEventListener('loadedmetadata', () => setDuration(a.duration || 0))
      a.addEventListener('timeupdate', () => {
        setCurrentTime(a.currentTime)
        const tid = playingIdRef.current
        if (tid && a.currentTime >= 30) logger.logIfQualified(tid, Math.floor(a.currentTime))
      })
      audioRef.current = a
    }
    return audioRef.current
  }, [logger])

  const toggle = useCallback(
    (track: PlayerTrack) => {
      if (!track.audioUrl) return
      const a = ensureAudio()
      // Same track tapped → pause/resume.
      if (playingIdRef.current === track.id) {
        if (a.paused) a.play().catch(() => setIsPlaying(false))
        else a.pause()
        return
      }
      // New track → swap source + show it in the footer.
      a.src = track.audioUrl
      a.currentTime = 0
      setCurrentTime(0)
      setDuration(0)
      a.play().catch(() => setIsPlaying(false))
      playingIdRef.current = track.id
      setCurrent(track)
    },
    [ensureAudio]
  )

  const isActive = useCallback((id: string) => playingIdRef.current === id && isPlaying, [isPlaying])

  const seekToFraction = useCallback((frac: number) => {
    const a = audioRef.current
    if (a && a.duration) a.currentTime = Math.max(0, Math.min(1, frac)) * a.duration
  }, [])

  const close = useCallback(() => {
    const a = audioRef.current
    if (a) a.pause()
    playingIdRef.current = null
    setCurrent(null)
    setIsPlaying(false)
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        current,
        playingId: current?.id ?? null,
        isPlaying,
        currentTime,
        duration,
        toggle,
        isActive,
        seekToFraction,
        close,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}
