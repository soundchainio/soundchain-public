/**
 * Phase 7e — Vercel-direct replacement for `usePostsQuery` + `useFeedQuery`.
 *
 * GET /api/feed/posts
 *   ?profileId=xxx   — feed for a specific profile (own or other)
 *   ?mode=personal   — return followed-only fan-out (vs default global firehose)
 *   ?limit=25
 *   ?cursor=ISO_DATETIME
 *
 * Returns Apollo contract `data.posts = { nodes, pageInfo }`.
 */
import { useEffect, useState } from 'react'

type Filter = { profileId?: string }
type Page = { first?: number; after?: string | null }

type ApolloShape = {
  posts: {
    nodes: any[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

const fetchPosts = async (filter: Filter | undefined, limit: number, cursor?: string | null, mode?: string): Promise<{ nodes: any[]; endCursor: string | null; hasNextPage: boolean } | null> => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (filter?.profileId) params.set('profileId', filter.profileId)
  if (cursor) params.set('cursor', cursor)
  if (mode) params.set('mode', mode)
  try {
    const r = await fetch(`/api/feed/posts?${params}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    const nodes = Array.isArray(json?.posts) ? json.posts : Array.isArray(json?.nodes) ? json.nodes : []
    return {
      nodes,
      endCursor: json?.endCursor || json?.pageInfo?.endCursor || null,
      hasNextPage: !!(json?.hasNextPage || json?.pageInfo?.hasNextPage),
    }
  } catch {
    return null
  }
}

export const usePosts = (opts?: {
  variables?: { filter?: Filter; sort?: any; page?: Page }
  skip?: boolean
  ssr?: boolean
  errorPolicy?: string
  fetchPolicy?: string
  mode?: 'global' | 'personal'
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { filter?: Filter; page?: Page } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const filter = opts?.variables?.filter
  const first = opts?.variables?.page?.first ?? 25
  const skip = !!opts?.skip
  const mode = opts?.mode
  const filterKey = JSON.stringify({ filter, first, mode })
  const [nodes, setNodes] = useState<any[]>([])
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPosts(filter, first, null, mode).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('posts load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setEndCursor(res.endCursor)
      setHasNextPage(res.hasNextPage)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    posts: {
      nodes,
      pageInfo: { hasNextPage, endCursor, totalCount: nodes.length },
    },
  } : undefined
  const fetchMore = async (args?: { variables?: { filter?: Filter; page?: Page } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? endCursor
    if (!after) return
    const res = await fetchPosts(args?.variables?.filter ?? filter, nextLimit, after, mode)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setEndCursor(res.endCursor)
    setHasNextPage(res.hasNextPage)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

// useFeed = personal-mode wrapper (followed-only fan-out)
type FeedShape = {
  feed: {
    nodes: any[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

export const useFeed = (opts?: {
  variables?: { page?: Page }
  skip?: boolean
}): {
  data: FeedShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: Page } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const inner = usePosts({ variables: opts?.variables, skip: opts?.skip, mode: 'personal' })
  const data: FeedShape | undefined = inner.data ? { feed: inner.data.posts } : undefined
  return {
    data,
    loading: inner.loading,
    error: inner.error,
    fetchMore: inner.fetchMore,
    refetch: inner.refetch,
  }
}
