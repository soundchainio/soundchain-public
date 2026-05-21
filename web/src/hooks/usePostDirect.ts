/**
 * Phase 7e — Vercel-direct replacement for `usePostQuery` + `usePostLazyQuery`.
 *
 * GET /api/feed/post?id=<postId>
 * Returns the Apollo contract `data.post = PostComponentFields`.
 *
 * Caching: 60s in-memory per post id. Refetch busts cache.
 */
import { useEffect, useState } from 'react'
import type { Post } from 'lib/graphql'

type PostSlim = Partial<Post> & { id: string }
type PostShape = { post: PostSlim | null }

const cache = new Map<string, { value: PostSlim | null; ts: number }>()
const FRESH_MS = 60_000

const fetchPost = async (id: string): Promise<PostSlim | null> => {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/feed/post?id=${encodeURIComponent(id)}`, { credentials: 'include' })
    if (!r.ok) {
      cache.set(id, { value: null, ts: Date.now() })
      return null
    }
    const json = await r.json()
    const post: PostSlim | null = json?.post ?? null
    cache.set(id, { value: post, ts: Date.now() })
    return post
  } catch {
    return null
  }
}

export const usePost = (opts: {
  variables?: { id?: string }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: PostShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const id = opts?.variables?.id || ''
  const skip = !!opts?.skip || !id
  const [data, setData] = useState<PostShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPost(id).then((post) => {
      if (cancelled) return
      setData({ post })
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, skip, bust])
  const refetch = async () => {
    cache.delete(id)
    setBust((b) => b + 1)
  }
  return { data, loading, error, refetch }
}

// Lazy variant
type LazyPostResult = { data: PostShape | undefined; loading: boolean; called: boolean }
type LazyPostTrigger = (opts?: { variables?: { id?: string } }) => Promise<void>

export const usePostLazy = (): [LazyPostTrigger, LazyPostResult] => {
  const [data, setData] = useState<PostShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyPostTrigger = async (opts) => {
    const id = opts?.variables?.id || ''
    if (!id) return
    setLoading(true)
    setCalled(true)
    const post = await fetchPost(id)
    setData({ post })
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}
