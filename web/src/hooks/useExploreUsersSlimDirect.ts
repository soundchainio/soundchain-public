/**
 * Phase 7e — Vercel-direct replacement for `useExploreUsersSlimQuery` +
 * `useExploreUsersLazyQuery`.
 *
 * GET /api/users/explore?limit=N&cursor=X&search=Q
 * Returns Apollo contract `data.exploreUsers = { nodes, pageInfo }`.
 *
 * Supports search debouncing (consumer handles debounce; we just send),
 * fetchMore (cursor pagination), refetch.
 */
import { useEffect, useState } from 'react'

type ExploreUserNode = {
  id: string
  displayName?: string | null
  profilePicture?: string | null
  userHandle?: string | null
  verified?: boolean | null
  followerCount?: number | null
  favoriteGenres?: Array<string> | null
  createdAt: any
}

type ApolloShape = {
  exploreUsers: {
    nodes: ExploreUserNode[]
    pageInfo: { totalCount: number; hasNextPage: boolean; endCursor?: string | null }
  }
}

const fetchPage = async (limit: number, search?: string, cursor?: string | null): Promise<{ nodes: ExploreUserNode[]; endCursor: string | null; hasNextPage: boolean; totalCount: number } | null> => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (search) params.set('search', search)
  if (cursor) params.set('cursor', cursor)
  try {
    const r = await fetch(`/api/users/explore?${params}`, { credentials: 'include' })
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

export const useExploreUsersSlim = (opts?: { first?: number; search?: string; skip?: boolean }): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const first = opts?.first ?? 50
  const search = opts?.search || ''
  const skip = !!opts?.skip
  const [nodes, setNodes] = useState<ExploreUserNode[]>([])
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
      if (!res) { setError(new Error('explore users load failed')); setLoading(false); return }
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
    exploreUsers: { nodes, pageInfo: { totalCount, hasNextPage, endCursor } },
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

// Apollo-shape wrapper for non-slim useExploreUsersQuery — accepts
// `variables: { search, page }` shape directly so callsites can swap with
// minimal edits.
export const useExploreUsers = (opts?: {
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
  return useExploreUsersSlim({
    first: opts?.variables?.page?.first,
    search: opts?.variables?.search,
    skip: opts?.skip,
  })
}

// Lazy variant for MentionAutocomplete (@user search-as-you-type)
export const useExploreUsersLazy = (): [
  (opts: { variables: { search?: string; page?: { first?: number } } }) => Promise<void>,
  { data: ApolloShape | undefined; loading: boolean }
] => {
  const [data, setData] = useState<ApolloShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const trigger = async (opts: { variables: { search?: string; page?: { first?: number } } }) => {
    const search = opts.variables.search || ''
    const first = opts.variables.page?.first ?? 8
    setLoading(true)
    const res = await fetchPage(first, search)
    if (res) {
      setData({
        exploreUsers: {
          nodes: res.nodes,
          pageInfo: { totalCount: res.totalCount, hasNextPage: res.hasNextPage, endCursor: res.endCursor },
        },
      })
    }
    setLoading(false)
  }
  return [trigger, { data, loading }]
}
