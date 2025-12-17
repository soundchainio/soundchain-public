import { useEffect, useRef, useState, memo } from 'react'
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

/**
 * FastAudioPlayer - Lightning-fast audio playback component
 *
 * Optimizations:
 * - preload="auto" for immediate buffering
 * - Loading state with spinner
 * - canplaythrough event for ready state
 * - Retry logic for failed loads
 * - Progress bar for visual feedback
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Preload audio on mount
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Start loading immediately
    audio.load()

    const handleCanPlayThrough = () => {
      console.log('[FastAudio] Ready to play:', src.substring(0, 50))
      setIsLoading(false)
      setIsReady(true)
      setError(null)
    }

    const handleLoadStart = () => {
      console.log('[FastAudio] Loading started:', src.substring(0, 50))
      setIsLoading(true)
    }

    const handleProgress = () => {
      // Audio is buffering
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
        const duration = audio.duration
        if (duration > 0) {
          console.log(`[FastAudio] Buffered: ${Math.round((bufferedEnd / duration) * 100)}%`)
        }
      }
    }

    const handleError = (e: Event) => {
      console.error('[FastAudio] Error loading audio:', e)
      setIsLoading(false)

      // Retry up to 3 times
      if (retryCount < 3) {
        console.log(`[FastAudio] Retrying... (${retryCount + 1}/3)`)
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          audio.load()
        }, 1000 * (retryCount + 1)) // Exponential backoff
      } else {
        setError('Failed to load audio')
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
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
  }, [src, retryCount, onPlay, onPause])

  // Autoplay when ready
  useEffect(() => {
    if (autoplay && isReady && audioRef.current) {
      audioRef.current.play().catch(console.error)
    }
  }, [autoplay, isReady])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(console.error)
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !audio.muted
    setIsMuted(!isMuted)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audio.currentTime = percentage * duration
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
          <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.2),transparent_70%)] ${isPlaying ? 'animate-pulse' : ''}`} />
        </div>

        {/* Audio icon */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mb-2">
          <span className="text-3xl">🎵</span>
        </div>

        {/* Play/Pause/Loading button */}
        <button
          onClick={togglePlay}
          disabled={isLoading || !!error}
          className="relative z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : error ? (
            <span className="text-red-400 text-xs">Error</span>
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-white" fill="white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          )}
        </button>

        {/* Status label */}
        <span className="relative z-10 mt-2 text-xs text-white/70">
          {isLoading ? 'Loading...' : error ? 'Failed' : `Tap to ${isPlaying ? 'pause' : 'play'}`}
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
              disabled={isLoading || !!error}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : error ? (
                <span className="text-red-400 text-lg">!</span>
              ) : isPlaying ? (
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
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/70" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Time display */}
            <span className="text-xs text-white/60 font-mono">
              {formatTime((progress / 100) * duration)} / {formatTime(duration || 0)}
            </span>

            {/* Status indicator */}
            {isLoading && (
              <span className="text-xs text-cyan-400 animate-pulse">Loading...</span>
            )}
            {error && (
              <span className="text-xs text-red-400">{error}</span>
            )}
            {isReady && !isPlaying && !isLoading && (
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
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

FastAudioPlayer.displayName = 'FastAudioPlayer'
