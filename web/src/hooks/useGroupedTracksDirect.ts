/**
 * Phase 7e — Vercel-direct replacement for `useGroupedTracksQuery`.
 *
 * GET /api/tracks/list?profileId=xxx | ?owner=xxx | (none for global)
 * Returns the Apollo contract `data.groupedTracks = { nodes, pageInfo }`.
 *
 * Supports the three filter shapes the original GraphQL caller used:
 *   - filter.profileId            → tracks by creator
 *   - filter.nftData.owner        → NFTs owned by wallet
 *   - (no filter)                 → global track list
 *
 * Sort is fixed to the endpoint's default (CreatedAt DESC) — every existing
 * caller passes the same sort, so the variable is accepted for compatibility
 * but not forwarded. fetchMore drives cursor pagination via the endpoint's
 * `pageInfo.endCursor`.
 */
import { useEffect, useState } from 'react'
import type { Track } from 'lib/graphql'

type GroupedTrack = Partial<Track> & { id: string }

type ApolloShape = {
  groupedTracks: {
    nodes: GroupedTrack[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

type Filter = { profileId?: string; nftData?: { owner?: string } }
type Sort = { field?: string; order?: string }
type Page = { first?: number; after?: string | null }

const buildUrl = (filter?: Filter, limit?: number, cursor?: string | null): string => {
  const params = new URLSearchParams()
  if (filter?.profileId) params.set('profileId', filter.profileId)
  else if (filter?.nftData?.owner) params.set('owner', filter.nftData.owner)
  if (limit) params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  return `/api/tracks/list?${params}`
}

const fetchPage = async (filter: Filter | undefined, limit: number, cursor?: string | null): Promise<{ nodes: GroupedTrack[]; endCursor: string | null; hasNextPage: boolean } | null> => {
  try {
    const r = await fetch(buildUrl(filter, limit, cursor), { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    if (!Array.isArray(json?.nodes)) return null
    return {
      nodes: json.nodes as GroupedTrack[],
      endCursor: json?.pageInfo?.endCursor || null,
      hasNextPage: !!json?.pageInfo?.hasNextPage,
    }
  } catch {
    return null
  }
}

export const useGroupedTracks = (opts?: {
  variables?: { filter?: Filter; sort?: Sort; page?: Page }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const filter = opts?.variables?.filter
  const first = opts?.variables?.page?.first ?? 20
  const skip = !!opts?.skip
  const filterKey = JSON.stringify(filter || {})
  const [nodes, setNodes] = useState<GroupedTrack[]>([])
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPage(filter, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('grouped tracks load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setEndCursor(res.endCursor)
      setHasNextPage(res.hasNextPage)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, first, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    groupedTracks: {
      nodes,
      pageInfo: { hasNextPage, endCursor, totalCount: nodes.length },
    },
  } : undefined
  const fetchMore = async (args?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? endCursor
    if (!after && !args?.variables?.filter) return
    const res = await fetchPage(args?.variables?.filter ?? filter, nextLimit, after)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setEndCursor(res.endCursor)
    setHasNextPage(res.hasNextPage)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

// Lazy variant for callers that defer load until trigger
type LazyResult = { data: ApolloShape | undefined; loading: boolean; called: boolean }
type LazyTrigger = (opts?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => Promise<void>

export const useGroupedTracksLazy = (): [LazyTrigger, LazyResult] => {
  const [data, setData] = useState<ApolloShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyTrigger = async (opts) => {
    const filter = opts?.variables?.filter
    const first = opts?.variables?.page?.first ?? 20
    setLoading(true)
    setCalled(true)
    const res = await fetchPage(filter, first)
    if (res) {
      setData({
        groupedTracks: {
          nodes: res.nodes,
          pageInfo: { hasNextPage: res.hasNextPage, endCursor: res.endCursor, totalCount: res.nodes.length },
        },
      })
    }
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}
