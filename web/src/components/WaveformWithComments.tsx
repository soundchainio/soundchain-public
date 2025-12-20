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
import type WaveSurferType from 'wavesurfer.js'
import { MessageCircle, Send, X, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from './Avatar'
import { useMe } from 'hooks/useMe'
import { formatDistanceToNow } from 'date-fns'

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
  onAddComment?: (text: string, timestamp: number) => Promise<void>
  onLikeComment?: (commentId: string) => Promise<void>
  isPlaying?: boolean
  currentTime?: number
  onSeek?: (time: number) => void
  onPlayPause?: () => void
  className?: string
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

          {/* Comment text */}
          <p className="text-white text-sm leading-relaxed mb-2">{comment.text}</p>

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
}) => {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurferType | null>(null)
  const me = useMe()

  const [isReady, setIsReady] = useState(false)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 })

  // Build gradient for waveform
  const buildWaveformGradient = useCallback(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return '#62AAFF'

    const gradient = ctx.createLinearGradient(0, 0, 500, 0)
    gradient.addColorStop(0, '#26D1A8')    // Teal
    gradient.addColorStop(0.25, '#62AAFF')  // Blue
    gradient.addColorStop(0.5, '#AC4EFD')   // Purple
    gradient.addColorStop(0.75, '#F1419E')  // Pink
    gradient.addColorStop(1, '#FED503')     // Yellow
    return gradient
  }, [])

  // Initialize WaveSurfer (dynamic import for SSR compatibility)
  useEffect(() => {
    if (!waveformRef.current) return

    let mounted = true

    const initWaveSurfer = async () => {
      // Dynamic import to avoid SSR issues
      const WaveSurfer = (await import('wavesurfer.js')).default

      if (!mounted || !waveformRef.current) return

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#333',
        progressColor: buildWaveformGradient(),
        cursorColor: '#62AAFF',
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        normalize: true,
        hideScrollbar: true,
        interact: true,
      })

      wavesurfer.current.load(audioUrl)

      wavesurfer.current.on('ready', () => {
        if (mounted) setIsReady(true)
      })

      wavesurfer.current.on('click', (relativeX: number) => {
        const clickTime = relativeX * duration
        if (onSeek) onSeek(clickTime)
      })
    }

    initWaveSurfer()

    return () => {
      mounted = false
      wavesurfer.current?.destroy()
    }
  }, [audioUrl, duration, buildWaveformGradient, onSeek])

  // Sync progress with external currentTime
  useEffect(() => {
    if (wavesurfer.current && isReady && duration > 0) {
      const progress = currentTime / duration
      wavesurfer.current.seekTo(Math.min(progress, 1))
    }
  }, [currentTime, duration, isReady])

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
    if (!commentText.trim() || !onAddComment || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAddComment(commentText.trim(), commentTimestamp)
      setCommentText('')
      setShowCommentInput(false)
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
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

  return (
    <div className={`relative ${className}`}>
      {/* Waveform container */}
      <div className="relative bg-neutral-900 rounded-xl p-4 border border-neutral-800">
        {/* Comment count badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-neutral-800/80 rounded-full text-xs text-neutral-400">
          <MessageCircle className="w-3 h-3" />
          <span>{comments.length}</span>
        </div>

        {/* Waveform */}
        <div
          ref={waveformRef}
          className="relative cursor-pointer"
          onClick={handleWaveformClick}
        />

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

        {/* Loading overlay */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 rounded-xl">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Comment input popup */}
      {showCommentInput && me && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCommentInput(false)} />
          <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl p-4 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-semibold">Add comment at {formatTime(commentTimestamp)}</span>
              </div>
              <button
                onClick={() => setShowCommentInput(false)}
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

            {/* Input */}
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value.slice(0, 140))}
                placeholder="Write your comment..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 pr-12 text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                rows={3}
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
                disabled={!commentText.trim() || isSubmitting}
                className="absolute right-3 bottom-3 p-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Character count */}
            <div className="flex justify-end mt-2">
              <span className={`text-xs ${commentText.length > 120 ? 'text-amber-400' : 'text-neutral-500'}`}>
                {commentText.length}/140
              </span>
            </div>
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
