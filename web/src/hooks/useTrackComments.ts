/**
 * useTrackComments - Hook for managing SoundCloud-style timestamped comments
 *
 * Phase 7e — Vercel-direct: reads from /api/tracks/comments (GET) +
 * mutations via POST/PATCH/DELETE on same endpoint. No Apollo.
 */

import { useCallback, useEffect, useState } from 'react'
import { useMe } from './useMe'
import { toast } from 'react-toastify'

interface UseTrackCommentsOptions {
  trackId: string
  pageSize?: number
}

type TrackCommentNode = {
  id: string
  trackId: string
  text: string
  body?: string
  timestamp: number
  likeCount: number
  isPinned: boolean
  deleted: boolean
  embedUrl?: string | null
  createdAt: string | null
  updatedAt: string | null
  profile: {
    id: string
    displayName: string
    profilePicture: string | null
    userHandle: string
    verified?: boolean
  } | null
}

export function useTrackComments({ trackId, pageSize = 100 }: UseTrackCommentsOptions) {
  const me = useMe()
  const [comments, setComments] = useState<TrackCommentNode[]>([])
  const [commentCount, setCommentCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(!!trackId)
  const [error, setError] = useState<Error | null>(null)
  const [creating, setCreating] = useState(false)
  const [bust, setBust] = useState(0)

  const fetchAll = useCallback(async () => {
    if (!trackId) return
    setLoading(true)
    try {
      const [listResp, countResp] = await Promise.all([
        fetch(`/api/tracks/comments?trackId=${encodeURIComponent(trackId)}&limit=${pageSize}`, { credentials: 'include' }),
        fetch(`/api/tracks/comments?trackId=${encodeURIComponent(trackId)}&mode=count`, { credentials: 'include' }),
      ])
      if (listResp.ok) {
        const json = await listResp.json()
        setComments(Array.isArray(json?.nodes) ? json.nodes : [])
      }
      if (countResp.ok) {
        const json = await countResp.json()
        setCommentCount(Number(json?.count || 0))
      }
      setError(null)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [trackId, pageSize])

  useEffect(() => {
    if (!trackId) { setLoading(false); return }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, pageSize, bust])

  const refetch = useCallback(async () => {
    setBust((b) => b + 1)
  }, [])

  const addComment = useCallback(async (text: string, timestamp: number, embedUrl?: string) => {
    if (!me) {
      toast.error('Please login to comment')
      return
    }
    setCreating(true)
    try {
      const r = await fetch('/api/tracks/comments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, text, timestamp, embedUrl: embedUrl || undefined }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add comment')
      }
      toast.success('Comment added!')
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment')
      throw err
    } finally {
      setCreating(false)
    }
  }, [trackId, me, refetch])

  const likeComment = useCallback(async (commentId: string) => {
    if (!me) {
      toast.error('Please login to like comments')
      return
    }
    try {
      const r = await fetch('/api/tracks/comments', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action: 'like' }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to like comment')
      }
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Failed to like comment')
    }
  }, [me, refetch])

  const deleteComment = useCallback(async (commentId: string) => {
    if (!me) return
    try {
      const r = await fetch(`/api/tracks/comments?id=${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete comment')
      }
      toast.success('Comment deleted')
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete comment')
    }
  }, [me, refetch])

  return {
    comments,
    commentCount: commentCount || comments.length,
    loading,
    error,
    creating,
    addComment,
    likeComment,
    deleteComment,
    refetch,
    isLoggedIn: !!me,
  }
}

export default useTrackComments
