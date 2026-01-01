import { config } from 'config'
import Hls from 'hls.js'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useLogStream } from 'hooks/useLogStream'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import mux from 'mux-embed'
import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'

/**
 * Audio Normalization Settings
 * Target: -24 LUFS (broadcast standard for consistent loudness)
 *
 * Uses gain-based normalization only - NO compression.
 * Preserves the original dynamics of the audio while normalizing volume.
 *
 * -24 LUFS is approximately -24 dB relative to full scale.
 * Most commercial music is mastered around -14 to -8 LUFS.
 * We apply gain adjustment to bring typical music closer to -24 LUFS target.
 */
const NORMALIZATION_CONFIG = {
  // Target LUFS level (broadcast standard)
  targetLUFS: -24,
  // Assumed average loudness of uploaded music (most music is around -10 to -14 LUFS)
  assumedSourceLUFS: -12,
  // Calculated gain: difference between target and assumed source
  // -24 - (-12) = -12 dB = 10^(-12/20) = 0.25 linear gain
  // However, this might be too quiet, so we use a moderate adjustment
  // targeting a reduction that brings loud tracks down without killing quiet ones
  normalizationGain: 1.0,  // Full volume (no reduction)
}

/**
 * AudioEngine - Single audio element for the entire app
 * This component manages the actual <audio> element, HLS streaming,
 * and audio normalization via Web Audio API.
 * It should only be mounted ONCE in the app to prevent echo/duplicate audio.
 */
export const AudioEngine = () => {
  const me = useMe()
  const { account: walletAddress } = useMagicContext()
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  // Web Audio API refs for normalization (gain only, no compression)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const isAudioGraphConnected = useRef(false)

  // Stream logging for OGUN rewards
  const { logStream, startTracking, stopTracking } = useLogStream({
    minDuration: 30, // 30 seconds minimum to count as stream
    onReward: (reward) => {
      if (reward > 0) {
        toast.success(`+${reward.toFixed(2)} OGUN earned!`, {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: true,
        })
      }
    },
    onDailyLimitReached: () => {
      toast.info('Daily OGUN limit reached for this track', {
        position: 'bottom-right',
        autoClose: 3000,
      })
    },
  })
  // Track previous song to log streams when song changes
  const previousSongRef = useRef<{ trackId: string; playStartTime: number } | null>(null)

  const {
    currentSong,
    isPlaying,
    progressFromSlider,
    hasNext,
    volume,
    playNext,
    setPlayingState,
    setDurationState,
    setProgressState,
    setProgressStateFromSlider,
  } = useAudioPlayerContext()

  // Setup Media Session API for CarPlay/external device metadata
  const updateMediaSession = useCallback(() => {
    if ('mediaSession' in navigator && currentSong.src) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: currentSong.artist || 'Unknown Artist',
        album: 'SoundChain',
        artwork: currentSong.art
          ? [
              { src: currentSong.art, sizes: '96x96', type: 'image/jpeg' },
              { src: currentSong.art, sizes: '128x128', type: 'image/jpeg' },
              { src: currentSong.art, sizes: '192x192', type: 'image/jpeg' },
              { src: currentSong.art, sizes: '256x256', type: 'image/jpeg' },
              { src: currentSong.art, sizes: '384x384', type: 'image/jpeg' },
              { src: currentSong.art, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      })
    }
  }, [currentSong.art, currentSong.artist, currentSong.src, currentSong.title])

  /**
   * Check if user is likely using external audio (CarPlay, Bluetooth, AirPlay)
   * In these cases, we skip Web Audio API to ensure audio routes correctly
   */
  const isExternalAudioOutput = useCallback(() => {
    // Check for iOS/Safari which commonly use CarPlay
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    // If on mobile Safari (likely CarPlay capable), skip Web Audio API
    // This ensures audio routes through system audio path for CarPlay
    if (isIOS || isSafari) {
      return true
    }

    return false
  }, [])

  /**
   * Initialize Web Audio API graph for audio normalization
   * Chain: AudioElement -> MediaElementSource -> Gain -> Destination
   *
   * Uses gain-only normalization (NO compression) to preserve original dynamics
   * while targeting -24 LUFS output level
   *
   * IMPORTANT: Disabled for iOS/Safari to ensure CarPlay compatibility
   * Web Audio API can interfere with external audio routing (CarPlay, AirPlay, Bluetooth)
   */
  const initializeAudioGraph = useCallback(() => {
    if (!audioRef.current || isAudioGraphConnected.current) return

    // Skip Web Audio API for external audio devices (CarPlay, AirPlay, Bluetooth)
    // This ensures audio routes through the standard system path
    if (isExternalAudioOutput()) {
      console.log('External audio detected (iOS/Safari) - using native volume for CarPlay/AirPlay compatibility')
      // Just set the audio element volume directly for normalization effect
      if (audioRef.current) {
        audioRef.current.volume = NORMALIZATION_CONFIG.normalizationGain
      }
      return
    }

    try {
      // Create AudioContext (handles Safari prefix)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported - playing without normalization')
        return
      }

      audioContextRef.current = new AudioContextClass()
      const ctx = audioContextRef.current

      // Create source from audio element
      sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current)

      // Create gain node for volume normalization (no compression - preserves dynamics)
      gainNodeRef.current = ctx.createGain()
      gainNodeRef.current.gain.setValueAtTime(NORMALIZATION_CONFIG.normalizationGain, ctx.currentTime)

      // Connect the audio graph: source -> gain -> destination
      // No compressor in chain - full dynamics preserved
      sourceNodeRef.current.connect(gainNodeRef.current)
      gainNodeRef.current.connect(ctx.destination)

      isAudioGraphConnected.current = true
      console.log('Audio normalization initialized (-24 LUFS target, dynamics preserved)')
    } catch (error) {
      console.warn('Failed to initialize audio normalization:', error)
    }
  }, [isExternalAudioOutput])

  // Resume AudioContext on user interaction (required by browsers)
  const resumeAudioContext = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  // Setup HLS and audio source
  useEffect(() => {
    if (!audioRef.current || !currentSong.src) return

    // EXTERNAL TRACK DETECTION: If src starts with EXTERNAL:, dispatch event and skip audio loading
    // External tracks (YouTube, Spotify, etc.) need iframe embeds, not audio element
    if (currentSong.src.startsWith('EXTERNAL:')) {
      console.log('[AudioEngine] External track detected, dispatching event:', currentSong.src)
      // Parse the external URL: format is "EXTERNAL:sourceType:url"
      const parts = currentSong.src.split(':')
      const sourceType = parts[1]
      const externalUrl = parts.slice(2).join(':') // Rejoin in case URL has colons

      // Dispatch custom event for playlist components to handle
      window.dispatchEvent(new CustomEvent('externalTrackPlay', {
        detail: {
          trackId: currentSong.trackId,
          sourceType,
          externalUrl,
          title: currentSong.title,
          artist: currentSong.artist,
          art: currentSong.art,
        }
      }))

      // Don't try to load external URL as audio
      return
    }

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const audio = audioRef.current
    const isHlsStream = currentSong.src.includes('.m3u8')

    if (isHlsStream) {
      // HLS stream (Mux legacy URLs)
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari, iOS)
        audio.src = currentSong.src
      } else if (Hls.isSupported()) {
        // Use hls.js for other browsers
        hlsRef.current = new Hls()
        hlsRef.current.loadSource(currentSong.src)
        hlsRef.current.attachMedia(audio)
      }
    } else {
      // Direct audio file (IPFS/Pinata URLs - MP3, WAV, etc.)
      // These don't need HLS processing, just set the src directly
      audio.src = currentSong.src
    }

    // MUX analytics
    mux.monitor(audio, {
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

    // Update Media Session metadata for CarPlay
    updateMediaSession()

    // Initialize audio normalization graph on first song load
    initializeAudioGraph()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [currentSong, me?.id, updateMediaSession, initializeAudioGraph])

  // OGUN Stream Logging - Track song changes and log streams
  useEffect(() => {
    if (!currentSong.trackId) return

    // When song changes, log the previous song's stream
    if (previousSongRef.current && previousSongRef.current.trackId !== currentSong.trackId) {
      const prevTrackId = previousSongRef.current.trackId
      const playDuration = Math.floor((Date.now() - previousSongRef.current.playStartTime) / 1000)

      // Only log if played for at least 30 seconds
      if (playDuration >= 30) {
        logStream(prevTrackId, playDuration, walletAddress || undefined)
          .catch(err => console.warn('[OGUN] Failed to log stream:', err))
      }
    }

    // Start tracking new song
    previousSongRef.current = {
      trackId: currentSong.trackId,
      playStartTime: Date.now(),
    }
    startTracking(currentSong.trackId)
  }, [currentSong.trackId, logStream, startTracking, walletAddress])

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      // Resume AudioContext if suspended (required for Web Audio after user interaction)
      resumeAudioContext()
      audioRef.current.play().catch((err) => {
        // Log errors for debugging (CORS, network, autoplay restrictions)
        console.error('Audio playback failed:', err.message, '- Source:', currentSong.src)
        setPlayingState(false)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, currentSong, setPlayingState, resumeAudioContext])

  // Handle seeking from slider
  useEffect(() => {
    if (audioRef.current && (progressFromSlider || progressFromSlider === 0)) {
      audioRef.current.currentTime = progressFromSlider
      setProgressStateFromSlider(null)
    }
  }, [progressFromSlider, setProgressStateFromSlider])

  // Handle volume changes - apply to gain node for normalized output
  useEffect(() => {
    // For iOS/Safari (CarPlay, AirPlay, wearables) - use native volume
    if (isExternalAudioOutput()) {
      if (audioRef.current) {
        // Apply normalization gain + user volume directly to audio element
        audioRef.current.volume = volume * NORMALIZATION_CONFIG.normalizationGain
      }
    } else if (gainNodeRef.current && audioContextRef.current) {
      // Web Audio API path (desktop browsers)
      const finalGain = volume * NORMALIZATION_CONFIG.normalizationGain
      gainNodeRef.current.gain.setValueAtTime(finalGain, audioContextRef.current.currentTime)
    } else if (audioRef.current) {
      // Fallback if Web Audio API not available
      audioRef.current.volume = volume
    }
  }, [volume, isExternalAudioOutput])

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
        sourceNodeRef.current = null
        gainNodeRef.current = null
        isAudioGraphConnected.current = false
      }
    }
  }, [])

  // Setup Media Session action handlers for CarPlay controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        setPlayingState(true)
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        setPlayingState(false)
      })
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (hasNext) playNext()
      })
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        // Restart current track or go to previous
        if (audioRef.current) {
          audioRef.current.currentTime = 0
        }
      })
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime
          setProgressState(Math.floor(details.seekTime))
        }
      })
    }
  }, [hasNext, playNext, setPlayingState, setProgressState])

  // Prevent playback interruption on device rotation / visibility changes / app switching
  useEffect(() => {
    let wasPlayingBeforeHidden = false
    let backgroundResumeInterval: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (user switched apps) - remember if we were playing
        wasPlayingBeforeHidden = isPlaying

        // Start aggressive background resume attempts for mobile
        if (isPlaying && audioRef.current) {
          // Try to keep playing in background - some browsers allow this
          backgroundResumeInterval = setInterval(() => {
            if (audioRef.current?.paused && wasPlayingBeforeHidden) {
              audioRef.current.play().catch(() => {})
            }
          }, 1000)
        }
      } else {
        // Page is visible again - clear interval and resume
        if (backgroundResumeInterval) {
          clearInterval(backgroundResumeInterval)
          backgroundResumeInterval = null
        }

        // Resume playback if we were playing before
        if (wasPlayingBeforeHidden && audioRef.current) {
          // Small delay to let the browser settle
          setTimeout(() => {
            if (audioRef.current?.paused && wasPlayingBeforeHidden) {
              audioRef.current.play().catch(() => {})
            }
          }, 100)
        }
      }
    }

    const handleOrientationChange = () => {
      // Device rotated - ensure playback continues
      if (isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {})
      }
    }

    // Handle unexpected pauses (browser pausing audio in background)
    const handleUnexpectedPause = () => {
      // If we're supposed to be playing but got paused, try to resume
      if (isPlaying && audioRef.current?.paused) {
        // Small delay before retrying
        setTimeout(() => {
          if (isPlaying && audioRef.current?.paused) {
            audioRef.current.play().catch(() => {})
          }
        }, 100)
      }
    }

    // Listen for blur/focus events (more reliable than visibility on some devices)
    const handleWindowBlur = () => {
      wasPlayingBeforeHidden = isPlaying
    }

    const handleWindowFocus = () => {
      if (wasPlayingBeforeHidden && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    // Listen for pause events on the audio element itself
    if (audioRef.current) {
      audioRef.current.addEventListener('pause', handleUnexpectedPause)
    }

    return () => {
      if (backgroundResumeInterval) {
        clearInterval(backgroundResumeInterval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      if (audioRef.current) {
        audioRef.current.removeEventListener('pause', handleUnexpectedPause)
      }
    }
  }, [isPlaying])

  function handleTimeUpdate() {
    if (audioRef.current?.currentTime) {
      setProgressState(Math.floor(audioRef.current.currentTime))

      // Update Media Session position state for CarPlay progress bar
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate,
            position: audioRef.current.currentTime,
          })
        } catch (e) {
          // Ignore errors from setPositionState
        }
      }
    }
  }

  function handleDurationChange() {
    if (audioRef.current?.duration) {
      setDurationState(audioRef.current.duration)
    }
  }

  function handleEndedSong() {
    // Log stream for OGUN rewards when song ends naturally
    if (previousSongRef.current && currentSong.trackId) {
      const playDuration = Math.floor((Date.now() - previousSongRef.current.playStartTime) / 1000)
      if (playDuration >= 30) {
        logStream(currentSong.trackId, playDuration, walletAddress || undefined)
          .catch(err => console.warn('[OGUN] Failed to log stream on end:', err))
      }
      // Reset tracking since song completed
      previousSongRef.current = null
    }

    if (hasNext) {
      playNext()
    } else {
      setProgressState(0)
    }
  }

  return (
    <audio
      ref={audioRef}
      onPlay={() => setPlayingState(true)}
      onPause={() => setPlayingState(false)}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleDurationChange}
      onEnded={handleEndedSong}
      className="h-0 w-0 opacity-0"
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      // iOS background playback attributes
      // @ts-ignore - webkit specific attributes
      webkit-playsinline="true"
      x-webkit-airplay="allow"
    />
  )
}

export default AudioEngine
