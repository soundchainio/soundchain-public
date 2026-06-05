import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { ChevronLeft, ChevronRight, Sparkles, Film, Users, Plus, X, Search, UserPlus, Check, Loader2, Pencil } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { useFollowing as useFollowingQuery } from 'hooks/useUsersSocialDirect'  // Phase 7e — Vercel-direct
import { usePointerReorder } from 'hooks/usePointerReorder'
import { StoryViewer } from './StoryViewer'
import { CreateStoryModal } from './CreateStoryModal'

interface ProfileReelsProps {
  profileId: string
  profileHandle: string
  profileDisplayName?: string
  profilePicture?: string
  // Curated "My Circle" = the profile's topFriends ids (NOT the follow list).
  circleIds?: string[]
}

interface CircleProfile {
  id: string
  userHandle: string
  displayName: string
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
                              const img = e.target as HTMLImageElement
                              if (img.dataset.fb) return // fall back at most once — never loop the console
                              img.dataset.fb = '1'
                              img.src = '/default-pictures/profile/red.png'
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

// One circle avatar — tap goes straight to the user's wall (Frank's ask).
// Story ring stays as a decorative "has a live reel" indicator; it does NOT
// hijack the tap into the StoryViewer anymore.
const CircleAvatar = ({
  bubble,
  manageMode,
  removing,
  dragging,
  itemProps,
  onOpen,
  onRemove,
}: {
  bubble: StoryBubble
  manageMode?: boolean
  removing?: boolean
  dragging?: boolean
  itemProps?: Record<string, any>
  onOpen: (bubble: StoryBubble) => void
  onRemove?: (bubble: StoryBubble) => void
}) => (
  <div className={`relative flex-shrink-0 transition-opacity ${dragging ? 'opacity-30' : ''}`} {...itemProps}>
    <button
      onClick={() => { if (!manageMode) onOpen(bubble) }}
      className="flex flex-col items-center gap-1 group"
    >
      <div className="relative">
        <div
          className={`w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full p-[2px] transition-all group-hover:opacity-80 ${manageMode ? 'animate-pulse' : ''} ${
            bubble.hasStory
              ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
              : 'bg-gradient-to-tr from-gray-600 to-gray-700'
          }`}
        >
          <div className="w-full h-full rounded-full p-[2px] bg-black">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
              <img
                src={getAvatarUrl(bubble.profilePicture, bubble.profileId)}
                alt={bubble.displayName || bubble.userHandle}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement
                  if (img.dataset.fb) return // fall back at most once — never loop the console
                  img.dataset.fb = '1'
                  img.src = '/default-pictures/profile/red.png'
                }}
              />
            </div>
          </div>
        </div>
        {bubble.storyCount > 1 && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded-full bg-black/80 border border-white/10">
            <span className="text-[7px] text-cyan-400 font-medium">{bubble.storyCount}</span>
          </div>
        )}
      </div>
      <span className="text-[9px] text-gray-400 group-hover:text-white transition-colors max-w-[40px] sm:max-w-[52px] lg:max-w-[64px] truncate">
        {bubble.displayName || bubble.userHandle}
      </span>
    </button>
    {manageMode && onRemove && (
      <button
        data-no-drag
        onClick={(e) => { e.stopPropagation(); onRemove(bubble) }}
        title="Remove from circle"
        disabled={removing}
        className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center ring-2 ring-black z-10 disabled:opacity-50"
      >
        <X className="w-2.5 h-2.5 text-white" />
      </button>
    )}
  </div>
)

// Inner circle = a capped 2-row stack (7 top / 8 bottom = 15), IG-style.
// NOT every follow — just the first 15. Each avatar taps through to the wall.
const CircleGrid = ({
  title,
  icon,
  bubbles,
  totalCount,
  emptyMessage,
  manageMode,
  removingId,
  dragId,
  getItemProps,
  addButton,
  leadingPill,
  onOpen,
  onRemove,
}: {
  title: string
  icon: React.ReactNode
  bubbles: StoryBubble[]
  totalCount: number
  emptyMessage: string
  manageMode?: boolean
  removingId?: string | null
  dragId?: string | null
  getItemProps?: (id: string) => Record<string, any>
  addButton?: React.ReactNode
  leadingPill?: React.ReactNode
  onOpen: (bubble: StoryBubble) => void
  onRemove?: (bubble: StoryBubble) => void
}) => {
  // The "+" pill takes the first slot of the top row when present (so 6 + 8 = 14
  // members + 1 pill = 15 slots); otherwise a clean 7 + 8 = 15.
  const cap = leadingPill ? 14 : 15
  const topCount = leadingPill ? 6 : 7
  const capped = bubbles.slice(0, cap)
  const topRow = capped.slice(0, topCount)
  const bottomRow = capped.slice(topCount, cap)

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</h4>
        {totalCount > 0 && <span className="text-gray-600 text-xs">{totalCount}/15</span>}
        {addButton && <div className="ml-auto">{addButton}</div>}
      </div>

      {!leadingPill && capped.length === 0 ? (
        <div className="text-center py-3 text-gray-600 text-xs">{emptyMessage}</div>
      ) : (
        <>
          {/* Mobile — stacked 7 / 8, centered (the look Frank approved) */}
          <div className="md:hidden flex flex-col items-center gap-2 px-1">
            <div className="flex justify-center gap-1 sm:gap-3">
              {leadingPill}
              {topRow.map((b) => (
                <CircleAvatar key={b.id} bubble={b} manageMode={manageMode} removing={removingId === b.id} dragging={dragId === b.id} itemProps={getItemProps?.(b.id)} onOpen={onOpen} onRemove={onRemove} />
              ))}
            </div>
            {bottomRow.length > 0 && (
              <div className="flex justify-center gap-1 sm:gap-3">
                {bottomRow.map((b) => (
                  <CircleAvatar key={b.id} bubble={b} manageMode={manageMode} removing={removingId === b.id} dragging={dragId === b.id} itemProps={getItemProps?.(b.id)} onOpen={onOpen} onRemove={onRemove} />
                ))}
              </div>
            )}
          </div>
          {/* Desktop — ONE row, left to right (scrolls if the circle gets full) */}
          <div className="hidden md:flex items-start gap-4 lg:gap-5 px-1 overflow-x-auto">
            {leadingPill}
            {capped.map((b) => (
              <CircleAvatar key={b.id} bubble={b} manageMode={manageMode} removing={removingId === b.id} dragging={dragId === b.id} itemProps={getItemProps?.(b.id)} onOpen={onOpen} onRemove={onRemove} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Inline "Add to Circle" modal — search users (Vercel-direct) + add to the
// curated circle (writes topFriends, NEVER follows/unfollows). Add is instant.
const AddCircleModal = ({
  isOpen,
  onClose,
  circleIds,
  onAdd,
}: {
  isOpen: boolean
  onClose: () => void
  circleIds: Set<string>
  onAdd: (p: CircleProfile) => void
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [localAdded, setLocalAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]); setLocalAdded(new Set()) }
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

  const handleAdd = (u: any) => {
    if (circleIds.has(u.id) || localAdded.has(u.id)) return
    setLocalAdded(prev => new Set(prev).add(u.id))
    onAdd({
      id: u.id,
      userHandle: u.userHandle || '',
      displayName: u.displayName || u.userHandle || 'user',
      profilePicture: u.profilePicture || undefined,
    })
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
            const already = circleIds.has(u.id) || localAdded.has(u.id)
            return (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 flex-shrink-0">
                  <img
                    src={getAvatarUrl(u.profilePicture, u.id)}
                    alt={u.displayName || u.userHandle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      if (img.dataset.fb) return
                      img.dataset.fb = '1'
                      img.src = '/default-pictures/profile/red.png'
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{u.displayName || u.userHandle}</p>
                  <p className="text-xs text-gray-500 truncate">@{u.userHandle}</p>
                </div>
                <button
                  onClick={() => !already && handleAdd(u)}
                  disabled={already}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                    already
                      ? 'bg-green-500/15 text-green-400 cursor-default'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                  }`}
                >
                  {already ? (
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

export const ProfileReels = ({ profileId, profileHandle, profileDisplayName, profilePicture, circleIds }: ProfileReelsProps) => {
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

  // "My Circle" is a CURATED list (the profile's topFriends), NOT the follow list.
  // Frank's directive: never load the full following list here; start empty, add via
  // the inline "+" pill, remove instantly — writes topFriends, never (un)follows.

  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showAddCircle, setShowAddCircle] = useState(false)
  const [circleEdit, setCircleEdit] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => { setPortalContainer(document.body) }, [])

  // Curated circle source = topFriends. Own profile prefers /api/me's topFriends
  // (most reliable Vercel-direct source); otherwise the circleIds prop (the viewed
  // profile's topFriends).
  const sourceCircleIds = useMemo(() => {
    const own = (me?.profile as any)?.topFriends
    const ids = (isOwnProfile && Array.isArray(own) ? own : circleIds) || []
    return ids.filter(Boolean) as string[]
  }, [isOwnProfile, me?.profile, circleIds])

  // Resolved members (id/handle/name/pic). Starts EMPTY; resolved from the curated
  // ids Vercel-direct (/api/profile/<id>). After mount, local add/remove mutate this
  // directly — instant, no full-following reload, ever.
  const [circleProfiles, setCircleProfiles] = useState<CircleProfile[]>([])
  const resolvedKeyRef = useRef<string>('')
  useEffect(() => {
    const key = sourceCircleIds.join(',')
    if (key === resolvedKeyRef.current) return
    resolvedKeyRef.current = key
    if (sourceCircleIds.length === 0) { setCircleProfiles([]); return }
    let cancelled = false
    Promise.all(sourceCircleIds.map((id) =>
      fetch(`/api/profile/${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.profile)
        .catch(() => null)
    )).then((profs) => {
      if (cancelled) return
      const ordered = sourceCircleIds
        .map((id) => {
          const p = profs.find((x: any) => x && (x.id === id || x._id === id))
          return p ? { id, userHandle: p.userHandle || '', displayName: p.displayName || p.userHandle || 'user', profilePicture: p.profilePicture || undefined } : null
        })
        .filter(Boolean) as CircleProfile[]
      setCircleProfiles(ordered)
    })
    return () => { cancelled = true }
  }, [sourceCircleIds])

  const circleIdSet = useMemo(() => new Set(circleProfiles.map((m) => m.id)), [circleProfiles])

  // Persist the curated circle to topFriends (Vercel-direct, own profile only). Bump
  // resolvedKeyRef so the resolver effect won't clobber the optimistic local state.
  const persistCircleIds = useCallback((ids: string[]) => {
    resolvedKeyRef.current = ids.join(',')
    fetch('/api/profile/update', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { topFriends: ids } }),
    }).catch(() => {})
  }, [])
  const persistCircle = useCallback((profiles: CircleProfile[]) => {
    persistCircleIds(profiles.map((p) => p.id))
  }, [persistCircleIds])

  // Reorder the curated circle locally by id order (drag-to-reorder). Guards on
  // length so a stale id list can never silently drop a member.
  const applyCircleOrder = useCallback((ids: string[]) => {
    setCircleProfiles((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]))
      const next = ids.map((id) => byId.get(id)).filter(Boolean) as CircleProfile[]
      return next.length === prev.length ? next : prev
    })
  }, [])

  const handleAddToCircle = useCallback((p: CircleProfile) => {
    setCircleProfiles((prev) => {
      if (prev.some((x) => x.id === p.id) || prev.length >= 15) return prev
      const next = [...prev, p]
      persistCircle(next)
      return next
    })
  }, [persistCircle])

  // Drag-to-reorder the curated circle (own profile, Edit mode only). Desktop =
  // hold mouse + drag; mobile = tap-hold + move. Live reorder while dragging,
  // persist to topFriends on drop.
  const circleOrder = useMemo(() => circleProfiles.map((p) => p.id), [circleProfiles])
  const { dragId, dragPos, getItemProps } = usePointerReorder({
    enabled: isOwnProfile && circleEdit,
    order: circleOrder,
    onReorder: applyCircleOrder,
    onCommit: (ids) => { applyCircleOrder(ids); persistCircleIds(ids) },
  })

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

  // Circle bubbles = curated members; story ring + tappable when they have an active story
  const circleBubbles: StoryBubble[] = useMemo(() => {
    const mapped = circleProfiles.map((m) => {
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
    // In Edit mode show the raw curated order so drag-to-reorder is WYSIWYG.
    // Otherwise float friends-with-active-stories to the front (stable sort keeps
    // the user's chosen order within each group).
    if (isOwnProfile && circleEdit) return mapped
    return mapped.sort((a: StoryBubble, b: StoryBubble) => Number(b.hasStory) - Number(a.hasStory))
  }, [circleProfiles, storiesByProfile, isOwnProfile, circleEdit])

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

  // Open a member's wall. Prefer the handle, but fall back to the profile id
  // when the handle is empty — handles often live on users.handle, NOT
  // profiles.userHandle, so /api/profile/<id> returns a blank userHandle for
  // those users. /users/<id> resolves via the [...slug] page's ObjectId path,
  // so the tap always lands somewhere (was a silent no-op when handle empty).
  const openMemberWall = (bubble: StoryBubble) => {
    const target = bubble.userHandle || bubble.profileId
    if (target) router.push(`/users/${encodeURIComponent(target)}`)
  }

  const handleBubbleClick = (bubble: StoryBubble) => {
    if (bubble.hasStory) {
      setSelectedUserId(bubble.profileId)
      setShowStoryViewer(true)
    } else {
      openMemberWall(bubble)
    }
  }

  // Inner-circle avatars ALWAYS open the user's wall (Frank's directive),
  // regardless of whether they have a live reel.
  const handleCircleOpen = (bubble: StoryBubble) => {
    openMemberWall(bubble)
  }

  // Remove from circle = drop from topFriends. INSTANT (local state), never
  // unfollows, never reloads the following list.
  const handleRemoveFromCircle = (bubble: StoryBubble) => {
    setCircleProfiles((prev) => {
      const next = prev.filter((x) => x.id !== bubble.id)
      persistCircle(next)
      return next
    })
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

  // Circle management lives in the section header (Add + Edit), so the pills
  // themselves stay clean — no red × stamped on every avatar. The remove
  // controls only appear while Edit is on.
  // Blank "+" avatar pill — the primary way to add to the circle (Frank's ask).
  // Always present (own profile) until the circle is full, rendered as the first
  // slot in the grid; tapping opens the search-and-add modal.
  const addCirclePill = isOwnProfile && circleProfiles.length < 15 ? (
    <button
      onClick={() => setShowAddCircle(true)}
      className="flex flex-col items-center gap-1 flex-shrink-0 group"
      title="Add to your circle"
    >
      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-purple-500/50 group-hover:border-purple-400 transition-colors flex items-center justify-center bg-neutral-900/40">
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
      </div>
      <span className="text-[9px] text-purple-400 max-w-[40px] sm:max-w-[52px] truncate">Add</span>
    </button>
  ) : null

  // Edit toggle only — adding happens via the inline "+" pill above.
  const circleHeaderControls = isOwnProfile && circleProfiles.length > 0 ? (
    <div className="flex items-center gap-1.5">
      {circleEdit && circleProfiles.length > 1 && (
        <span className="hidden sm:inline text-[9px] text-cyan-400/70 mr-0.5">drag to reorder</span>
      )}
      <button
        onClick={() => setCircleEdit((v) => !v)}
        className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
          circleEdit
            ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
            : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
        }`}
      >
        {circleEdit ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
        <span className="text-[10px] font-medium">{circleEdit ? 'Done' : 'Edit'}</span>
      </button>
    </div>
  ) : undefined

  const reelsTitle = isOwnProfile ? 'Your Reels' : `${profileDisplayName || profileHandle}'s Reels`
  const circleTitle = isOwnProfile ? 'Your Circle' : `${profileDisplayName || profileHandle}'s Circle`

  return (
    <div className="mb-4 bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/5 md:max-w-2xl">
      <ReelRow
        title={reelsTitle}
        icon={<Film className="w-3.5 h-3.5 text-cyan-400" />}
        bubbles={theirReelsBubbles}
        accentColor="from-cyan-500 via-purple-500 to-pink-500"
        emptyMessage={isOwnProfile ? 'Tap + to create your first reel' : 'No reels yet'}
        leadingButton={createReelButton}
        onBubbleClick={handleBubbleClick}
      />
      <CircleGrid
        title={circleTitle}
        icon={<Users className="w-3.5 h-3.5 text-purple-400" />}
        bubbles={circleBubbles}
        totalCount={circleProfiles.length}
        emptyMessage={isOwnProfile ? 'Tap + to add people to your circle' : 'No one in their circle yet'}
        manageMode={isOwnProfile && circleEdit}
        removingId={removingId}
        dragId={dragId}
        getItemProps={getItemProps}
        addButton={circleHeaderControls}
        leadingPill={addCirclePill}
        onOpen={handleCircleOpen}
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
        circleIds={circleIdSet}
        onAdd={handleAddToCircle}
      />

      {/* Drag ghost — follows the pointer while reordering. pointer-events:none so the
          elementFromPoint hit-test sees the avatar underneath. */}
      {portalContainer && dragId && dragPos && (() => {
        const b = circleBubbles.find((x) => x.id === dragId)
        if (!b) return null
        return createPortal(
          <div
            style={{ position: 'fixed', left: dragPos.x, top: dragPos.y, transform: 'translate(-50%, -50%) scale(1.12)', pointerEvents: 'none', zIndex: 9999 }}
          >
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-500 shadow-2xl shadow-purple-500/50">
              <div className="w-full h-full rounded-full p-[2px] bg-black">
                <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
                  <img src={getAvatarUrl(b.profilePicture, b.profileId)} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>,
          portalContainer,
        )
      })()}
    </div>
  )
}
