import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, ChevronLeft, ChevronRight, Lock, Sparkles } from 'lucide-react'
import { Avatar } from 'components/Avatar'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { StoryViewer } from './StoryViewer'
import { CreateStoryModal } from './CreateStoryModal'
import { gql, useQuery } from '@apollo/client'

// GraphQL query for public stories
const PUBLIC_STORIES = gql`
  query publicStories($limit: Int) {
    publicStories(limit: $limit) {
      id
      profileId
      mediaUrl
      mediaType
      caption
      duration
      createdAt
      expiresAt
      isPermanent
      viewCount
      isGuest
      walletAddress
      creatorDisplayName
      creatorUserHandle
      creatorAvatarUrl
      profile {
        id
        userHandle
        displayName
        profilePicture
      }
    }
  }
`


interface Story {
  id: string
  profileId: string
  profilePicture?: string
  displayName?: string
  userHandle: string
  hasUnwatched: boolean
  isPermanent?: boolean
  storyCount: number
  isGuest?: boolean
  walletAddress?: string
}

// Gradient colors for users without profile pictures
const GRADIENT_COLORS = [
  'from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500', 'from-cyan-500 to-blue-500',
  'from-green-500 to-emerald-500', 'from-yellow-500 to-orange-500', 'from-red-500 to-pink-500',
  'from-indigo-500 to-purple-500', 'from-teal-500 to-cyan-500', 'from-amber-500 to-yellow-500',
]

interface StoriesBarProps {
  onCreateStory?: () => void
  onViewStory?: (profileId: string) => void
}

export const StoriesBar = ({ onCreateStory, onViewStory }: StoriesBarProps) => {
  const meData = useMe()
  const me = meData?.me
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  // Fetch real stories from API
  const { data: storiesData, loading: storiesLoading, refetch: refetchStories } = useQuery(PUBLIC_STORIES, {
    variables: { limit: 50 },
    fetchPolicy: 'network-only',  // Always fetch fresh data
  })


  // Transform API data to Story format, grouped by profile
  // Only shows REAL stories - no placeholders
  const stories: Story[] = useMemo(() => {
    if (!storiesData?.publicStories || storiesData.publicStories.length === 0) {
      return []
    }

    // Group stories by profileId (or walletAddress for guests)
    const grouped = storiesData.publicStories.reduce((acc: any, story: any) => {
      // For guest stories, use walletAddress as key; for registered users, use profileId
      const isGuest = story.isGuest || !story.profileId
      const key = isGuest ? `guest-${story.walletAddress}` : story.profileId

      if (!acc[key]) {
        // Prefer denormalized creator fields (helix pattern), fallback to profile field resolver
        const avatarUrl = story.creatorAvatarUrl || story.profile?.profilePicture
        const displayName = story.creatorDisplayName || story.profile?.displayName
        const userHandle = story.creatorUserHandle || story.profile?.userHandle

        acc[key] = {
          id: story.id,
          profileId: key, // Use the key as profileId for consistency
          profilePicture: isGuest ? undefined : avatarUrl,
          displayName: isGuest
            ? `${story.walletAddress?.slice(0, 6)}...${story.walletAddress?.slice(-4)}`
            : displayName,
          userHandle: isGuest
            ? story.walletAddress?.slice(0, 8) || 'guest'
            : userHandle || 'user',
          hasUnwatched: true, // TODO: track viewed stories
          isPermanent: story.isPermanent,
          storyCount: 1,
          isGuest,
          walletAddress: story.walletAddress,
        }
      } else {
        acc[key].storyCount++
        if (story.isPermanent) acc[key].isPermanent = true
      }
      return acc
    }, {})

    return Object.values(grouped) as Story[]
  }, [storiesData])

  // Transform stories into StoryUser format for StoryViewer
  const storyUsersForViewer = useMemo(() => {
    if (!storiesData?.publicStories || storiesData.publicStories.length === 0) {
      return []
    }

    // Group raw story data by profileId for the viewer
    const grouped = storiesData.publicStories.reduce((acc: any, story: any) => {
      const isGuest = story.isGuest || !story.profileId
      const key = isGuest ? `guest-${story.walletAddress}` : story.profileId

      // Prefer denormalized creator fields (helix pattern), fallback to profile field resolver
      const avatarUrl = story.creatorAvatarUrl || story.profile?.profilePicture
      const displayName = story.creatorDisplayName || story.profile?.displayName
      const userHandle = story.creatorUserHandle || story.profile?.userHandle

      if (!acc[key]) {
        acc[key] = {
          profileId: key,
          profilePicture: isGuest ? undefined : avatarUrl,
          displayName: isGuest
            ? `${story.walletAddress?.slice(0, 6)}...${story.walletAddress?.slice(-4)}`
            : displayName || userHandle,
          userHandle: isGuest
            ? story.walletAddress?.slice(0, 8) || 'guest'
            : userHandle || 'user',
          stories: [],
        }
      }

      // Add the story to this user's stories array
      acc[key].stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType || 'image',
        createdAt: story.createdAt,
        isPermanent: story.isPermanent,
        viewCount: story.viewCount || 0,
        reactions: [],
      })

      return acc
    }, {})

    return Object.values(grouped)
  }, [storiesData])

  // Set up portal container on mount (client-side only)
  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 200
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const handleCreateStory = () => {
    if (onCreateStory) {
      onCreateStory()
    } else {
      setShowCreateStory(true)
    }
  }

  const handleViewStory = (story: Story) => {
    if (onViewStory) {
      onViewStory(story.profileId)
    } else {
      setSelectedUserId(story.profileId)
      setShowStoryViewer(true)
    }
  }

  return (
    <div className="relative w-full py-2 bg-black/40 backdrop-blur-sm border-b border-white/5">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-full border border-white/10 text-white/70 hover:text-white hover:border-cyan-500/50 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-full border border-white/10 text-white/70 hover:text-white hover:border-cyan-500/50 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Stories scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 sm:gap-3 px-2 sm:px-4 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Your Story - Create new */}
        <button
          onClick={handleCreateStory}
          className="flex flex-col items-center gap-1 flex-shrink-0 group"
        >
          <div className="relative">
            {/* Outer ring - dashed for "add" state */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-cyan-500/50 group-hover:border-cyan-400 transition-colors flex items-center justify-center">
              {/* Avatar or placeholder */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
                {me?.profile?.profilePicture ? (
                  <img
                    src={me.profile.profilePicture}
                    alt="Your story"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base sm:text-lg font-bold text-white/50">
                    {me?.profile?.displayName?.charAt(0) || me?.profile?.userHandle?.charAt(0) || '+'}
                  </span>
                )}
              </div>
            </div>
            {/* Plus button */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center ring-2 ring-black">
              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
          </div>
          <span className="text-[9px] sm:text-[10px] text-gray-400 group-hover:text-cyan-400 transition-colors">Your Story</span>
        </button>

        {/* Other users' stories */}
        {stories.map((story) => {
          // Get gradient class for placeholder users
          const gradientClass = (story as any)._gradientClass || 'from-purple-500 to-pink-500'
          const isPlaceholder = story.id.startsWith('placeholder-')

          return (
            <button
              key={story.id}
              onClick={() => !isPlaceholder && handleViewStory(story)}
              className={`flex flex-col items-center gap-1 flex-shrink-0 group ${isPlaceholder ? 'opacity-60 hover:opacity-100' : ''}`}
            >
              <div className="relative">
                {/* Gradient ring - colorful if unwatched, gray if watched */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] transition-all ${
                    story.hasUnwatched
                      ? 'bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 group-hover:from-cyan-400 group-hover:via-purple-400 group-hover:to-pink-400'
                      : 'bg-gradient-to-tr from-gray-600 to-gray-700'
                  }`}
                >
                  {/* Inner black ring */}
                  <div className="w-full h-full rounded-full p-[2px] bg-black">
                    {/* Avatar */}
                    <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-neutral-900">
                      <img
                        src={story.profilePicture || `https://api.dicebear.com/7.x/identicon/svg?seed=${story.profileId || story.walletAddress || 'default'}&backgroundColor=0f0f0f`}
                        alt={story.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent badge */}
                {story.isPermanent && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center ring-2 ring-black" title="Permanent Reel">
                    <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                  </div>
                )}

                {/* Multiple stories indicator */}
                {story.storyCount > 1 && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded-full bg-black/80 backdrop-blur-sm border border-white/10">
                    <span className="text-[7px] sm:text-[8px] text-cyan-400 font-medium">{story.storyCount}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] text-gray-400 group-hover:text-white transition-colors max-w-[50px] sm:max-w-[60px] truncate">
                {story.displayName || story.userHandle}
              </span>
            </button>
          )
        })}

        {/* "See All" button at end */}
        <button
          onClick={() => router.push('/dex/stories')}
          className="flex flex-col items-center gap-1 flex-shrink-0 group px-2"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <span className="text-[9px] sm:text-[10px] text-gray-500 group-hover:text-cyan-400 transition-colors">See All</span>
        </button>
      </div>

      {/* Subtle bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Story Viewer Modal - rendered via portal to escape stacking context */}
      {portalContainer && showStoryViewer && createPortal(
        <StoryViewer
          isOpen={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
          initialUserId={selectedUserId}
          users={storyUsersForViewer as any}
        />,
        portalContainer
      )}

      {/* Create Story Modal - rendered via portal to escape stacking context */}
      {portalContainer && showCreateStory && createPortal(
        <CreateStoryModal
          isOpen={showCreateStory}
          onClose={() => setShowCreateStory(false)}
          onPublish={() => {
            // Refetch stories after publishing
            setShowCreateStory(false)
            // Refetch stories after a short delay to ensure server has processed
            setTimeout(() => refetchStories(), 1000)
          }}
        />,
        portalContainer
      )}
    </div>
  )
}
