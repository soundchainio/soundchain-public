import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Sparkles, Film, Users } from 'lucide-react'
import { gql, useQuery } from '@apollo/client'
import { useFollowing as useFollowingQuery } from 'hooks/useUsersSocialDirect'  // Phase 7e — Vercel-direct
import { StoryViewer } from './StoryViewer'

// Single query for all public stories — no auth required
// We filter client-side for both "Their Reels" (by profileId) and "Their Circle" (by following)
const PUBLIC_STORIES = gql`
  query publicStoriesForProfile($limit: Int) {
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
      creatorDisplayName
      creatorUserHandle
      creatorAvatarUrl
      attachedTrackId
      attachedTrackIpfsUrl
      attachedTrackTitle
      attachedTrackArtist
      attachedTrackCoverUrl
      profile {
        id
        userHandle
        displayName
        profilePicture
      }
    }
  }
`

interface ProfileReelsProps {
  profileId: string
  profileHandle: string
  profileDisplayName?: string
  profilePicture?: string
}

interface StoryBubble {
  id: string
  profileId: string
  profilePicture?: string
  displayName?: string
  userHandle: string
  isPermanent?: boolean
  storyCount: number
  latestMediaUrl?: string
  latestMediaType?: string
}

const getAvatarUrl = (profilePicture?: string, seed?: string): string => {
  if (profilePicture && profilePicture.length > 0) return profilePicture
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed || 'default')}&backgroundColor=0f0f0f`
}

const ReelRow = ({
  title,
  icon,
  bubbles,
  accentColor,
  storyUsers,
  emptyMessage,
}: {
  title: string
  icon: React.ReactNode
  bubbles: StoryBubble[]
  accentColor: string
  storyUsers: any[]
  emptyMessage: string
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    setShowRightArrow(el.scrollWidth > el.clientWidth)
  }, [bubbles])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -180 : 180,
      behavior: 'smooth',
    })
  }

  const handleViewStory = (bubble: StoryBubble) => {
    setSelectedUserId(bubble.profileId)
    setShowStoryViewer(true)
  }

  if (bubbles.length === 0) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2 px-1">
          {icon}
          <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</h4>
        </div>
        <div className="text-center py-3 text-gray-600 text-xs">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</h4>
        <span className="text-gray-600 text-xs">{bubbles.length}</span>
      </div>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center bg-black/80 rounded-full border border-white/10 text-white/70 hover:text-white transition-all"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center bg-black/80 rounded-full border border-white/10 text-white/70 hover:text-white transition-all"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {bubbles.map((bubble) => (
            <button
              key={bubble.id}
              onClick={() => handleViewStory(bubble)}
              className="flex flex-col items-center gap-1 flex-shrink-0 group"
            >
              <div className="relative">
                <div className={`w-14 h-14 rounded-full p-[2px] transition-all bg-gradient-to-tr ${accentColor} group-hover:opacity-80`}>
                  <div className="w-full h-full rounded-full p-[2px] bg-black">
                    <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
                      <img
                        src={getAvatarUrl(bubble.profilePicture, bubble.profileId)}
                        alt={bubble.displayName || bubble.userHandle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getAvatarUrl(undefined, bubble.profileId)
                        }}
                      />
                    </div>
                  </div>
                </div>
                {bubble.isPermanent && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center ring-2 ring-black">
                    <Sparkles className="w-2 h-2 text-white" />
                  </div>
                )}
                {bubble.storyCount > 1 && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded-full bg-black/80 border border-white/10">
                    <span className="text-[7px] text-cyan-400 font-medium">{bubble.storyCount}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-gray-400 group-hover:text-white transition-colors max-w-[52px] truncate">
                {bubble.displayName || bubble.userHandle}
              </span>
            </button>
          ))}
        </div>
      </div>

      {portalContainer && showStoryViewer && createPortal(
        <StoryViewer
          isOpen={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
          initialUserId={selectedUserId}
          users={storyUsers as any}
        />,
        portalContainer
      )}
    </div>
  )
}

export const ProfileReels = ({ profileId, profileHandle, profileDisplayName, profilePicture }: ProfileReelsProps) => {
  // Single public stories query — no auth required (userStories has @Authorized which fails before JWT restores)
  const { data: publicStoriesData } = useQuery(PUBLIC_STORIES, {
    variables: { limit: 200 },
    skip: !profileId,
    fetchPolicy: 'cache-and-network',
  })

  // Following — Phase 7e Vercel-direct
  const { data: followingData } = useFollowingQuery({
    profileId,
    first: 200,
    skip: !profileId,
  })

  const followingIds = useMemo(() => {
    return (followingData?.following?.nodes || []).map((f: any) => f.id)
  }, [followingData])

  // Helper to map a story to StoryViewer format
  const mapStory = (s: any) => ({
    id: s.id,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType || 'image',
    caption: s.caption || undefined,
    createdAt: s.createdAt,
    duration: s.duration || undefined,
    isPermanent: s.isPermanent,
    viewCount: s.viewCount || 0,
    reactions: s.reactions || [],
    ...(s.attachedTrackId ? {
      attachedTrack: {
        id: s.attachedTrackId,
        title: s.attachedTrackTitle,
        artist: s.attachedTrackArtist,
        artworkUrl: s.attachedTrackCoverUrl,
        audioUrl: s.attachedTrackIpfsUrl,
      }
    } : {}),
  })

  // Filter public stories to find THIS profile's stories (Their Reels)
  const ownStories = useMemo(() => {
    const allStories = publicStoriesData?.publicStories || []
    return allStories.filter((s: any) => {
      const storyProfileId = s.profileId || s.profile?.id
      return storyProfileId === profileId
    })
  }, [publicStoriesData, profileId])

  // Transform this profile's stories into a single bubble
  const theirReelsBubbles: StoryBubble[] = useMemo(() => {
    if (ownStories.length === 0) return []
    return [{
      id: profileId,
      profileId,
      profilePicture,
      displayName: profileDisplayName || profileHandle,
      userHandle: profileHandle,
      isPermanent: ownStories.some((s: any) => s.isPermanent),
      storyCount: ownStories.length,
      latestMediaUrl: ownStories[0]?.mediaUrl,
      latestMediaType: ownStories[0]?.mediaType,
    }]
  }, [ownStories, profileId, profileHandle, profileDisplayName, profilePicture])

  // StoryViewer format for Their Reels
  const theirReelsStoryUsers = useMemo(() => {
    if (ownStories.length === 0) return []
    return [{
      profileId,
      profilePicture,
      displayName: profileDisplayName || profileHandle,
      userHandle: profileHandle,
      stories: ownStories.map(mapStory),
    }]
  }, [ownStories, profileId, profileHandle, profileDisplayName, profilePicture])

  // Filter public stories to only include stories from people this profile follows
  const circleStoriesBubbles: StoryBubble[] = useMemo(() => {
    if (!followingIds || followingIds.length === 0) return []
    const allStories = publicStoriesData?.publicStories || []
    const followingSet = new Set(followingIds)

    const filtered = allStories.filter((s: any) => {
      const storyProfileId = s.profileId || s.profile?.id
      return storyProfileId && storyProfileId !== profileId && followingSet.has(storyProfileId)
    })

    const grouped: Record<string, StoryBubble & { _stories: any[] }> = {}
    for (const story of filtered) {
      const pid = story.profileId || story.profile?.id
      const avatar = story.creatorAvatarUrl || story.profile?.profilePicture
      const name = story.creatorDisplayName || story.profile?.displayName
      const handle = story.creatorUserHandle || story.profile?.userHandle
      if (!grouped[pid]) {
        grouped[pid] = {
          id: pid,
          profileId: pid,
          profilePicture: avatar || undefined,
          displayName: name || handle || 'user',
          userHandle: handle || name || 'user',
          isPermanent: story.isPermanent,
          storyCount: 1,
          _stories: [story],
        }
      } else {
        grouped[pid].storyCount++
        grouped[pid]._stories.push(story)
        if (story.isPermanent) grouped[pid].isPermanent = true
      }
    }

    return Object.values(grouped)
  }, [publicStoriesData, followingIds, profileId])

  // StoryViewer format for Their Circle
  const circleStoryUsers = useMemo(() => {
    if (!followingIds || followingIds.length === 0) return []
    const allStories = publicStoriesData?.publicStories || []
    const followingSet = new Set(followingIds)

    const filtered = allStories.filter((s: any) => {
      const storyProfileId = s.profileId || s.profile?.id
      return storyProfileId && storyProfileId !== profileId && followingSet.has(storyProfileId)
    })

    const grouped: Record<string, any> = {}
    for (const story of filtered) {
      const pid = story.profileId || story.profile?.id
      const avatar = story.creatorAvatarUrl || story.profile?.profilePicture
      const name = story.creatorDisplayName || story.profile?.displayName
      const handle = story.creatorUserHandle || story.profile?.userHandle

      if (!grouped[pid]) {
        grouped[pid] = {
          profileId: pid,
          profilePicture: avatar || undefined,
          displayName: name || handle || 'user',
          userHandle: handle || name || 'user',
          stories: [],
        }
      }
      grouped[pid].stories.push(mapStory(story))
    }

    return Object.values(grouped)
  }, [publicStoriesData, followingIds, profileId])

  const hasReels = theirReelsBubbles.length > 0
  const hasCircle = circleStoriesBubbles.length > 0

  return (
    <div className="mb-4 bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/5">
      <ReelRow
        title={`${profileDisplayName || profileHandle}'s Reels`}
        icon={<Film className="w-3.5 h-3.5 text-cyan-400" />}
        bubbles={theirReelsBubbles}
        accentColor="from-cyan-500 via-purple-500 to-pink-500"
        storyUsers={theirReelsStoryUsers}
        emptyMessage="No reels yet — create a story to start"
      />
      <ReelRow
        title={`${profileDisplayName || profileHandle}'s Circle`}
        icon={<Users className="w-3.5 h-3.5 text-purple-400" />}
        bubbles={circleStoriesBubbles}
        accentColor="from-purple-500 via-pink-500 to-orange-500"
        storyUsers={circleStoryUsers}
        emptyMessage="No circle stories yet"
      />
    </div>
  )
}
