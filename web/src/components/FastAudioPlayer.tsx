import { useEffect, useRef, memo, useReducer } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react'

interface FastAudioPlayerProps {
  src: string
  className?: string
  loop?: boolean
  autoplay?: boolean
  compact?: boolean // For grid view
  onPlay?: () => void
  onPause?: () => void
}

// State machine for audio player - single source of truth
type PlayerState = 'loading' | 'ready' | 'playing' | 'error'

interface AudioState {
  status: PlayerState
  progress: number
  duration: number
  muted: number // 0 = muted, 1 = unmuted (using number avoids boolean)
  retries: number
  errorMsg: string
}

type AudioAction =
  | { type: 'LOAD_START' }
  | { type: 'READY'; duration: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'ERROR'; msg: string }
  | { type: 'RETRY' }
  | { type: 'PROGRESS'; value: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SEEK'; value: number }

const initialState: AudioState = {
  status: 'loading',
  progress: 0,
  duration: 0,
  muted: 1, // 1 = unmuted
  retries: 0,
  errorMsg: '',
}

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading', errorMsg: '' }
    case 'READY':
      return { ...state, status: 'ready', duration: action.duration, errorMsg: '' }
    case 'PLAY':
      return { ...state, status: 'playing' }
    case 'PAUSE':
      return { ...state, status: 'ready' }
    case 'ERROR':
      return { ...state, status: 'error', errorMsg: action.msg }
    case 'RETRY':
      return { ...state, status: 'loading', retries: state.retries + 1 }
    case 'PROGRESS':
      return { ...state, progress: action.value }
    case 'TOGGLE_MUTE':
      return { ...state, muted: state.muted === 1 ? 0 : 1 }
    case 'SEEK':
      return { ...state, progress: action.value }
    default:
      return state
  }
}

/**
 * FastAudioPlayer - Lightning-fast audio playback component
 *
 * Uses state machine pattern instead of booleans for cleaner, more predictable state management.
 * Single source of truth prevents impossible state combinations.
 */
export const FastAudioPlayer = memo(({
  src,
  className = '',
  loop = true,
  autoplay = false,
  compact = false,
  onPlay,
  onPause,
}: FastAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [state, dispatch] = useReducer(audioReducer, initialState)

  // Preload audio on mount
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Start loading immediately
    audio.load()

    const handleCanPlayThrough = () => {
      console.log('[FastAudio] Ready to play:', src.substring(0, 50))
      dispatch({ type: 'READY', duration: audio.duration })
    }

    const handleLoadStart = () => {
      console.log('[FastAudio] Loading started:', src.substring(0, 50))
      dispatch({ type: 'LOAD_START' })
    }

    const handleProgress = () => {
      // Audio is buffering - log progress
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
        const dur = audio.duration
        if (dur > 0) {
          console.log(`[FastAudio] Buffered: ${Math.round((bufferedEnd / dur) * 100)}%`)
        }
      }
    }

    const handleError = () => {
      console.error('[FastAudio] Error loading audio')
      // Retry up to 3 times with exponential backoff
      if (state.retries < 3) {
        console.log(`[FastAudio] Retrying... (${state.retries + 1}/3)`)
        dispatch({ type: 'RETRY' })
        setTimeout(() => audio.load(), 1000 * (state.retries + 1))
      } else {
        dispatch({ type: 'ERROR', msg: 'Failed to load audio' })
      }
    }

    const handleLoadedMetadata = () => {
      dispatch({ type: 'READY', duration: audio.duration })
    }

    const handleTimeUpdate = () => {
      if (audio.duration > 0) {
        dispatch({ type: 'PROGRESS', value: (audio.currentTime / audio.duration) * 100 })
      }
    }

    const handlePlay = () => {
      dispatch({ type: 'PLAY' })
      onPlay?.()
    }

    const handlePause = () => {
      dispatch({ type: 'PAUSE' })
      onPause?.()
    }

    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('progress', handleProgress)
    audio.addEventListener('error', handleError)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('progress', handleProgress)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [src, state.retries, onPlay, onPause])

  // Autoplay when ready
  useEffect(() => {
    if (autoplay && state.status === 'ready' && audioRef.current) {
      audioRef.current.play().catch(console.error)
    }
  }, [autoplay, state.status])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (state.status === 'playing') {
      audio.pause()
    } else {
      audio.play().catch(console.error)
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = state.muted === 1 // Will toggle to opposite
    dispatch({ type: 'TOGGLE_MUTE' })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !state.duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audio.currentTime = percentage * state.duration
  }

  // Compact view for grid
  if (compact) {
    return (
      <div className={`relative flex flex-col items-center justify-center ${className}`}>
        {/* Hidden audio element with preload */}
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          loop={loop}
          crossOrigin="anonymous"
        />

        {/* Audio visualizer aesthetic */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.2),transparent_70%)] ${state.status === 'playing' ? 'animate-pulse' : ''}`} />
        </div>

        {/* Audio icon */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mb-2">
          <span className="text-3xl">🎵</span>
        </div>

        {/* Play/Pause/Loading button */}
        <button
          onClick={togglePlay}
          disabled={state.status === 'loading' || state.status === 'error'}
          className="relative z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all disabled:opacity-50"
        >
          {state.status === 'loading' ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : state.status === 'error' ? (
            <span className="text-red-400 text-xs">Error</span>
          ) : state.status === 'playing' ? (
            <Pause className="w-5 h-5 text-white" fill="white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          )}
        </button>

        {/* Status label */}
        <span className="relative z-10 mt-2 text-xs text-white/70">
          {state.status === 'loading' ? 'Loading...' : state.status === 'error' ? 'Failed' : `Tap to ${state.status === 'playing' ? 'pause' : 'play'}`}
        </span>
      </div>
    )
  }

  // Full player view
  return (
    <div className={`p-4 flex flex-col gap-3 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg ${className}`}>
      {/* Hidden audio element with preload */}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        loop={loop}
        crossOrigin="anonymous"
      />

      <div className="flex items-center gap-3">
        {/* Audio icon */}
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🎵</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Controls row */}
          <div className="flex items-center gap-2 mb-2">
            {/* Play/Pause button */}
            <button
              onClick={togglePlay}
              disabled={state.status === 'loading' || state.status === 'error'}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {state.status === 'loading' ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : state.status === 'error' ? (
                <span className="text-red-400 text-lg">!</span>
              ) : state.status === 'playing' ? (
                <Pause className="w-5 h-5 text-white" fill="white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              )}
            </button>

            {/* Mute button */}
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              {state.muted === 0 ? (
                <VolumeX className="w-4 h-4 text-white/70" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Time display */}
            <span className="text-xs text-white/60 font-mono">
              {formatTime((state.progress / 100) * state.duration)} / {formatTime(state.duration || 0)}
            </span>

            {/* Status indicator based on single state */}
            {state.status === 'loading' && (
              <span className="text-xs text-cyan-400 animate-pulse">Loading...</span>
            )}
            {state.status === 'error' && (
              <span className="text-xs text-red-400">{state.errorMsg}</span>
            )}
            {state.status === 'ready' && (
              <span className="text-xs text-green-400">Ready</span>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

FastAudioPlayer.displayName = 'FastAudioPlayer'
