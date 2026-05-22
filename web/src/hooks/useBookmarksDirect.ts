/**
 * Phase 7e — Vercel-direct replacement for `useMyBookmarksQuery`.
 *
 * GET /api/bookmarks/list
 * Returns Apollo contract `data.myBookmarks = { nodes, pageInfo }`.
 */
import { useEffect, useState } from 'react'

type BookmarkNode = {
  id: string
  postId: string
  createdAt: string | null
  post: any
}

type ApolloShape = {
  myBookmarks: {
    nodes: BookmarkNode[]
    pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean }
  }
}

const fetchBookmarks = async (limit: number, cursor?: string | null): Promise<{ nodes: BookmarkNode[]; hasNextPage: boolean; totalCount: number } | null> => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  try {
    const r = await fetch(`/api/bookmarks/list?${params}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return {
      nodes: Array.isArray(json?.nodes) ? json.nodes : [],
      hasNextPage: !!json?.pageInfo?.hasNextPage,
      totalCount: Number(json?.pageInfo?.totalCount || (json?.nodes?.length || 0)),
    }
  } catch {
    return null
  }
}

export const useMyBookmarks = (opts?: {
  variables?: { page?: { first?: number; after?: string | null } }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const first = opts?.variables?.page?.first ?? 20
  const skip = !!opts?.skip
  const [nodes, setNodes] = useState<BookmarkNode[]>([])
  const [hasNextPage, setHasNextPage] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchBookmarks(first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('bookmarks load failed')); setLoading(false); return }
      setNodes(res.nodes)
      setHasNextPage(res.hasNextPage)
      setTotalCount(res.totalCount)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [first, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    myBookmarks: { nodes, pageInfo: { totalCount, hasNextPage, hasPreviousPage: false } },
  } : undefined
  const fetchMore = async (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => {
    const nextLimit = args?.variables?.page?.first ?? first
    const after = args?.variables?.page?.after ?? (nodes.length > 0 ? nodes[nodes.length - 1].id : null)
    if (!after) return
    const res = await fetchBookmarks(nextLimit, after)
    if (!res) return
    setNodes((cur) => [...cur, ...res.nodes])
    setHasNextPage(res.hasNextPage)
    setTotalCount(res.totalCount + nodes.length)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}
