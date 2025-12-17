import { useEffect, useRef, useState, memo } from 'react'

interface AutoplayVideoProps {
  src: string
  className?: string
  muted?: boolean
  loop?: boolean
  onPlay?: () => void
  onPause?: () => void
}

/**
 * AutoplayVideo - A video component that plays when scrolled into view
 * Similar to Instagram and X/Twitter behavior
 */
export const AutoplayVideo = memo(({
  src,
  className = '',
  muted = true, // Default muted for autoplay (required by most browsers)
  loop = true,
  onPlay,
  onPause,
}: AutoplayVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isInView, setIsInView] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)

  // Set up Intersection Observer
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.5)
        })
      },
      {
        threshold: [0.5], // Trigger when 50% of video is visible
        rootMargin: '0px',
      }
    )

    observer.observe(video)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Handle autoplay based on visibility
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isInView) {
      // Try to play when in view
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            onPlay?.()
          })
          .catch((err) => {
            // Autoplay was prevented - user needs to interact
            console.log('Autoplay prevented:', err.message)
          })
      }
    } else if (!hasInteracted) {
      // Only pause when out of view if user hasn't interacted yet
      // Once they've tapped to unmute, keep the vibe going!
      video.pause()
      onPause?.()
    }
    // If hasInteracted is true, don't pause - let it keep playing
  }, [isInView, hasInteracted, onPlay, onPause])

  const handleClick = () => {
    const video = videoRef.current
    if (!video) return

    // First click unmutes the video (like IG/X behavior)
    if (!hasInteracted && isMuted) {
      video.muted = false
      setIsMuted(false)
      setHasInteracted(true)
      return
    }

    // Subsequent clicks toggle play/pause
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    const newMuted = !isMuted
    video.muted = newMuted
    setIsMuted(newMuted)
    setHasInteracted(true)
  }

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        className={`w-full max-h-[500px] cursor-pointer ${className}`}
        playsInline
        muted={isMuted}
        loop={loop}
        onClick={handleClick}
      />
      {/* Mute/Unmute button overlay */}
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title={isMuted ? 'Tap to unmute' : 'Tap to mute'}
      >
        <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
      </button>
      {/* Tap to unmute hint for muted videos */}
      {isMuted && !hasInteracted && (
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 backdrop-blur rounded-full text-white text-xs flex items-center gap-1.5">
          <span>🔇</span>
          <span>Tap to unmute</span>
        </div>
      )}
      {/* Play/Pause indicator */}
      {!isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <span className="text-3xl">▶️</span>
          </div>
        </div>
      )}
    </div>
  )
})

AutoplayVideo.displayName = 'AutoplayVideo'
