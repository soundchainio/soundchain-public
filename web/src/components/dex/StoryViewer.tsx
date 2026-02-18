import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send, MoreHorizontal, Sparkles, Volume2, VolumeX, Pause, Play, Share2, Link2, Twitter, Copy, Check, Music2, Repeat2, Download, Bookmark, Eye } from 'lucide-react'
import { Avatar } from 'components/Avatar'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { gql, useMutation } from '@apollo/client'
import { MakeStoryPermanentModal } from './MakeStoryPermanentModal'
import { ReelSCidTracker } from './ReelSCidTracker'
import { getIpfsUrl } from 'utils/ipfs'
import ReactPlayer from 'react-player'
import { useMe } from 'hooks/useMe'

// Detect if a URL is an embeddable platform (YouTube, Vimeo, etc.) vs a direct file
const isEmbedUrl = (url: string) =>
  /(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv|soundcloud\.com|spotify\.com|bandcamp\.com|facebook\.com\/.*video)/i.test(url)

const REACT_TO_STORY = gql`
  mutation reactToStory($storyId: ID!, $emoji: String!) {
    reactToStory(storyId: $storyId, emoji: $emoji) {
      id
      reactions {
        profileId
        emoji
        createdAt
      }
    }
  }
`

const VIEW_STORY = gql`
  mutation viewStory($storyId: ID!) {
    viewStory(storyId: $storyId) {
      id
      viewCount
    }
  }
`

const RECORD_STORY_WATCH = gql`
  mutation recordStoryWatch($storyId: ID!, $watchDurationSeconds: Float!) {
    recordStoryWatch(storyId: $storyId, watchDurationSeconds: $watchDurationSeconds) {
      qualified
      totalQualifiedViews
    }
  }
`

interface StoryOverlay {
  type: 'text' | 'hashtag' | 'mention' | 'sticker' | 'nft_badge'
  content: string
  positionX: number
  positionY: number
  fontFamily?: string
  color?: string
  fontSize?: number
  rotation?: number
}

interface AttachedTrack {
  id: string
  title?: string
  artist?: string
  artworkUrl?: string
  audioUrl?: string
}

interface StoryItem {
  id: string
  mediaUrl: string
  mediaType: 'image' | 'video'
  createdAt: string
  duration?: number // seconds - story display duration
  isPermanent?: boolean
  scidEligible?: boolean
  viewCount: number
  reactions: { emoji: string; count: number }[]
  mediaSize?: number // bytes - for pricing calculation
  overlays?: StoryOverlay[]
  attachedTrack?: AttachedTrack
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
  initialStoryId?: string
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

export const StoryViewer = ({ isOpen, onClose, initialUserId, initialStoryId, users = mockStoryUsers }: StoryViewerProps) => {
  const router = useRouter()
  const me = useMe()
  const [currentUserIndex, setCurrentUserIndex] = useState(0)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showPermanentModal, setShowPermanentModal] = useState(false)
  const [reactedEmojis, setReactedEmojis] = useState<Set<string>>(new Set())
  const viewedStories = useRef<Set<string>>(new Set())
  const storyStartTime = useRef<number>(Date.now())

  const [reactToStory] = useMutation(REACT_TO_STORY)
  const [viewStory] = useMutation(VIEW_STORY)
  const [recordStoryWatch] = useMutation(RECORD_STORY_WATCH)

  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const currentUser = users[currentUserIndex]
  const currentStory = currentUser?.stories[currentStoryIndex]
  const [videoDuration, setVideoDuration] = useState(15000) // Default 15s for video
  const imageDuration = 5000 // 5s for images
  const hasTrackAudio = !!(currentStory?.attachedTrack?.audioUrl)
  // For stories with attached track audio: use story duration (59s from radio) or default 59s
  // For video: use detected video duration
  // For plain images: 5s
  const storyDuration = hasTrackAudio
    ? (currentStory?.duration ? currentStory.duration * 1000 : 59000)
    : currentStory?.mediaType === 'video' ? videoDuration : imageDuration

  // IMPORTANT: Define navigation callbacks BEFORE useEffects that reference them (TDZ fix)
  const goToNextStory = useCallback(() => {
    setProgress(0)
    // Stop track audio before navigating
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (currentStoryIndex < (currentUser?.stories?.length || 1) - 1) {
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
  }, [currentStoryIndex, currentUserIndex, currentUser?.stories?.length, users.length, onClose])

  const goToPrevStory = useCallback(() => {
    setProgress(0)
    // Stop track audio before navigating
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (currentStoryIndex > 0) {
      // Previous story from same user
      setCurrentStoryIndex(prev => prev - 1)
    } else if (currentUserIndex > 0) {
      // Previous user's last story
      setCurrentUserIndex(prev => prev - 1)
      setCurrentStoryIndex(users[currentUserIndex - 1]?.stories?.length - 1 || 0)
    }
  }, [currentStoryIndex, currentUserIndex, users])

  // Find initial user and story index (for deep links)
  useEffect(() => {
    if (users.length === 0) return
    if (initialStoryId) {
      // Deep link: find the user and story by story ID
      for (let ui = 0; ui < users.length; ui++) {
        const si = users[ui].stories.findIndex(s => s.id === initialStoryId)
        if (si !== -1) {
          setCurrentUserIndex(ui)
          setCurrentStoryIndex(si)
          return
        }
      }
    }
    if (initialUserId) {
      const index = users.findIndex(u => u.profileId === initialUserId)
      if (index !== -1) setCurrentUserIndex(index)
    }
  }, [initialUserId, initialStoryId, users])

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
          if (currentStory?.mediaType === 'video' || hasTrackAudio) {
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

  // Play/pause attached track audio
  useEffect(() => {
    if (!audioRef.current) return
    if (hasTrackAudio) {
      if (isPaused) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(() => {})
      }
    }
  }, [isPaused, hasTrackAudio])

  // Load and auto-play track audio when story changes
  useEffect(() => {
    if (!audioRef.current) return
    console.log('[StoryViewer] Audio check:', { hasTrackAudio, attachedTrack: currentStory?.attachedTrack, storyId: currentStory?.id })
    if (hasTrackAudio) {
      const audioUrl = getIpfsUrl(currentStory!.attachedTrack!.audioUrl!)
      console.log('[StoryViewer] Loading audio:', audioUrl)
      audioRef.current.src = audioUrl
      audioRef.current.muted = isMuted
      audioRef.current.onerror = (e) => console.error('[StoryViewer] Audio load error:', e, audioUrl)
      audioRef.current.oncanplay = () => console.log('[StoryViewer] Audio ready to play')
      audioRef.current.load()
      if (!isPaused) {
        audioRef.current.play().catch((err) => console.error('[StoryViewer] Audio play failed:', err))
      }
    } else {
      // No track audio for this story - stop any playing audio
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [currentStory?.id, hasTrackAudio])

  // Sync mute state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
    }
  }, [isMuted])

  // Track story views + reset reactions on story change
  useEffect(() => {
    if (!currentStory?.id) return
    // Reset reacted emojis for new story
    setReactedEmojis(new Set())
    // Record start time for watch duration
    storyStartTime.current = Date.now()
    // Track view (only once per story per session)
    if (!viewedStories.current.has(currentStory.id)) {
      viewedStories.current.add(currentStory.id)
      viewStory({ variables: { storyId: currentStory.id } }).catch(() => {})
    }
    // Record watch duration when leaving this story
    return () => {
      const watchSeconds = (Date.now() - storyStartTime.current) / 1000
      if (watchSeconds >= 1 && currentStory?.id) {
        recordStoryWatch({ variables: { storyId: currentStory.id, watchDurationSeconds: watchSeconds } }).catch(() => {})
      }
    }
  }, [currentStory?.id])

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
  }, [isOpen, isPaused, currentUserIndex, currentStoryIndex, storyDuration, goToNextStory])

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

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Horizontal swipe threshold
    const swipeThreshold = 50
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold

    if (isHorizontalSwipe) {
      if (deltaX > 0) {
        // Swipe right - go to previous
        goToPrevStory()
      } else {
        // Swipe left - go to next
        goToNextStory()
      }
    }

    // Vertical swipe down to close (like Instagram)
    const isVerticalSwipeDown = deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)
    if (isVerticalSwipeDown) {
      onClose()
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  const handleReaction = async (emoji: string) => {
    if (!currentStory?.id) return
    // Optimistic UI - show reacted immediately
    setReactedEmojis(prev => new Set(prev).add(emoji))
    setShowReactions(false)
    try {
      await reactToStory({ variables: { storyId: currentStory.id, emoji } })
      toast.success(`${emoji}`, { autoClose: 1000, hideProgressBar: true })
    } catch (err: any) {
      // Remove optimistic reaction on error
      setReactedEmojis(prev => { const next = new Set(prev); next.delete(emoji); return next })
      if (err?.message?.includes('Unauthorized') || err?.message?.includes('not authenticated')) {
        toast.info('Sign in to react')
      } else {
        toast.error('Could not react')
      }
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !currentStory?.id) return
    const message = replyText.trim()
    setReplyText('')
    // Send reply as a text reaction (emoji = the message text)
    try {
      await reactToStory({ variables: { storyId: currentStory.id, emoji: `💬 ${message}` } })
      toast.success('Reply sent!', { autoClose: 1500 })
    } catch (err: any) {
      if (err?.message?.includes('Unauthorized') || err?.message?.includes('not authenticated')) {
        toast.info('Sign in to reply')
      } else {
        toast.error('Could not send reply')
      }
    }
  }

  const handleMakePermanent = () => {
    setIsPaused(true) // Pause the story while modal is open
    setShowPermanentModal(true)
  }

  const handlePermanentSuccess = () => {
    // Update the story to show as permanent in UI
    // This will be handled by the refetch in the mutation
    setShowPermanentModal(false)
    setIsPaused(false)
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

  // Stop audio when viewer closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [isOpen])

  if (!isOpen || !currentUser || !currentStory) return null

  // Generate identicon URL for wallet users without profile pictures
  const getAvatarUrl = (user: StoryUser) => {
    if (user.profilePicture) return user.profilePicture
    // Use dicebear for wallet-based identicons
    const seed = user.profileId || user.userHandle || 'default'
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=0f0f0f`
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center">
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            {/* Avatar - uses identicon for wallet users */}
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-[2px] cursor-pointer"
              onClick={(e) => { e.stopPropagation(); router.push(`/dex/users/${currentUser.userHandle}`) }}
            >
              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden">
                <img
                  src={getAvatarUrl(currentUser)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to letter if image fails
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-bold text-white">${currentUser.displayName?.charAt(0) || '?'}</span>`
                  }}
                />
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
            {/* Mute - for video or stories with attached track audio */}
            {(currentStory.mediaType === 'video' || hasTrackAudio) && (
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

        {/* Media - convert IPFS URLs to gateway URLs, embed URLs use ReactPlayer */}
        {isEmbedUrl(currentStory.mediaUrl) ? (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <ReactPlayer
              url={currentStory.mediaUrl}
              playing={!isPaused}
              muted={isMuted}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
              playsinline
              onEnded={goToNextStory}
              onDuration={(dur) => setVideoDuration(dur * 1000)}
              config={{
                youtube: { playerVars: { autoplay: 1, modestbranding: 1, rel: 0, playsinline: 1, controls: 0 } },
                vimeo: { playerOptions: { autoplay: true, playsinline: true } },
              }}
            />
          </div>
        ) : currentStory.mediaType === 'image' ? (
          <img
            src={getIpfsUrl(currentStory.mediaUrl)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            src={getIpfsUrl(currentStory.mediaUrl)}
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            playsInline
            onEnded={goToNextStory}
          />
        )}

        {/* Hidden audio element for attached track playback */}
        <audio ref={audioRef} preload="auto" crossOrigin="anonymous" style={{ display: 'none' }} />

        {/* Text overlays from Reels 2.0 */}
        {currentStory.overlays && currentStory.overlays.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {currentStory.overlays.map((overlay, index) => {
              if (overlay.type === 'nft_badge') {
                // Parse NFT badge content
                try {
                  const badgeData = JSON.parse(overlay.content)
                  return (
                    <div
                      key={index}
                      className="absolute left-4 right-4 flex items-center gap-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm pointer-events-auto"
                      style={{
                        left: `${overlay.positionX}%`,
                        top: `${overlay.positionY}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <img
                        src={getIpfsUrl(badgeData.artworkUrl, '/default-pictures/album-artwork.png')}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{badgeData.title}</p>
                        <p className="text-neutral-400 text-[10px] truncate">{badgeData.artist}</p>
                      </div>
                      <div className="px-1.5 py-0.5 rounded bg-purple-500 text-[9px] font-bold text-white">
                        SCID
                      </div>
                    </div>
                  )
                } catch {
                  return null
                }
              }

              // Text overlay
              return (
                <div
                  key={index}
                  className="absolute whitespace-pre-wrap"
                  style={{
                    left: `${overlay.positionX}%`,
                    top: `${overlay.positionY}%`,
                    transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg)`,
                    fontSize: overlay.fontSize || 24,
                    color: overlay.color || '#FFFFFF',
                    fontFamily: overlay.fontFamily || 'sans-serif',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                >
                  {overlay.type === 'hashtag' ? (
                    <span className="text-cyan-400 font-semibold">{overlay.content}</span>
                  ) : overlay.type === 'mention' ? (
                    <span className="text-purple-400 font-semibold">{overlay.content}</span>
                  ) : (
                    overlay.content
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Attached track badge (if has NFT music) */}
        {currentStory.attachedTrack && (
          <div
            className="absolute bottom-32 left-4 right-4 z-30 flex items-center gap-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              if (hasTrackAudio) setIsMuted(prev => !prev)
            }}
          >
            <div className="relative">
              <img
                src={getIpfsUrl(currentStory.attachedTrack.artworkUrl, '/default-pictures/album-artwork.png')}
                alt=""
                className="w-10 h-10 rounded object-cover"
              />
              {hasTrackAudio && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-white/80" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{currentStory.attachedTrack.title || 'Unknown Track'}</p>
              <p className="text-neutral-400 text-[10px] truncate">{currentStory.attachedTrack.artist || 'Unknown Artist'}</p>
            </div>
            {hasTrackAudio && !isMuted ? (
              <div className="flex items-center gap-0.5">
                <div className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
                <div className="w-0.5 h-4 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                <div className="w-0.5 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            ) : (
              <Music2 className="w-4 h-4 text-purple-400" />
            )}
          </div>
        )}

        {/* SCID Reward Tracker */}
        <ReelSCidTracker
          storyId={currentStory.id}
          isPermanent={currentStory.isPermanent || false}
          isScidEligible={currentStory.scidEligible || false}
          isPaused={isPaused}
          onQualified={(scid) => console.log('[StoryViewer] SCID earned:', scid)}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

        {/* Premium Interaction Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-40 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Stats Row - Views and reactions */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5 text-white/70">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{currentStory.viewCount.toLocaleString()}</span>
            </div>
            {currentStory.reactions.length > 0 && (
              <div className="flex items-center gap-2">
                {currentStory.reactions.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <span className="text-sm">{r.emoji}</span>
                    <span className="text-white/70 text-xs font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Interaction Bar - Premium Glass Design */}
          <div className="relative">
            {/* Glow effect behind bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-xl rounded-2xl" />

            {/* Main bar container */}
            <div className="relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {/* Left side - Primary actions */}
              <div className="flex items-center gap-1">
                {/* Like Button - Animated */}
                <button
                  onClick={() => handleReaction('❤️')}
                  className={`group relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                    reactedEmojis.has('❤️') ? 'bg-pink-500/20' : 'hover:bg-white/10'
                  }`}
                >
                  <div className="relative">
                    <Heart className={`w-5 h-5 transition-all duration-300 group-active:scale-90 ${
                      reactedEmojis.has('❤️') ? 'text-pink-400 fill-pink-400 scale-110' : 'text-white group-hover:text-pink-400 group-hover:scale-110'
                    }`} />
                    {/* Pulse effect on hover */}
                    <div className="absolute inset-0 rounded-full bg-pink-500/50 scale-0 group-hover:scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md" />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${
                    reactedEmojis.has('❤️') ? 'text-pink-400' : 'text-white/80 group-hover:text-white'
                  }`}>
                    {(currentStory.reactions.find(r => r.emoji === '❤️')?.count || 0) + (reactedEmojis.has('❤️') ? 1 : 0)}
                  </span>
                </button>

                {/* Comment/Reply Button */}
                <button
                  onClick={() => document.getElementById('story-reply-input')?.focus()}
                  className="group flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-all duration-300"
                >
                  <MessageCircle className="w-5 h-5 text-white group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-300" />
                </button>

                {/* Repost Button */}
                <button
                  onClick={() => { console.log('Repost story:', currentStory?.id); toast.info('Repost coming soon!') }}
                  className="group flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-all duration-300"
                >
                  <Repeat2 className="w-5 h-5 text-white group-hover:text-green-400 group-hover:scale-110 group-hover:rotate-180 transition-all duration-500" />
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                    showShareMenu ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10 text-white'
                  }`}
                >
                  <Share2 className="w-5 h-5 group-hover:scale-110 transition-all duration-300" />
                </button>
              </div>

              {/* Center - Quick Reactions */}
              <div className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                {['🔥', '🚀', '😂', '💯'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200 text-base ${
                      reactedEmojis.has(emoji) ? 'bg-white/30 scale-125 ring-1 ring-white/30' : 'hover:bg-white/20 hover:scale-125'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Right side - Secondary actions */}
              <div className="flex items-center gap-1">
                {/* Bookmark/Save */}
                <button
                  onClick={() => toast.info('Save feature coming soon!')}
                  className="group flex items-center px-2 py-2 rounded-xl hover:bg-white/10 transition-all duration-300"
                >
                  <Bookmark className="w-5 h-5 text-white group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300" />
                </button>

                {/* Download (if permanent) */}
                {currentStory.isPermanent && (
                  <button
                    onClick={() => {
                      window.open(currentStory.mediaUrl, '_blank')
                      toast.success('Opening media...')
                    }}
                    className="group flex items-center px-2 py-2 rounded-xl hover:bg-white/10 transition-all duration-300"
                  >
                    <Download className="w-5 h-5 text-white group-hover:text-purple-400 group-hover:scale-110 group-hover:translate-y-0.5 transition-all duration-300" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reply Input - Sleek Design */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative group">
              <input
                id="story-reply-input"
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                placeholder="Send a message..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-cyan-500/50 focus:bg-white/15 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300"
              />
              {/* Input glow on focus */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-md -z-10" />
            </div>

            {/* Send Button - Animated */}
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                replyText.trim()
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <Send className={`w-4 h-4 transition-transform duration-300 ${replyText.trim() ? 'text-white translate-x-0.5' : ''}`} />
            </button>
          </div>

          {/* Make Permanent CTA - Only for YOUR OWN stories, not shared content */}
          {!currentStory.isPermanent && !currentStory.attachedTrack && currentUser.profileId === me?.profile?.id && (
            <button
              onClick={(e) => { e.stopPropagation(); handleMakePermanent() }}
              className="group relative w-full py-2.5 rounded-xl overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30 animate-gradient-x" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

              {/* Border glow */}
              <div className="absolute inset-0 rounded-xl border border-amber-500/40 group-hover:border-amber-400/60 transition-colors" />

              {/* Content */}
              <div className="relative flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:animate-pulse" />
                <span className="text-amber-400 text-sm font-semibold tracking-wide">Make This Reel Permanent</span>
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:animate-pulse" />
              </div>
            </button>
          )}

          {/* Share Menu Dropdown - Positioned above interaction bar */}
          {showShareMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 p-2 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
              <button
                onClick={handleShareNative}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/90 hover:bg-white/10 transition-colors text-sm"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                Share Story
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/90 hover:bg-white/10 transition-colors text-sm"
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
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/90 hover:bg-white/10 transition-colors text-sm"
              >
                <Twitter className="w-4 h-4 text-blue-400" />
                Share to X
              </button>
            </div>
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

      {/* Make Story Permanent Modal */}
      {currentStory && (
        <MakeStoryPermanentModal
          isOpen={showPermanentModal}
          onClose={() => {
            setShowPermanentModal(false)
            setIsPaused(false)
          }}
          storyId={currentStory.id}
          mediaSize={currentStory.mediaSize || 0}
          onSuccess={handlePermanentSuccess}
        />
      )}
    </div>
  )
}
