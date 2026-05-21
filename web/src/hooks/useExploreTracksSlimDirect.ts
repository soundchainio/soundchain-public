/**
 * Phase 7e — Vercel-direct replacement for `useExploreTracksSlimQuery`.
 *
 * GET /api/tracks/explore?limit=N&cursor=X&search=Q
 * Returns Apollo contract `data.exploreTracks = { nodes, pageInfo }`.
 */
import { useEffect, useState } from 'react'

type ExploreTrackNode = {
  id: string
  title?: string | null
  artist?: string | null
  artworkUrl?: string | null
  playbackUrl?: string | null
  assetUrl?: string | null
  createdAt: any
  isFavorite?: boolean | null
  trackEditionId?: string | null
  editionSize?: number | null
  genres?: Array<string> | null
  nftData?: { tokenId?: string | null; contract?: string | null } | null
}

type ApolloShape = {
  exploreTracks: {
    nodes: ExploreTrackNode[]
    pageInfo: { hasNextPage: boolean; endCursor?: string | null; totalCount: number }
  }
}

const fetchPage = async (limit: number, search?: string, cursor?: string | null): Promise<{ nodes: ExploreTrackNode[]; endCursor: string | null; hasNextPage: boolean; totalCount: number } | null> => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (search) params.set('search', search)
  if (cursor) params.set('cursor', cursor)
  try {
    const r = await fetch(`/api/tracks/explore?${params}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    if (!Array.isArray(json?.nodes)) return null
    return {
      nodes: json.nodes,
      endCursor: json?.pageInfo?.endCursor || null,
      hasNextPage: !!json?.pageInfo?.hasNextPage,
      totalCount: Number(json?.pageInfo?.totalCount || json.nodes.length),
    }
  } catch {
    return null
  }
}

export const useExploreTracksSlim = (opts?: { first?: number; search?: string; genre?: string; skip?: boolean }): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const first = opts?.first ?? 50
  const search = opts?.search || ''
  const skip = !!opts?.skip
  const [nodes, setNodes] = useState<ExploreTrackNode[]>([])
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPage(first, search).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('explore tracks load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setEndCursor(res.endCursor)
      setHasNextPage(res.hasNextPage)
      setTotalCount(res.totalCount)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [first, search, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    exploreTracks: { nodes, pageInfo: { totalCount, hasNextPage, endCursor } },
  } : undefined
  const fetchMore = async (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? endCursor
    if (!after) return
    const res = await fetchPage(nextLimit, search, after)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setEndCursor(res.endCursor)
    setHasNextPage(res.hasNextPage)
    setTotalCount(res.totalCount)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

// Apollo-shape wrapper for non-slim useExploreTracksQuery — accepts
// `variables: { search, page }` shape directly.
export const useExploreTracks = (opts?: {
  variables?: { search?: string; page?: { first?: number; after?: string | null } }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { search?: string; page?: { first?: number; after?: string | null } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  return useExploreTracksSlim({
    first: opts?.variables?.page?.first,
    search: opts?.variables?.search,
    skip: opts?.skip,
  })
}
