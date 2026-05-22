/**
 * Phase 7e — Vercel-direct replacement for `useListingItemsQuery`.
 *
 * GET /api/marketplace/listings
 *   ?sort=newest|cheapest|expensive
 *   ?limit=20&cursor=xxx
 *   ?profileId=xxx — listings by seller
 *
 * Returns Apollo contract `data.listingItems = { nodes: TrackWithListingItem[], pageInfo }`.
 */
import { useEffect, useState } from 'react'

type ApolloShape = {
  listingItems: {
    nodes: any[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

type Filter = { profileId?: string; trackEditionId?: string }
type Sort = string | { field?: string; order?: string }
type Page = { first?: number; after?: string | null }

const sortToParam = (sort?: Sort): string => {
  if (!sort) return 'newest'
  if (typeof sort === 'string') return sort
  if (sort.field === 'pricePerItem' && sort.order === 'ASC') return 'cheapest'
  if (sort.field === 'pricePerItem' && sort.order === 'DESC') return 'expensive'
  return 'newest'
}

const fetchListings = async (filter: Filter | undefined, sort: Sort | undefined, limit: number, cursor?: string | null): Promise<{ nodes: any[]; endCursor: string | null; hasNextPage: boolean; totalCount: number } | null> => {
  const params = new URLSearchParams({ limit: String(limit) })
  params.set('sort', sortToParam(sort))
  if (filter?.profileId) params.set('profileId', filter.profileId)
  if (filter?.trackEditionId) params.set('trackEditionId', filter.trackEditionId)
  if (cursor) params.set('cursor', cursor)
  try {
    const r = await fetch(`/api/marketplace/listings?${params}`, { credentials: 'include' })
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

export const useListingItems = (opts?: {
  variables?: { filter?: Filter; sort?: Sort; page?: Page }
  skip?: boolean
  ssr?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
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
  const [nodes, setNodes] = useState<any[]>([])
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
    fetchListings(filter, sort, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('listings load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setEndCursor(res.endCursor)
      setHasNextPage(res.hasNextPage)
      setTotalCount(res.totalCount)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    listingItems: { nodes, pageInfo: { totalCount, hasNextPage, endCursor } },
  } : undefined
  const fetchMore = async (args?: { variables?: { filter?: Filter; sort?: Sort; page?: Page } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? endCursor
    if (!after) return
    const res = await fetchListings(args?.variables?.filter ?? filter, args?.variables?.sort ?? sort, nextLimit, after)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setEndCursor(res.endCursor)
    setHasNextPage(res.hasNextPage)
    setTotalCount(res.totalCount + nodes.length)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}
