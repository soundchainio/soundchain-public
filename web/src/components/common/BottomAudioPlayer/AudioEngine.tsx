import { config } from 'config'
import Hls from 'hls.js'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useMe } from 'hooks/useMe'
import mux from 'mux-embed'
import { useEffect, useRef, useCallback } from 'react'

/**
 * AudioEngine - Single audio element for the entire app
 * This component manages the actual <audio> element and HLS streaming.
 * It should only be mounted ONCE in the app to prevent echo/duplicate audio.
 */
export const AudioEngine = () => {
  const me = useMe()
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef = useRef<Hls | null>(null)
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

  // Setup HLS and audio source
  useEffect(() => {
    if (!audioRef.current || !currentSong.src) return

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const audio = audioRef.current

    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      audio.src = currentSong.src
    } else if (Hls.isSupported()) {
      // Use hls.js for other browsers
      hlsRef.current = new Hls()
      hlsRef.current.loadSource(currentSong.src)
      hlsRef.current.attachMedia(audio)
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

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [currentSong, me?.id, updateMediaSession])

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Handle autoplay restrictions
        setPlayingState(false)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, currentSong, setPlayingState])

  // Handle seeking from slider
  useEffect(() => {
    if (audioRef.current && (progressFromSlider || progressFromSlider === 0)) {
      audioRef.current.currentTime = progressFromSlider
      setProgressStateFromSlider(null)
    }
  }, [progressFromSlider, setProgressStateFromSlider])

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

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

  // Prevent playback interruption on device rotation / visibility changes
  useEffect(() => {
    let wasPlayingBeforeHidden = false

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - remember if we were playing
        wasPlayingBeforeHidden = isPlaying
      } else {
        // Page is visible again - resume if we were playing
        if (wasPlayingBeforeHidden && audioRef.current) {
          audioRef.current.play().catch(() => {})
        }
      }
    }

    const handleOrientationChange = () => {
      // Device rotated - ensure playback continues
      if (isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    // Also listen for resize which can indicate rotation
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
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
    />
  )
}

export default AudioEngine
