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
import { MessageCircle, Send, X, Heart, Sparkles, Link2 } from 'lucide-react'
import { Avatar } from './Avatar'
import { useMe } from 'hooks/useMe'
import { formatDistanceToNow } from 'date-fns'
import { StickerPicker } from './StickerPicker'
import { EmoteRenderer } from './EmoteRenderer'

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

  const [isReady, setIsReady] = useState(false)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [selectedStickers, setSelectedStickers] = useState<Array<{url: string, name: string}>>([])
  const [embedUrl, setEmbedUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 })
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showEmbedInput, setShowEmbedInput] = useState(false)


  // Generate vertical bar waveform data (amplitude for each bar)
  const waveformBars = useMemo(() => {
    const bars: number[] = []
    const numBars = 250 // Dense bars like real DAW
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
  }, [trackId])

  // Mark as ready immediately since we're using static waveform
  useEffect(() => {
    setIsReady(true)
  }, [])

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

            {/* Action bar: Stickers, Embed, and character count */}
            <div className="flex items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-2">
                {/* Sticker button */}
                <button
                  onClick={() => {
                    setShowStickerPicker(!showStickerPicker)
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

      {/* Login prompt for non-logged-in users */}
      {!me && (
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
