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

type CommentShape = { comment: CommentNode | null }

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

// Lazy variant for on-demand load (e.g. modal-opens, expand-comments)
type LazyResult = { data: ApolloShape | undefined; loading: boolean; called: boolean }
type LazyTrigger = (opts?: { variables?: { postId?: string; page?: { first?: number } } }) => Promise<void>

// Single comment by id
const commentCache = new Map<string, { value: CommentNode | null; ts: number }>()
const COMMENT_FRESH_MS = 60_000

const fetchComment = async (id: string): Promise<CommentNode | null> => {
  const hit = commentCache.get(id)
  if (hit && Date.now() - hit.ts < COMMENT_FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/comments/get?id=${encodeURIComponent(id)}`, { credentials: 'include' })
    if (!r.ok) {
      commentCache.set(id, { value: null, ts: Date.now() })
      return null
    }
    const json = await r.json()
    const comment: CommentNode | null = json?.comment ?? null
    commentCache.set(id, { value: comment, ts: Date.now() })
    return comment
  } catch {
    return null
  }
}

export const useComment = (opts: {
  variables?: { id?: string }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: CommentShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const id = opts?.variables?.id || ''
  const skip = !!opts?.skip || !id
  const [data, setData] = useState<CommentShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchComment(id).then((c) => {
      if (cancelled) return
      setData({ comment: c })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, skip, bust])
  const refetch = async () => { commentCache.delete(id); setBust((b) => b + 1) }
  return { data, loading, error: null, refetch }
}

export const useCommentsLazy = (_opts?: { fetchPolicy?: string }): [LazyTrigger, LazyResult] => {
  const [data, setData] = useState<ApolloShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyTrigger = async (opts) => {
    const postId = opts?.variables?.postId || ''
    const first = opts?.variables?.page?.first ?? 10
    if (!postId) return
    setLoading(true)
    setCalled(true)
    const nodes = await fetchComments(postId, first)
    if (nodes) setData({ comments: { nodes, pageInfo: { hasPreviousPage: false, hasNextPage: false, startCursor: null, endCursor: null } } })
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}
