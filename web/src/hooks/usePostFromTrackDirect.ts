/**
 * Phase 7e — Vercel-direct replacement for `useGetOriginalPostFromTrackQuery`.
 *
 * GET /api/feed/post-from-track?trackId=<trackId>
 * Returns Apollo contract `data.getOriginalPostFromTrack = PostComponentFields`.
 */
import { useEffect, useState } from 'react'
import type { Post } from 'lib/graphql'

type PostSlim = Partial<Post> & { id: string }
type ApolloShape = { getOriginalPostFromTrack: PostSlim | null }

const cache = new Map<string, { value: PostSlim | null; ts: number }>()
const FRESH_MS = 60_000

const fetchPostFromTrack = async (trackId: string): Promise<PostSlim | null> => {
  const hit = cache.get(trackId)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/feed/post-from-track?trackId=${encodeURIComponent(trackId)}`, { credentials: 'include' })
    if (!r.ok) {
      cache.set(trackId, { value: null, ts: Date.now() })
      return null
    }
    const json = await r.json()
    const post: PostSlim | null = json?.post ?? null
    cache.set(trackId, { value: post, ts: Date.now() })
    return post
  } catch {
    return null
  }
}

export const useGetOriginalPostFromTrack = (opts: {
  variables?: { trackId?: string }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const trackId = opts?.variables?.trackId || ''
  const skip = !!opts?.skip || !trackId
  const [data, setData] = useState<ApolloShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPostFromTrack(trackId).then((post) => {
      if (cancelled) return
      setData({ getOriginalPostFromTrack: post })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [trackId, skip, bust])
  const refetch = async () => {
    cache.delete(trackId)
    setBust((b) => b + 1)
  }
  return { data, loading, error: null, refetch }
}
