/**
 * Phase 7e — Vercel-direct replacement for `useCommentsQuery`.
 *
 * GET /api/feed/comments?postId=<postId>[&limit=N]
 * Returns Apollo contract `data.comments = { nodes, pageInfo }`.
 *
 * Endpoint already projects nested replies (up to 3 per root) + author
 * profile + replyCount, matching CommentComponentFields.
 */
import { useEffect, useState } from 'react'

type CommentNode = {
  id: string
  body: string
  postId: string
  createdAt: string
  deleted: boolean
  isGuest: boolean
  walletAddress: string | null
  replyToId: string | null
  replyCount: number
  profile: {
    id: string
    displayName: string
    profilePicture: string | null
    userHandle: string
    verified: boolean
    teamMember: boolean
    badges: string[]
  } | null
  replies: CommentNode[]
}

type ApolloShape = {
  comments: {
    nodes: CommentNode[]
    pageInfo: { hasPreviousPage: boolean; hasNextPage: boolean; startCursor: string | null; endCursor: string | null }
  }
}

const fetchComments = async (postId: string, limit: number): Promise<CommentNode[] | null> => {
  try {
    const r = await fetch(`/api/feed/comments?postId=${encodeURIComponent(postId)}&limit=${limit}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return Array.isArray(json?.comments) ? json.comments : []
  } catch {
    return null
  }
}

export const useComments = (opts: {
  variables?: { postId?: string; page?: { first?: number; after?: string | null } }
  skip?: boolean
  ssr?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { first?: number; after?: string | null } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const postId = opts?.variables?.postId || ''
  const first = opts?.variables?.page?.first ?? 10
  const skip = !!opts?.skip || !postId
  const [nodes, setNodes] = useState<CommentNode[]>([])
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchComments(postId, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('comments load failed')); setLoading(false); return }
      setNodes(res)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [postId, first, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    comments: {
      nodes,
      pageInfo: { hasPreviousPage: false, hasNextPage: false, startCursor: null, endCursor: null },
    },
  } : undefined
  const fetchMore = async (_args?: { variables?: { page?: { first?: number; after?: string | null } } }) => {
    // Endpoint doesn't currently support cursor pagination; treat fetchMore as refetch w/ larger limit
    const res = await fetchComments(postId, first + 10)
    if (res) setNodes(res)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}
