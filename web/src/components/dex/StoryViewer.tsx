import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send, MoreHorizontal, Sparkles, Volume2, VolumeX, Pause, Play, Share2, Link2, Twitter, Copy, Check } from 'lucide-react'
import { Avatar } from 'components/Avatar'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'

interface StoryItem {
  id: string
  mediaUrl: string
  mediaType: 'image' | 'video'
  createdAt: string
  isPermanent?: boolean
  viewCount: number
  reactions: { emoji: string; count: number }[]
}

interface StoryUser {
  profileId: string
  profilePicture?: string
  displayName?: string
  userHandle: string
  stories: StoryItem[]
}

interface StoryViewerProps {
  isOpen: boolean
  onClose: () => void
  initialUserId?: string
  users: StoryUser[]
}

// Time ago helper
const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Mock story data
const mockStoryUsers: StoryUser[] = [
  {
    profileId: 'p1',
    displayName: 'Ye',
    userHandle: 'ye',
    profilePicture: '',
    stories: [
      { id: 's1', mediaUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', mediaType: 'image', createdAt: new Date(Date.now() - 3600000).toISOString(), isPermanent: true, viewCount: 15420, reactions: [{ emoji: '🔥', count: 892 }, { emoji: '💜', count: 567 }] },
      { id: 's2', mediaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', mediaType: 'image', createdAt: new Date(Date.now() - 7200000).toISOString(), viewCount: 12350, reactions: [{ emoji: '🚀', count: 445 }] },
      { id: 's3', mediaUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', mediaType: 'image', createdAt: new Date(Date.now() - 10800000).toISOString(), viewCount: 9800, reactions: [] },
    ]
  },
  {
    profileId: 'p2',
    displayName: 'fern_dev',
    userHandle: 'fern_dev',
    profilePicture: '',
    stories: [
      { id: 's4', mediaUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800', mediaType: 'image', createdAt: new Date(Date.now() - 1800000).toISOString(), viewCount: 234, reactions: [{ emoji: '🎵', count: 45 }] },
    ]
  },
  {
    profileId: 'p3',
    displayName: 'Bass Queen',
    userHandle: 'bassqueen',
    profilePicture: '',
    stories: [
      { id: 's5', mediaUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800', mediaType: 'image', createdAt: new Date(Date.now() - 5400000).toISOString(), isPermanent: true, viewCount: 8765, reactions: [{ emoji: '🔥', count: 234 }, { emoji: '💯', count: 189 }] },
      { id: 's6', mediaUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800', mediaType: 'image', createdAt: new Date(Date.now() - 9000000).toISOString(), viewCount: 6543, reactions: [] },
    ]
  },
]

export const StoryViewer = ({ isOpen, onClose, initialUserId, users = mockStoryUsers }: StoryViewerProps) => {
  const router = useRouter()
  const [currentUserIndex, setCurrentUserIndex] = useState(0)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentUser = users[currentUserIndex]
  const currentStory = currentUser?.stories[currentStoryIndex]
  const [videoDuration, setVideoDuration] = useState(15000) // Default 15s for video
  const imageDuration = 5000 // 5s for images
  const storyDuration = currentStory?.mediaType === 'video' ? videoDuration : imageDuration

  // Find initial user index
  useEffect(() => {
    if (initialUserId && users.length > 0) {
      const index = users.findIndex(u => u.profileId === initialUserId)
      if (index !== -1) setCurrentUserIndex(index)
    }
  }, [initialUserId, users])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevStory()
          break
        case 'ArrowRight':
          goToNextStory()
          break
        case ' ':
          e.preventDefault()
          setIsPaused(prev => !prev)
          break
        case 'm':
          if (currentStory?.mediaType === 'video') {
            setIsMuted(prev => !prev)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, goToPrevStory, goToNextStory, currentStory, onClose])

  // Handle video duration detection
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          // Video duration in milliseconds (capped at 10 minutes)
          const duration = Math.min(videoRef.current.duration * 1000, 600000)
          setVideoDuration(duration)
        }
      }
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => {
        videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }
  }, [currentStory?.mediaType, currentStory?.id])

  // Pause/play video when isPaused changes
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      if (isPaused) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isPaused, currentStory?.mediaType])

  // Progress bar timer
  useEffect(() => {
    if (!isOpen || isPaused) {
      if (progressInterval.current) clearInterval(progressInterval.current)
      return
    }

    const startTime = Date.now()
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = (elapsed / storyDuration) * 100

      if (newProgress >= 100) {
        goToNextStory()
      } else {
        setProgress(newProgress)
      }
    }, 50)

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [isOpen, isPaused, currentUserIndex, currentStoryIndex, storyDuration])

  const goToNextStory = useCallback(() => {
    setProgress(0)
    if (currentStoryIndex < currentUser.stories.length - 1) {
      // Next story from same user
      setCurrentStoryIndex(prev => prev + 1)
    } else if (currentUserIndex < users.length - 1) {
      // Next user's stories
      setCurrentUserIndex(prev => prev + 1)
      setCurrentStoryIndex(0)
    } else {
      // End of all stories
      onClose()
    }
  }, [currentStoryIndex, currentUserIndex, currentUser?.stories.length, users.length, onClose])

  const goToPrevStory = useCallback(() => {
    setProgress(0)
    if (currentStoryIndex > 0) {
      // Previous story from same user
      setCurrentStoryIndex(prev => prev - 1)
    } else if (currentUserIndex > 0) {
      // Previous user's last story
      setCurrentUserIndex(prev => prev - 1)
      setCurrentStoryIndex(users[currentUserIndex - 1].stories.length - 1)
    }
  }, [currentStoryIndex, currentUserIndex, users])

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width

    if (x < width / 3) {
      goToPrevStory()
    } else if (x > (width * 2) / 3) {
      goToNextStory()
    } else {
      setIsPaused(prev => !prev)
    }
  }

  const handleReaction = (emoji: string) => {
    console.log('Reaction:', emoji, 'on story:', currentStory?.id)
    setShowReactions(false)
    // TODO: Send reaction via GraphQL mutation
  }

  const handleReply = () => {
    if (!replyText.trim()) return
    console.log('Reply:', replyText, 'to story:', currentStory?.id)
    setReplyText('')
    // TODO: Send reply via GraphQL mutation
  }

  const handleMakePermanent = () => {
    console.log('Make permanent:', currentStory?.id)
    // TODO: Open payment modal for OGUN
  }

  const getShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://soundchain.io'
    return `${baseUrl}/dex/story/${currentUser?.userHandle}/${currentStory?.id}`
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setLinkCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const handleShareTwitter = () => {
    const text = `Check out this story from @${currentUser?.userHandle} on SoundChain 🎵`
    const url = getShareUrl()
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    setShowShareMenu(false)
  }

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentUser?.displayName}'s Story on SoundChain`,
          text: `Check out this story from ${currentUser?.displayName || currentUser?.userHandle}`,
          url: getShareUrl(),
        })
        setShowShareMenu(false)
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink()
    }
  }

  if (!isOpen || !currentUser || !currentStory) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Previous user arrow - desktop */}
      {currentUserIndex > 0 && (
        <button
          onClick={() => { setCurrentUserIndex(prev => prev - 1); setCurrentStoryIndex(0); setProgress(0) }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next user arrow - desktop */}
      {currentUserIndex < users.length - 1 && (
        <button
          onClick={() => { setCurrentUserIndex(prev => prev + 1); setCurrentStoryIndex(0); setProgress(0) }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Story container - phone-shaped on desktop */}
      <div
        className="relative w-full h-full md:w-[420px] md:h-[750px] md:rounded-3xl overflow-hidden bg-neutral-900"
        onClick={handleTap}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-40 flex gap-1 p-2">
          {currentUser.stories.map((story, index) => (
            <div key={story.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-40 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-[2px] cursor-pointer"
              onClick={(e) => { e.stopPropagation(); router.push(`/dex/users/${currentUser.userHandle}`) }}
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {currentUser.profilePicture ? (
                  <img src={currentUser.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {currentUser.displayName?.charAt(0) || currentUser.userHandle?.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            {/* Name and time */}
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white text-sm font-medium">{currentUser.displayName || currentUser.userHandle}</span>
                {currentStory.isPermanent && (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <span className="text-white/60 text-xs">{timeAgo(currentStory.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Pause/Play */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsPaused(prev => !prev) }}
              className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            {/* Mute - for video */}
            {currentStory.mediaType === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev) }}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            {/* Share */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu) }}
                className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                  showShareMenu ? 'bg-cyan-500 text-white' : 'bg-black/30 text-white/80 hover:text-white'
                }`}
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* Share menu dropdown */}
              {showShareMenu && (
                <div
                  className="absolute top-full right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-2xl z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleShareNative}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 transition-colors text-sm"
                  >
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    Share Story
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 transition-colors text-sm"
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Link2 className="w-4 h-4 text-purple-400" />
                    )}
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={handleShareTwitter}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 transition-colors text-sm"
                  >
                    <Twitter className="w-4 h-4 text-blue-400" />
                    Share to X
                  </button>
                  <div className="px-4 py-2 text-[10px] text-white/40 border-t border-white/5">
                    External shares include full reel preview
                  </div>
                </div>
              )}
            </div>

            {/* More */}
            <button
              onClick={(e) => { e.stopPropagation(); /* TODO: More menu */ }}
              className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media */}
        {currentStory.mediaType === 'image' ? (
          <img
            src={currentStory.mediaUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            playsInline
            onEnded={goToNextStory}
          />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 z-40 p-4 space-y-3">
          {/* View count and reactions */}
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">{currentStory.viewCount.toLocaleString()} views</span>
            {currentStory.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {currentStory.reactions.map((r, i) => (
                  <span key={i} className="text-sm">{r.emoji} <span className="text-white/60 text-xs">{r.count}</span></span>
                ))}
              </div>
            )}
          </div>

          {/* Reply input */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 relative">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                placeholder="Reply to story..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Quick reactions */}
            <div className="flex items-center gap-1">
              {['❤️', '🔥', '🚀', '😂'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Send */}
            {replyText && (
              <button
                onClick={handleReply}
                className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center hover:bg-cyan-400 transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Make Permanent CTA - if not already permanent */}
          {!currentStory.isPermanent && (
            <button
              onClick={(e) => { e.stopPropagation(); handleMakePermanent() }}
              className="w-full py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium flex items-center justify-center gap-2 hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Make This Reel Permanent
            </button>
          )}
        </div>
      </div>

      {/* User previews - desktop only */}
      <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 gap-2">
        {users.map((user, index) => (
          <button
            key={user.profileId}
            onClick={() => { setCurrentUserIndex(index); setCurrentStoryIndex(0); setProgress(0) }}
            className={`w-12 h-12 rounded-full p-[2px] transition-all ${
              index === currentUserIndex
                ? 'bg-gradient-to-tr from-cyan-500 to-purple-500 scale-110'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white/70">
                  {user.displayName?.charAt(0) || user.userHandle?.charAt(0)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
