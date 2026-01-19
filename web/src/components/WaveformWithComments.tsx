/**
 * WaveformWithComments - SoundCloud-style interactive waveform
 *
 * Features:
 * - Beautiful gradient waveform visualization
 * - Timestamped comments displayed as avatars on the waveform
 * - Hover popups showing comment content
 * - Click to add comment at specific timestamp
 * - Real-time comment display while playing
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MessageCircle, Send, X, Heart, Sparkles, Link2, Smile } from 'lucide-react'
import { Avatar } from './Avatar'
import { useMe } from 'hooks/useMe'
import { formatDistanceToNow } from 'date-fns'
import { StickerPicker } from './StickerPicker'
import { EmoteRenderer } from './EmoteRenderer'
import Picker from '@emoji-mart/react'

interface Emoji {
  id: string
  name: string
  native: string
}

// Types
interface TrackComment {
  id: string
  text: string
  timestamp: number
  likeCount: number
  isPinned: boolean
  createdAt: string
  profile: {
    id: string
    displayName: string
    profilePicture: string | null
    userHandle: string
  }
}

interface WaveformWithCommentsProps {
  trackId: string
  audioUrl: string
  duration: number
  comments?: TrackComment[]
  onAddComment?: (text: string, timestamp: number, embedUrl?: string) => Promise<void>
  onLikeComment?: (commentId: string) => Promise<void>
  isPlaying?: boolean
  currentTime?: number
  onSeek?: (time: number) => void
  onPlayPause?: () => void
  className?: string
  variant?: 'default' | 'glass' // glass variant for Now Playing modal
}

// Comment marker component
const CommentMarker = ({
  comment,
  position,
  onClick,
  isHovered,
  onHover,
}: {
  comment: TrackComment
  position: number // 0-100 percentage
  onClick: () => void
  isHovered: boolean
  onHover: (hovered: boolean) => void
}) => (
  <div
    className="absolute bottom-0 z-10 transform -translate-x-1/2 cursor-pointer transition-all duration-200"
    style={{ left: `${position}%` }}
    onClick={onClick}
    onMouseEnter={() => onHover(true)}
    onMouseLeave={() => onHover(false)}
  >
    {/* Avatar marker */}
    <div className={`
      w-6 h-6 rounded-full border-2 overflow-hidden transition-all duration-200
      ${isHovered ? 'border-cyan-400 scale-125 shadow-lg shadow-cyan-500/50' : 'border-white/50'}
    `}>
      {comment.profile.profilePicture ? (
        <img
          src={comment.profile.profilePicture}
          alt={comment.profile.displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
          {comment.profile.displayName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>

    {/* Comment popup on hover */}
    {isHovered && (
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-64 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700 rounded-xl p-3 shadow-2xl">
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-neutral-900/95 border-r border-b border-neutral-700 rotate-45" />

          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {comment.profile.profilePicture ? (
                <img src={comment.profile.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{comment.profile.displayName}</p>
              <p className="text-neutral-500 text-xs">@{comment.profile.userHandle}</p>
            </div>
          </div>

          {/* Comment text with emote rendering */}
          <div className="text-white text-sm leading-relaxed mb-2">
            <EmoteRenderer text={comment.text} linkify />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{comment.likeCount}</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)

// Single confetti comment that erupts outward
const ConfettiComment = ({
  comment,
  index,
  total,
  onDismiss,
}: {
  comment: TrackComment
  index: number
  total: number
  onDismiss: () => void
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isFading, setIsFading] = useState(false)

  // Generate random trajectory for this comment
  const trajectory = useMemo(() => {
    // Spread comments in a fan pattern upward
    const baseAngle = -90 // Start pointing up
    const spreadAngle = Math.min(120, total * 30) // Wider spread for more comments
    const angleStep = total > 1 ? spreadAngle / (total - 1) : 0
    const angle = baseAngle - spreadAngle / 2 + angleStep * index

    // Random variations
    const distance = 150 + Math.random() * 100 // 150-250px
    const rotation = (Math.random() - 0.5) * 30 // -15 to 15 degrees
    const delay = index * 50 // Stagger the eruption

    // Convert angle to x,y
    const radians = (angle * Math.PI) / 180
    const x = Math.cos(radians) * distance
    const y = Math.sin(radians) * distance

    return { x, y, rotation, delay }
  }, [index, total])

  useEffect(() => {
    // Stagger the animation start
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, trajectory.delay)

    // Start fading after 4 seconds
    const fadeTimer = setTimeout(() => {
      setIsFading(true)
    }, 4000 + trajectory.delay)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(fadeTimer)
    }
  }, [trajectory.delay])

  // Seasonal color themes
  const getSeasonalColors = () => {
    const now = new Date()
    const newYearsEnd = new Date('2026-01-05')

    // 🎆 New Year's theme until Jan 5, 2026
    if (now < newYearsEnd) {
      return {
        colors: ['#FFD700', '#FFF8DC', '#C0C0C0', '#FFFACD', '#F0E68C'], // Gold, Cornsilk, Silver, Lemon Chiffon, Khaki
        sparkle: true,
      }
    }

    // Default neon colors
    return {
      colors: ['#00FFD1', '#00D4FF', '#A855F7', '#FF00FF', '#FF006E'],
      sparkle: false,
    }
  }

  const seasonal = getSeasonalColors()
  const borderColor = seasonal.colors[index % seasonal.colors.length]

  return (
    <div
      className={`absolute pointer-events-auto cursor-pointer transition-all duration-700 ease-out ${
        isFading ? 'opacity-0 scale-75' : isVisible ? 'opacity-100' : 'opacity-0 scale-50'
      }`}
      style={{
        transform: isVisible
          ? `translate(${trajectory.x}px, ${trajectory.y}px) rotate(${trajectory.rotation}deg)`
          : 'translate(0, 0) scale(0.5)',
        transitionDelay: `${trajectory.delay}ms`,
        zIndex: 30 + index,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onDismiss()
      }}
    >
      <div
        className="relative bg-neutral-900/95 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl min-w-[180px] max-w-[220px]"
        style={{
          border: `2px solid ${borderColor}`,
          boxShadow: seasonal.sparkle
            ? `0 0 25px ${borderColor}, 0 0 50px ${borderColor}60, 0 0 75px ${borderColor}30`
            : `0 0 20px ${borderColor}40, 0 0 40px ${borderColor}20`,
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-2xl blur-xl -z-10 opacity-30"
          style={{ background: borderColor }}
        />

        {/* ✨ New Year's Sparkles */}
        {seasonal.sparkle && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '1s' }} />
            <div className="absolute -top-2 right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-3 -right-1 w-2 h-2 bg-yellow-200 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
            <div className="absolute -bottom-1 left-6 w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="absolute bottom-4 -left-1 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: '0.8s', animationDelay: '0.7s' }} />
            {/* Star burst effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce text-sm" style={{ animationDuration: '2s' }}>✨</div>
          </>
        )}

        {/* User info row */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
            style={{ boxShadow: `0 0 10px ${borderColor}` }}
          >
            {comment.profile.profilePicture ? (
              <img src={comment.profile.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {comment.profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{comment.profile.displayName}</p>
            <p className="text-[10px] truncate" style={{ color: borderColor }}>@{comment.profile.userHandle}</p>
          </div>
          {comment.likeCount > 0 && (
            <div className="flex items-center gap-0.5 text-pink-400 text-[10px]">
              <Heart className="w-3 h-3 fill-current" />
              <span>{comment.likeCount}</span>
            </div>
          )}
        </div>

        {/* Comment text with emote rendering */}
        <div className="text-white text-sm leading-snug">
          <EmoteRenderer text={comment.text} linkify />
        </div>

        {/* Timestamp badge */}
        <div
          className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-black"
          style={{ background: borderColor }}
        >
          {formatTime(comment.timestamp)}
        </div>
      </div>
    </div>
  )
}

// Check if we're in New Year's season
const isNewYearsSeason = () => {
  const now = new Date()
  return now < new Date('2026-01-05')
}

// Container for confetti comments that erupt from a position
const ActiveCommentPopup = ({
  comments,
  position,
  timestamp,
  onDismiss,
}: {
  comments: TrackComment[]
  position: number
  timestamp: number
  onDismiss: () => void
}) => {
  const isNewYears = isNewYearsSeason()

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        left: `${Math.min(90, Math.max(10, position))}%`,
        bottom: '100%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* 🎆 New Year's Firework Burst */}
      {isNewYears ? (
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          {/* Central gold burst */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 animate-ping" style={{ animationDuration: '0.8s' }} />
          <div className="absolute inset-0 w-6 h-6 rounded-full bg-white animate-pulse shadow-lg shadow-yellow-400/50" />

          {/* Firework rays shooting outward */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-1 h-8 origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                background: `linear-gradient(to top, #FFD700, transparent)`,
                animation: 'pulse 1s ease-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}

          {/* Sparkle particles */}
          <div className="absolute -top-4 -left-4 text-2xl animate-bounce" style={{ animationDuration: '0.5s' }}>🎆</div>
          <div className="absolute -top-6 left-2 text-xl animate-ping" style={{ animationDuration: '1s' }}>✨</div>
          <div className="absolute -top-3 left-6 text-lg animate-bounce" style={{ animationDuration: '0.7s', animationDelay: '0.2s' }}>🎇</div>

          {/* Ball drop effect */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ animationDuration: '1.5s' }}>
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 via-white to-yellow-400 shadow-lg shadow-yellow-500/50" />
          </div>

          {/* 2026 text */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-xs animate-pulse whitespace-nowrap">
            🎊 2026 🎊
          </div>
        </div>
      ) : (
        /* Default neon burst */
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          <div className="w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-white animate-pulse" />
        </div>
      )}

      {/* Confetti comments */}
      {comments.map((comment, idx) => (
        <ConfettiComment
          key={comment.id}
          comment={comment}
          index={idx}
          total={comments.length}
          onDismiss={() => onDismiss()}
        />
      ))}
    </div>
  )
}

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const WaveformWithComments: React.FC<WaveformWithCommentsProps> = ({
  trackId,
  audioUrl,
  duration,
  comments = [],
  onAddComment,
  onLikeComment,
  isPlaying = false,
  currentTime = 0,
  onSeek,
  onPlayPause,
  className = '',
  variant = 'default',
}) => {
  const waveformRef = useRef<HTMLDivElement>(null)
  const me = useMe()

  // Detect mobile for performance optimization
  const isMobile = typeof window !== 'undefined' && (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  )

  const [isReady, setIsReady] = useState(false)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [activePopupGroups, setActivePopupGroups] = useState<{ timestamp: number; comments: TrackComment[] }[]>([])
  const lastTriggeredRef = useRef<Set<string>>(new Set())
  const lastProcessedTimeRef = useRef<number>(-1)
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [selectedStickers, setSelectedStickers] = useState<Array<{url: string, name: string}>>([])
  const [embedUrl, setEmbedUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 })
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showEmbedInput, setShowEmbedInput] = useState(false)


  // Generate vertical bar waveform data (amplitude for each bar)
  // MOBILE: Use fewer bars (80) to reduce DOM complexity and memory usage
  const waveformBars = useMemo(() => {
    const bars: number[] = []
    const numBars = isMobile ? 80 : 250 // 80 bars mobile, 250 desktop
    let seed = trackId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

    for (let i = 0; i < numBars; i++) {
      seed = (seed * 9301 + 49297) % 233280
      const random = seed / 233280
      const position = i / numBars

      // Multiple frequency components for realistic audio look
      const wave1 = Math.sin(position * Math.PI * 6 + seed * 0.01) * 0.35
      const wave2 = Math.sin(position * Math.PI * 14 + seed * 0.02) * 0.25
      const wave3 = Math.sin(position * Math.PI * 28 + seed * 0.03) * 0.2
      const wave4 = Math.sin(position * Math.PI * 50 + seed * 0.04) * 0.1

      // Envelope shaping
      const envelope = 0.4 + Math.sin(position * Math.PI * 2.5) * 0.25 + random * 0.35

      // Combine waves with envelope
      const amplitude = Math.abs(wave1 + wave2 + wave3 + wave4) * envelope

      // Add transient spikes (like drum hits)
      const isTransient = random > 0.88
      const transientBoost = isTransient ? (random - 0.88) * 3 : 0

      bars.push(Math.min(1, Math.max(0.05, amplitude + transientBoost)))
    }
    return bars
  }, [trackId, isMobile])

  // Mark as ready immediately since we're using static waveform
  useEffect(() => {
    setIsReady(true)
  }, [])

  // Trigger comment popups when playhead crosses their timestamps
  // Using wider window to compensate for integer second updates from AudioEngine
  useEffect(() => {
    if (!isPlaying || comments.length === 0) return

    // Wider trigger window (1.5s) because currentTime updates as integer seconds
    // This ensures comments at fractional timestamps aren't missed
    const triggerWindow = 1.5
    const newlyTriggered = comments.filter(comment => {
      // Check if comment is within the current second's window
      const isInWindow = comment.timestamp >= currentTime - 0.5 && comment.timestamp < currentTime + triggerWindow
      const notTriggered = !lastTriggeredRef.current.has(comment.id)
      // Comment should be at or before playhead position (with some tolerance)
      const isAhead = comment.timestamp <= currentTime + 1
      return isInWindow && notTriggered && isAhead
    })

    if (newlyTriggered.length > 0) {
      // Mark as triggered
      newlyTriggered.forEach(c => lastTriggeredRef.current.add(c.id))

      // Group newly triggered comments by similar timestamp (within 1 second)
      const groupedNew: { timestamp: number; comments: TrackComment[] }[] = []
      newlyTriggered.forEach(comment => {
        const existingGroup = groupedNew.find(g => Math.abs(g.timestamp - comment.timestamp) < 1)
        if (existingGroup) {
          existingGroup.comments.push(comment)
        } else {
          groupedNew.push({ timestamp: comment.timestamp, comments: [comment] })
        }
      })

      // Add grouped comments to active popups
      setActivePopupGroups(prev => [...prev, ...groupedNew])

      // Auto-remove after 5 seconds (longer for grouped comments)
      const groupIds = newlyTriggered.map(c => c.id)
      setTimeout(() => {
        setActivePopupGroups(prev =>
          prev.filter(group => !group.comments.some(c => groupIds.includes(c.id)))
        )
      }, 5000)
    }
  }, [currentTime, isPlaying, comments])

  // Reset triggered comments when seeking or pausing
  useEffect(() => {
    if (!isPlaying) {
      lastTriggeredRef.current.clear()
      setActivePopupGroups([])
      lastProcessedTimeRef.current = -1
    }
  }, [isPlaying])

  // Detect seeking (large jumps in currentTime) and reset triggered comments
  useEffect(() => {
    const timeDiff = Math.abs(currentTime - lastProcessedTimeRef.current)
    // If time jumped more than 3 seconds, user probably seeked
    if (lastProcessedTimeRef.current >= 0 && timeDiff > 3) {
      lastTriggeredRef.current.clear()
      setActivePopupGroups([])
    }
    lastProcessedTimeRef.current = currentTime
  }, [currentTime])

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  // Handle waveform click to add comment
  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!me || !waveformRef.current) return

    const rect = waveformRef.current.getBoundingClientRect()
    const relativeX = (e.clientX - rect.left) / rect.width
    const clickTime = relativeX * duration

    setCommentTimestamp(clickTime)
    setClickPosition({ x: e.clientX, y: e.clientY })
    setShowCommentInput(true)
  }, [me, duration])

  // Submit comment
  const handleSubmitComment = async () => {
    const hasContent = commentText.trim() || selectedStickers.length > 0 || embedUrl.trim()
    if (!hasContent || !onAddComment || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Combine text and sticker markdown
      const stickerMarkdown = selectedStickers
        .map(s => `![emote:${s.name}](${s.url})`)
        .join(' ')
      const finalComment = [commentText.trim(), stickerMarkdown].filter(Boolean).join(' ')

      await onAddComment(finalComment, commentTimestamp, embedUrl.trim() || undefined)
      setCommentText('')
      setSelectedStickers([])
      setEmbedUrl('')
      setShowCommentInput(false)
      setShowStickerPicker(false)
      setShowEmbedInput(false)
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove a sticker from selection
  const removeSticker = (index: number) => {
    setSelectedStickers(prev => prev.filter((_, i) => i !== index))
  }

  // Group comments by similar timestamps for stacking
  const groupedComments = useMemo(() => {
    const groups: { position: number; comments: TrackComment[] }[] = []
    const sorted = [...comments].sort((a, b) => a.timestamp - b.timestamp)

    sorted.forEach(comment => {
      const position = (comment.timestamp / duration) * 100
      const existingGroup = groups.find(g => Math.abs(g.position - position) < 2)

      if (existingGroup) {
        existingGroup.comments.push(comment)
      } else {
        groups.push({ position, comments: [comment] })
      }
    })

    return groups
  }, [comments, duration])

  const isGlass = variant === 'glass'

  return (
    <div className={`relative ${className}`}>
      {/* Waveform container */}
      <div className={`relative rounded-xl p-4 ${
        isGlass
          ? 'bg-black/30 backdrop-blur-xl border border-white/10'
          : 'bg-neutral-900 border border-neutral-800'
      }`}>
        {/* Comment count badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-neutral-800/80 rounded-full text-xs text-neutral-400">
          <MessageCircle className="w-3 h-3" />
          <span>{comments.length}</span>
        </div>

        {/* Futuristic Web3 Waveform */}
        <div
          ref={waveformRef}
          className="relative h-36 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const relativeX = (e.clientX - rect.left) / rect.width
            const clickTime = relativeX * duration
            if (onSeek) onSeek(clickTime)
            if (me) {
              setCommentTimestamp(clickTime)
              setShowCommentInput(true)
            }
          }}
        >
          {/* Glow backdrop for played section - GPU accelerated */}
          <div
            className="absolute inset-y-0 left-0 pointer-events-none opacity-30"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #26D1A8 0%, #62AAFF 30%, #AC4EFD 60%, #F1419E 100%)',
              filter: 'blur(20px)',
              willChange: 'width',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Waveform bars - GPU layer for smooth rendering */}
          <div
            className="absolute inset-0 flex items-center gap-[1px]"
            style={{
              contain: 'layout style paint',
              transform: 'translateZ(0)',
              // Mobile: larger gaps between bars for easier touch and less rendering
              gap: isMobile ? '2px' : '1px',
            }}
          >
            {waveformBars.map((amplitude, idx) => {
              const barProgress = (idx / waveformBars.length) * 100
              const isPlayed = barProgress <= progressPercent
              const heightPercent = Math.max(8, amplitude * 100)

              // Neon gradient colors
              const gradientPos = idx / waveformBars.length
              const getNeonColor = (pos: number) => {
                if (pos < 0.2) return '#00FFD1'
                if (pos < 0.4) return '#00D4FF'
                if (pos < 0.6) return '#A855F7'
                if (pos < 0.8) return '#FF00FF'
                return '#FF006E'
              }

              const barColor = isPlayed ? getNeonColor(gradientPos) : (isGlass ? 'rgba(255,255,255,0.15)' : '#2a2a2a')

              return (
                <div
                  key={idx}
                  className="flex-1 flex items-center justify-center h-full"
                >
                  <div
                    className="w-[4px] rounded-full"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: barColor,
                      boxShadow: isPlayed ? `0 0 10px ${barColor}, 0 0 20px ${barColor}40` : 'none',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Animated Playhead - GPU accelerated for smooth movement */}
          <div
            className="absolute top-0 bottom-0 w-[3px] pointer-events-none"
            style={{
              left: `${progressPercent}%`,
              background: 'linear-gradient(180deg, #00FFD1 0%, #fff 50%, #FF00FF 100%)',
              boxShadow: '0 0 10px #fff, 0 0 20px #00FFD1, 0 0 30px #FF00FF, 0 0 40px #fff',
              transition: isPlaying ? 'left 1s linear' : 'left 0.1s ease-out',
              willChange: 'left',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          >
            {/* Playhead glow pulse - GPU accelerated */}
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background: 'linear-gradient(180deg, #00FFD1 0%, #fff 50%, #FF00FF 100%)',
                filter: 'blur(4px)',
                willChange: 'opacity',
                transform: 'translateZ(0)',
              }}
            />
          </div>
        </div>

        {/* Active comment popups - animate when playhead crosses */}
        {activePopupGroups.length > 0 && (
          <div className="absolute left-4 right-4 bottom-16 h-0 overflow-visible pointer-events-none z-30">
            {activePopupGroups.map((group, idx) => (
              <ActiveCommentPopup
                key={`group-${group.timestamp}-${idx}`}
                comments={group.comments}
                position={(group.timestamp / duration) * 100}
                timestamp={group.timestamp}
                onDismiss={() => setActivePopupGroups(prev =>
                  prev.filter(g => g.timestamp !== group.timestamp || g.comments[0]?.id !== group.comments[0]?.id)
                )}
              />
            ))}
          </div>
        )}

        {/* Comment markers */}
        <div className="absolute left-4 right-4 bottom-4 h-8 pointer-events-auto">
          {groupedComments.map((group, idx) => (
            <CommentMarker
              key={idx}
              comment={group.comments[0]} // Show first comment in group
              position={group.position}
              onClick={() => {
                if (onSeek) onSeek(group.comments[0].timestamp)
              }}
              isHovered={hoveredCommentId === group.comments[0].id}
              onHover={(hovered) => setHoveredCommentId(hovered ? group.comments[0].id : null)}
            />
          ))}
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-neutral-500 mt-2 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

      </div>

      {/* Comment input popup */}
      {showCommentInput && me && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowCommentInput(false)
            setShowStickerPicker(false)
            setShowEmbedInput(false)
            setSelectedStickers([])
            setCommentText('')
            setEmbedUrl('')
          }} />
          <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl p-3 sm:p-4 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-semibold">Add comment at {formatTime(commentTimestamp)}</span>
              </div>
              <button
                onClick={() => {
                  setShowCommentInput(false)
                  setShowStickerPicker(false)
                  setShowEmbedInput(false)
                  setSelectedStickers([])
                  setCommentText('')
                  setEmbedUrl('')
                }}
                className="p-1 hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Timestamp indicator */}
            <div className="h-1 bg-neutral-800 rounded-full mb-4 relative overflow-hidden">
              <div
                className="absolute h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                style={{ width: `${(commentTimestamp / duration) * 100}%` }}
              />
              <div
                className="absolute w-3 h-3 bg-white rounded-full top-1/2 -translate-y-1/2 shadow-lg"
                style={{ left: `${(commentTimestamp / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>

            {/* Selected Stickers Preview - shows actual images */}
            {selectedStickers.length > 0 && (
              <div className="mb-3 p-3 bg-neutral-800/50 rounded-xl border border-neutral-700">
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-neutral-400">Selected Stickers ({selectedStickers.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStickers.map((sticker, idx) => (
                    <div
                      key={idx}
                      className="relative group"
                    >
                      <img
                        src={sticker.url}
                        alt={sticker.name}
                        className="w-12 h-12 object-contain rounded-lg bg-neutral-900/50 p-1"
                        title={sticker.name}
                      />
                      <button
                        onClick={() => removeSticker(idx)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Input */}
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value.slice(0, 280 - selectedStickers.length))}
                placeholder="Add a message (optional)..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 pr-12 text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitComment()
                  }
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={(!commentText.trim() && selectedStickers.length === 0) || isSubmitting}
                className="absolute right-3 bottom-3 p-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Action bar: Emoji, Stickers, Embed, and character count */}
            <div className="flex items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-2">
                {/* Emoji button */}
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker)
                    setShowStickerPicker(false)
                    setShowEmbedInput(false)
                  }}
                  className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                    showEmojiPicker
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 ring-2 ring-yellow-400'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Emoji</span>
                </button>

                {/* Sticker button */}
                <button
                  onClick={() => {
                    setShowStickerPicker(!showStickerPicker)
                    setShowEmojiPicker(false)
                    setShowEmbedInput(false)
                  }}
                  className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                    showStickerPicker
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 ring-2 ring-cyan-400'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                  title="Add stickers (7TV, BTTV, FFZ)"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Stickers</span>
                </button>

                {/* Embed URL button */}
                <button
                  onClick={() => {
                    setShowEmbedInput(!showEmbedInput)
                    setShowStickerPicker(false)
                  }}
                  className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                    showEmbedInput || embedUrl
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 ring-2 ring-purple-400'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                  title="Add embed URL (YouTube, Spotify, SoundCloud)"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Embed</span>
                </button>
              </div>

              <span className={`text-xs ${(commentText.length + selectedStickers.length) > 240 ? 'text-amber-400' : 'text-neutral-500'}`}>
                {commentText.length + selectedStickers.length}/280
              </span>
            </div>

            {/* Embed URL Input */}
            {showEmbedInput && (
              <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-neutral-800 rounded-xl p-3 border border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-neutral-400">Embed URL (YouTube, Spotify, SoundCloud, etc.)</span>
                  </div>
                  <input
                    type="url"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  {embedUrl && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-green-400">URL attached</span>
                      <button
                        onClick={() => setEmbedUrl('')}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emoji Picker - stays open for emoji flurries */}
            {showEmojiPicker && (
              <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
                <Picker
                  theme="dark"
                  perLine={8}
                  onEmojiSelect={(emoji: Emoji) => {
                    // Add emoji to text - keeps picker open for rapid selection
                    if (commentText.length < 280) {
                      setCommentText(prev => prev + emoji.native)
                    }
                  }}
                />
              </div>
            )}

            {/* Sticker Picker - 7TV, BTTV, FFZ emotes - stays open for flurry blasts */}
            {showStickerPicker && (
              <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
                <StickerPicker
                  theme="dark"
                  onSelect={(stickerUrl, stickerName) => {
                    // Add sticker to array - keeps picker open for rapid selection
                    setSelectedStickers(prev => [...prev, { url: stickerUrl, name: stickerName }])
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login prompt for non-logged-in users - check both me and localStorage token */}
      {!me && typeof window !== 'undefined' && !localStorage.getItem('didToken') && !localStorage.getItem('jwt_fallback') && (
        <div className="mt-2 text-center">
          <p className="text-neutral-500 text-sm">
            <a href="/login" className="text-cyan-400 hover:underline">Login</a> to leave timestamped comments
          </p>
        </div>
      )}
    </div>
  )
}

export default WaveformWithComments
