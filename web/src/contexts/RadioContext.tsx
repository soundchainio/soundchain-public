/**
 * Global Radio Context — Persists OGUN Radio playback across page navigation
 *
 * The audio element lives here in the provider (mounted in _app.tsx),
 * so it never unmounts when users navigate between pages.
 * The /radio page shows the full UI; other pages show a MiniRadioBar.
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'

export interface RadioTrack {
  id: string
  title: string
  artist: string
  artwork_url?: string
  stream_url?: string
  genres?: string[]
  is_nft?: boolean
  scid?: string
  plays?: number
  total_tracks?: number
}

interface RadioState {
  currentTrack: RadioTrack | null
  isPlaying: boolean
  isLoading: boolean
  volume: number
  isMuted: boolean
  progress: number
  duration: number
  queueLength: number
  totalTracks: number
  error: string | null
  selectedGenre: string
  availableGenres: { key: string; label: string; count: number }[]
  genreTrackCount: number
}

interface RadioActions {
  play: () => void
  pause: () => void
  togglePlay: () => void
  skipToNext: () => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  setSelectedGenre: (g: string) => void
  startRadio: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
}

type RadioContextType = RadioState & RadioActions

const RadioContext = createContext<RadioContextType | null>(null)

export function useRadio() {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error('useRadio must be used within RadioProvider')
  return ctx
}

export function useRadioOptional() {
  return useContext(RadioContext)
}

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [isMuted, setMutedState] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queueLength, setQueueLength] = useState(0)
  const [totalTracks, setTotalTracks] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [availableGenres, setAvailableGenres] = useState<{ key: string; label: string; count: number }[]>([])
  const [genreTrackCount, setGenreTrackCount] = useState(0)
  const [started, setStarted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchTrack = useCallback(async (genre?: string) => {
    try {
      const g = genre || selectedGenre
      const url = g && g !== 'all' ? `/api/agent/radio?genre=${g}` : '/api/agent/radio'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success && data.data?.now_playing) {
        setCurrentTrack(data.data.now_playing)
        setQueueLength(data.data.queue_length || 0)
        setTotalTracks(data.data.total_tracks || data.data.queue_length || 0)
        if (data.data.available_genres) setAvailableGenres(data.data.available_genres)
        if (data.data.genre_track_count !== undefined) setGenreTrackCount(data.data.genre_track_count)
        setError(null)
      } else {
        setError('No tracks available')
      }
    } catch {
      setError('Failed to connect to OGUN Radio')
    } finally {
      setIsLoading(false)
    }
  }, [selectedGenre])

  // When track changes, update audio source
  useEffect(() => {
    if (!audioRef.current || !currentTrack?.stream_url) return
    const audio = audioRef.current
    if (audio.src !== currentTrack.stream_url) {
      audio.src = currentTrack.stream_url
      if (started) {
        audio.addEventListener('canplay', () => {
          audio.play().catch(() => {})
        }, { once: true })
        audio.load()
      }
    }
  }, [currentTrack?.stream_url, started])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => setError('Playback failed'))
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause()
  }, [])

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack?.stream_url) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => setError('Playback failed'))
    }
  }, [isPlaying, currentTrack?.stream_url])

  const skipToNext = useCallback(() => {
    setIsLoading(true)
    fetchTrack()
  }, [fetchTrack])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
  }, [])

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m)
  }, [])

  const startRadio = useCallback(() => {
    if (!started) {
      setStarted(true)
      setIsLoading(true)
      fetchTrack()
    }
  }, [started, fetchTrack])

  const handleGenreChange = useCallback((g: string) => {
    setSelectedGenre(g)
    setIsLoading(true)
    fetchTrack(g)
  }, [fetchTrack])

  // Audio event handlers — throttle timeupdate to prevent re-render storm
  const lastTimeUpdate = useRef(0)
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    const now = Date.now()
    if (now - lastTimeUpdate.current < 1000) return // Max 1 update/sec
    lastTimeUpdate.current = now
    setProgress(audioRef.current.currentTime)
    setDuration(audioRef.current.duration || 0)
  }, [])

  const handlePlay = useCallback(() => setIsPlaying(true), [])
  const handlePause = useCallback(() => setIsPlaying(false), [])
  const handleEnded = useCallback(() => {
    // Auto-skip to next track
    fetchTrack()
  }, [fetchTrack])

  const value: RadioContextType = useMemo(() => ({
    currentTrack,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    progress,
    duration,
    queueLength,
    totalTracks,
    error,
    selectedGenre,
    availableGenres,
    genreTrackCount,
    play,
    pause,
    togglePlay,
    skipToNext,
    setVolume,
    setMuted,
    setSelectedGenre: handleGenreChange,
    startRadio,
    audioRef,
  }), [currentTrack, isPlaying, isLoading, volume, isMuted, progress, duration, queueLength, totalTracks, error, selectedGenre, availableGenres, genreTrackCount, play, pause, togglePlay, skipToNext, setVolume, setMuted, handleGenreChange, startRadio])

  return (
    <RadioContext.Provider value={value}>
      {children}
      {/* Global audio element — never unmounts */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={() => {
          // Auto-skip on error
          if (started) fetchTrack()
        }}
        preload="auto"
        style={{ display: 'none' }}
      />
    </RadioContext.Provider>
  )
}
