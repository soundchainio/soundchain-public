/**
 * Phase 7e — Vercel-direct replacement for `useFavoriteTracksQuery`.
 *
 * GET /api/tracks/list?favorites=true&limit=20&cursor=xxx
 * Returns the Apollo contract `data.favoriteTracks = { nodes, pageInfo }`.
 *
 * Supports first/cursor pagination via fetchMore. Search filter
 * applied client-side (endpoint returns user's favorites; we filter by
 * title/artist substring match for the sidebar + library page).
 *
 * Auth-aware: hook requires cookie auth. Returns empty when unauthed.
 */
import { useEffect, useState } from 'react'
import type { Track } from 'lib/graphql'

// FavoriteTrack matches Apollo's Track shape with all fields optional so
// the endpoint payload (which is a superset of FavoriteTracksQuery's
// projection but a subset of full Track) maps cleanly. Consumers that
// read deeper fields (profile, artworkMedia, etc) get undefined; that's
// graceful — those fields are non-critical UI hints.
type FavoriteTrack = Partial<Track> & { id: string; title?: string | null; artist?: string | null }

type ApolloShape = {
  favoriteTracks: {
    nodes: FavoriteTrack[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

const fetchPage = async (limit: number, cursor?: string): Promise<{ nodes: FavoriteTrack[]; endCursor: string | null; hasNextPage: boolean } | null> => {
  const params = new URLSearchParams({ favorites: 'true', limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  try {
    const r = await fetch(`/api/tracks/list?${params}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    if (!Array.isArray(json?.nodes)) return null
    return {
      nodes: json.nodes as FavoriteTrack[],
      endCursor: json?.pageInfo?.endCursor || null,
      hasNextPage: !!json?.pageInfo?.hasNextPage,
    }
  } catch {
    return null
  }
}

const applySearch = (nodes: FavoriteTrack[], search?: string): FavoriteTrack[] => {
  if (!search?.trim()) return nodes
  const q = search.trim().toLowerCase()
  return nodes.filter((n) => n.title?.toLowerCase().includes(q) || n.artist?.toLowerCase().includes(q))
}

export const useFavoriteTracks = (opts?: { first?: number; search?: string; skip?: boolean }): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const first = opts?.first ?? 20
  const skip = !!opts?.skip
  const [nodes, setNodes] = useState<FavoriteTrack[]>([])
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPage(first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('favorites load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setEndCursor(res.endCursor)
      setHasNextPage(res.hasNextPage)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [first, skip, bust])
  const filtered = applySearch(nodes, opts?.search)
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    favoriteTracks: {
      nodes: filtered,
      pageInfo: { hasNextPage, endCursor, totalCount: filtered.length },
    },
  } : undefined
  const fetchMore = async (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? endCursor
    if (!after) return
    const res = await fetchPage(nextLimit, after)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setEndCursor(res.endCursor)
    setHasNextPage(res.hasNextPage)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}
