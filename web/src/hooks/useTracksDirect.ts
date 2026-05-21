/**
 * Phase 7e — Vercel-direct replacement for `useTrackQuery` + `useTracksQuery`
 * + `useTracksLazyQuery`.
 *
 * useTrack    — single track by id        → /api/tracks/list?trackId=
 * useTracks   — many tracks w/ filters    → /api/tracks/list?profileId=|owner=|genre=|trackEditionId=
 * useTracksLazy — on-demand trigger
 *
 * Result shape matches Apollo:
 *   useTrack    → { data: { track: Track } }
 *   useTracks   → { data: { tracks: { nodes, pageInfo } } }
 */
import { useEffect, useState } from 'react'
import type { Track } from 'lib/graphql'

type TrackSlim = Partial<Track> & { id: string }

type TracksShape = {
  tracks: {
    nodes: TrackSlim[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

type TrackShape = { track: TrackSlim | null }

type Filter = { profileId?: string; nftData?: { owner?: string }; trackEditionId?: string; genres?: string[] }
type Sort = { field?: string; order?: string }
type Page = { first?: number; after?: string | null }

const sortToParam = (sort?: Sort): string => {
  if (!sort) return 'newest'
  // SortTrackField.PlaybackCount → popular
  if (sort.field === 'playbackCount' || sort.field === 'PlaybackCount') return 'popular'
  if (sort.order === 'ASC' || sort.order === 'Asc') return 'oldest'
  return 'newest'
}

const buildListUrl = (filter?: Filter, sort?: Sort, limit?: number, cursor?: string | null): string => {
  const params = new URLSearchParams()
  if (filter?.profileId) params.set('profileId', filter.profileId)
  if (filter?.nftData?.owner) params.set('owner', filter.nftData.owner)
  if (filter?.trackEditionId) params.set('trackEditionId', filter.trackEditionId)
  if (filter?.genres?.[0]) params.set('genre', filter.genres[0])
  params.set('sort', sortToParam(sort))
  if (limit) params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  return `/api/tracks/list?${params}`
}

const fetchList = async (filter: Filter | undefined, sort: Sort | undefined, limit: number, cursor?: string | null): Promise<{ nodes: TrackSlim[]; endCursor: string | null; hasNextPage: boolean } | null> => {
  try {
    const r = await fetch(buildListUrl(filter, sort, limit, cursor), { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    if (!Array.isArray(json?.nodes)) return null
    return {
      nodes: json.nodes as TrackSlim[],
      endCursor: json?.pageInfo?.endCursor || null,
      hasNextPage: !!json?.pageInfo?.hasNextPage,
    }
  } catch {
    return null
  }
}

// --- useTracks (eager) ---
export const useTracks = (opts?: {
  variables?: { filter?: Filter; sort?: Sort; page?: Page }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: TracksShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const filter = opts?.variables?.filter
  const sort = opts?.variables?.sort
  const first = opts?.variables?.page?.first ?? 20
  const skip = !!opts?.skip
  const cacheKey = JSON.stringify({ filter, sort, first })
  const [nodes, setNodes] = useState<TrackSlim[]>([])
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchList(filter, sort, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('tracks load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setEndCursor(res.endCursor)
      setHasNextPage(res.hasNextPage)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, skip, bust])
  const data: TracksShape | undefined = nodes.length > 0 || !loading ? {
    tracks: {
      nodes,
      pageInfo: { hasNextPage, endCursor, totalCount: nodes.length },
    },
  } : undefined
  const fetchMore = async (args?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? endCursor
    if (!after) return
    const res = await fetchList(args?.variables?.filter ?? filter, args?.variables?.sort ?? sort, nextLimit, after)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setEndCursor(res.endCursor)
    setHasNextPage(res.hasNextPage)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

// --- useTracksLazy ---
type LazyTracksResult = { data: TracksShape | undefined; loading: boolean; called: boolean }
type LazyTracksTrigger = (opts?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => Promise<void>

export const useTracksLazy = (): [LazyTracksTrigger, LazyTracksResult] => {
  const [data, setData] = useState<TracksShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyTracksTrigger = async (opts) => {
    const filter = opts?.variables?.filter
    const sort = opts?.variables?.sort
    const first = opts?.variables?.page?.first ?? 20
    setLoading(true)
    setCalled(true)
    const res = await fetchList(filter, sort, first)
    if (res) {
      setData({
        tracks: {
          nodes: res.nodes,
          pageInfo: { hasNextPage: res.hasNextPage, endCursor: res.endCursor, totalCount: res.nodes.length },
        },
      })
    }
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}

// --- useTrack (single track by id) ---
const trackCache = new Map<string, { value: TrackSlim | null; ts: number }>()
const TRACK_FRESH_MS = 60_000

const fetchTrack = async (trackId: string): Promise<TrackSlim | null> => {
  const hit = trackCache.get(trackId)
  if (hit && Date.now() - hit.ts < TRACK_FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/tracks/list?trackId=${encodeURIComponent(trackId)}`, { credentials: 'include' })
    if (!r.ok) {
      trackCache.set(trackId, { value: null, ts: Date.now() })
      return null
    }
    const json = await r.json()
    // /api/tracks/list?trackId=xxx returns the track at the top-level or as
    // first node depending on shape — handle both
    const track: TrackSlim | null = json?.id ? (json as TrackSlim) : (Array.isArray(json?.nodes) && json.nodes[0]) || null
    trackCache.set(trackId, { value: track, ts: Date.now() })
    return track
  } catch {
    return null
  }
}

export const useTrack = (opts: {
  variables?: { id?: string }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: TrackShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const id = opts?.variables?.id || ''
  const skip = !!opts?.skip || !id
  const [data, setData] = useState<TrackShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchTrack(id).then((track) => {
      if (cancelled) return
      setData({ track })
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, skip, bust])
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, refetch }
}
