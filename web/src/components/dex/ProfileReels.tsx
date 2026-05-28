import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { ChevronLeft, ChevronRight, Sparkles, Film, Users, Plus, X, Search, UserPlus, Check, Loader2 } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { useFollowing as useFollowingQuery } from 'hooks/useUsersSocialDirect'  // Phase 7e — Vercel-direct
import { StoryViewer } from './StoryViewer'
import { CreateStoryModal } from './CreateStoryModal'

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
  hasStory: boolean
}

const getAvatarUrl = (profilePicture?: string, seed?: string): string => {
  if (profilePicture && profilePicture.length > 0) return profilePicture
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed || 'default')}&backgroundColor=0f0f0f`
}

// Map a raw /api/feed/stories story → StoryViewer StoryItem shape
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
  ...(s.attachedTrackIpfsUrl || s.attachedTrack?.audioUrl ? {
    attachedTrack: {
      id: s.attachedTrackId || s.attachedTrack?.id || 'wall-audio',
      title: s.attachedTrackTitle || s.attachedTrack?.title,
      artist: s.attachedTrackArtist || s.attachedTrack?.artist,
      artworkUrl: s.attachedTrackCoverUrl || s.attachedTrack?.coverUrl,
      audioUrl: s.attachedTrackIpfsUrl || s.attachedTrack?.audioUrl,
    },
  } : {}),
})

const storyProfileIdOf = (s: any): string | undefined => s.profileId || s.profile?.id

const ReelRow = ({
  title,
  icon,
  bubbles,
  accentColor,
  emptyMessage,
  leadingButton,
  manageMode,
  onBubbleClick,
  onRemove,
}: {
  title: string
  icon: React.ReactNode
  bubbles: StoryBubble[]
  accentColor: string
  emptyMessage: string
  leadingButton?: React.ReactNode
  manageMode?: boolean
  onBubbleClick: (bubble: StoryBubble) => void
  onRemove?: (bubble: StoryBubble) => void
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

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
    scrollRef.current.scrollBy({ left: direction === 'left' ? -180 : 180, behavior: 'smooth' })
  }

  const isEmpty = bubbles.length === 0 && !leadingButton

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</h4>
        {bubbles.length > 0 && <span className="text-gray-600 text-xs">{bubbles.length}</span>}
      </div>

      {isEmpty ? (
        <div className="text-center py-3 text-gray-600 text-xs">{emptyMessage}</div>
      ) : (
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
            {leadingButton}
            {bubbles.map((bubble) => (
              <div key={bubble.id} className="relative flex-shrink-0">
                <button
                  onClick={() => onBubbleClick(bubble)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="relative">
                    <div
                      className={`w-14 h-14 rounded-full p-[2px] transition-all group-hover:opacity-80 ${
                        bubble.hasStory ? `bg-gradient-to-tr ${accentColor}` : 'bg-gradient-to-tr from-gray-600 to-gray-700'
                      }`}
                    >
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
                {manageMode && onRemove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(bubble) }}
                    title="Remove from circle"
                    className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center ring-2 ring-black z-10"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Inline "Add to Circle" modal — search users (Vercel-direct) + follow
const AddCircleModal = ({
  isOpen,
  onClose,
  followingIds,
  onChanged,
}: {
  isOpen: boolean
  onClose: () => void
  followingIds: Set<string>
  onChanged: () => void
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [localFollowed, setLocalFollowed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]); setLocalFollowed(new Set()) }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/users/explore?search=${encodeURIComponent(q)}&limit=20`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => { if (!cancelled) setResults(data?.nodes || []) })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, isOpen])

  const handleFollow = async (id: string) => {
    if (pendingId) return
    setPendingId(id)
    try {
      const r = await fetch('/api/follow/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followedId: id, action: 'follow' }),
      })
      if (r.ok) {
        setLocalFollowed(prev => new Set(prev).add(id))
        onChanged()
      }
    } finally {
      setPendingId(null)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#0b0f1c] to-[#06070d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Add to your Circle</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @handle"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-3 pb-3 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-6 text-gray-600 text-xs">No users found</div>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="text-center py-6 text-gray-600 text-xs">Type at least 2 characters to search</div>
          )}
          {results.map((u) => {
            const already = followingIds.has(u.id) || localFollowed.has(u.id)
            return (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 flex-shrink-0">
                  <img
                    src={getAvatarUrl(u.profilePicture, u.id)}
                    alt={u.displayName || u.userHandle}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getAvatarUrl(undefined, u.id) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{u.displayName || u.userHandle}</p>
                  <p className="text-xs text-gray-500 truncate">@{u.userHandle}</p>
                </div>
                <button
                  onClick={() => !already && handleFollow(u.id)}
                  disabled={already || pendingId === u.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                    already
                      ? 'bg-green-500/15 text-green-400 cursor-default'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                  }`}
                >
                  {pendingId === u.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : already ? (
                    <><Check className="w-3 h-3" /> In Circle</>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> Add</>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export const ProfileReels = ({ profileId, profileHandle, profileDisplayName, profilePicture }: ProfileReelsProps) => {
  const me = useMe()
  const router = useRouter()
  const isOwnProfile = !!me?.profile?.id && me.profile.id === profileId

  // Stories — Vercel-direct (api.soundchain.io / Apollo publicStories is down)
  const [storiesRaw, setStoriesRaw] = useState<any[]>([])
  const fetchStories = useCallback(() => {
    fetch('/api/feed/stories?limit=200')
      .then(r => r.json())
      .then(data => setStoriesRaw(data?.stories || []))
      .catch(() => {})
  }, [])
  useEffect(() => { fetchStories() }, [fetchStories])

  // Following — Phase 7e Vercel-direct
  const { data: followingData, refetch: refetchFollowing } = useFollowingQuery({
    profileId,
    first: 200,
    skip: !profileId,
  })

  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showAddCircle, setShowAddCircle] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => { setPortalContainer(document.body) }, [])

  // Circle members = everyone this profile follows (the inner circle). FIX: use
  // followedProfile.id, not the follow-edge id (n.id) — the old code matched edge
  // ids against story profile ids so the circle was always empty.
  const circleMembers = useMemo(() => {
    return (followingData?.following?.nodes || [])
      .map((n: any) => n.followedProfile)
      .filter((p: any) => p && p.id)
      .map((p: any) => ({
        id: p.id,
        userHandle: p.userHandle || '',
        displayName: p.displayName || p.userHandle || 'user',
        profilePicture: p.profilePicture || undefined,
      }))
  }, [followingData])

  const followingIdSet = useMemo(() => new Set(circleMembers.map((m: any) => m.id)), [circleMembers])

  // Group active stories by profile id
  const storiesByProfile = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const s of storiesRaw) {
      const pid = storyProfileIdOf(s)
      if (!pid) continue
      if (!map[pid]) map[pid] = []
      map[pid].push(s)
    }
    return map
  }, [storiesRaw])

  // THIS profile's own stories → the reels avatar pill
  const ownStories = storiesByProfile[profileId] || []
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
      hasStory: true,
    }]
  }, [ownStories, profileId, profileHandle, profileDisplayName, profilePicture])

  // Circle bubbles = all followed friends; story ring + tappable when they have an active story
  const circleBubbles: StoryBubble[] = useMemo(() => {
    return circleMembers
      .map((m: any) => {
        const memberStories = storiesByProfile[m.id] || []
        // prefer denormalized creator avatar from the story if profile pic is missing
        const avatar = m.profilePicture || memberStories[0]?.creatorAvatarUrl || memberStories[0]?.profile?.profilePicture
        return {
          id: m.id,
          profileId: m.id,
          profilePicture: avatar,
          displayName: m.displayName,
          userHandle: m.userHandle,
          isPermanent: memberStories.some((s: any) => s.isPermanent),
          storyCount: memberStories.length,
          hasStory: memberStories.length > 0,
        }
      })
      // friends with active stories first, then the rest of the circle
      .sort((a: StoryBubble, b: StoryBubble) => Number(b.hasStory) - Number(a.hasStory))
  }, [circleMembers, storiesByProfile])

  // StoryViewer data — all active stories grouped by profile (own + circle)
  const allStoryUsers = useMemo(() => {
    const grouped: Record<string, any> = {}
    for (const s of storiesRaw) {
      const pid = storyProfileIdOf(s)
      if (!pid) continue
      if (!grouped[pid]) {
        grouped[pid] = {
          profileId: pid,
          profilePicture: s.creatorAvatarUrl || s.profile?.profilePicture || undefined,
          displayName: s.creatorDisplayName || s.profile?.displayName || s.creatorUserHandle || 'user',
          userHandle: s.creatorUserHandle || s.profile?.userHandle || 'user',
          stories: [],
        }
      }
      grouped[pid].stories.push(mapStory(s))
    }
    return Object.values(grouped)
  }, [storiesRaw])

  const handleBubbleClick = (bubble: StoryBubble) => {
    if (bubble.hasStory) {
      setSelectedUserId(bubble.profileId)
      setShowStoryViewer(true)
    } else if (bubble.userHandle) {
      router.push(`/users/${bubble.userHandle}`)
    }
  }

  const handleRemoveFromCircle = async (bubble: StoryBubble) => {
    if (removingId) return
    setRemovingId(bubble.id)
    try {
      const r = await fetch('/api/follow/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followedId: bubble.id, action: 'unfollow' }),
      })
      if (r.ok) await refetchFollowing()
    } finally {
      setRemovingId(null)
    }
  }

  const createReelButton = isOwnProfile ? (
    <button
      onClick={() => setShowCreateStory(true)}
      className="flex flex-col items-center gap-1 flex-shrink-0 group"
    >
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-cyan-500/50 group-hover:border-cyan-400 transition-colors flex items-center justify-center relative">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
          {profilePicture ? (
            <img src={profilePicture} alt="Add reel" className="w-full h-full object-cover" />
          ) : (
            <Plus className="w-5 h-5 text-cyan-400" />
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center ring-2 ring-black">
          <Plus className="w-3 h-3 text-white" />
        </div>
      </div>
      <span className="text-[9px] text-cyan-400 max-w-[52px] truncate">Add Reel</span>
    </button>
  ) : undefined

  const addCircleButton = isOwnProfile ? (
    <button
      onClick={() => setShowAddCircle(true)}
      className="flex flex-col items-center gap-1 flex-shrink-0 group"
    >
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-purple-500/50 group-hover:border-purple-400 transition-colors flex items-center justify-center">
        <UserPlus className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
      </div>
      <span className="text-[9px] text-purple-400 max-w-[52px] truncate">Add</span>
    </button>
  ) : undefined

  const reelsTitle = isOwnProfile ? 'Your Reels' : `${profileDisplayName || profileHandle}'s Reels`
  const circleTitle = isOwnProfile ? 'Your Circle' : `${profileDisplayName || profileHandle}'s Circle`

  return (
    <div className="mb-4 bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/5">
      <ReelRow
        title={reelsTitle}
        icon={<Film className="w-3.5 h-3.5 text-cyan-400" />}
        bubbles={theirReelsBubbles}
        accentColor="from-cyan-500 via-purple-500 to-pink-500"
        emptyMessage={isOwnProfile ? 'Tap + to create your first reel' : 'No reels yet'}
        leadingButton={createReelButton}
        onBubbleClick={handleBubbleClick}
      />
      <ReelRow
        title={circleTitle}
        icon={<Users className="w-3.5 h-3.5 text-purple-400" />}
        bubbles={circleBubbles}
        accentColor="from-purple-500 via-pink-500 to-orange-500"
        emptyMessage={isOwnProfile ? 'Tap + to add friends to your circle' : 'No one in their circle yet'}
        leadingButton={addCircleButton}
        manageMode={isOwnProfile}
        onBubbleClick={handleBubbleClick}
        onRemove={handleRemoveFromCircle}
      />

      {portalContainer && showStoryViewer && createPortal(
        <StoryViewer
          isOpen={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
          initialUserId={selectedUserId}
          users={allStoryUsers as any}
        />,
        portalContainer,
      )}

      {portalContainer && showCreateStory && createPortal(
        <CreateStoryModal
          isOpen={showCreateStory}
          onClose={() => setShowCreateStory(false)}
          onPublish={() => {
            setShowCreateStory(false)
            setTimeout(() => fetchStories(), 1000)
          }}
        />,
        portalContainer,
      )}

      <AddCircleModal
        isOpen={showAddCircle}
        onClose={() => setShowAddCircle(false)}
        followingIds={followingIdSet}
        onChanged={() => refetchFollowing()}
      />
    </div>
  )
}
