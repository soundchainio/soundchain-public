/**
 * Phase 7e — Vercel-direct replacement for `useReactionsLazyQuery`.
 * GET /api/reactions/list?postId=
 */
import { useState } from 'react'

type ApolloShape = {
  reactions: {
    nodes: any[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

type LazyResult = { data: ApolloShape | undefined; loading: boolean; called: boolean; fetchMore?: any }
type LazyTrigger = (opts?: { variables?: { postId?: string; page?: { first?: number } } }) => Promise<void>

export const useReactionsLazy = (): [LazyTrigger, LazyResult] => {
  const [data, setData] = useState<ApolloShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyTrigger = async (opts) => {
    const postId = opts?.variables?.postId || ''
    const first = opts?.variables?.page?.first ?? 50
    if (!postId) return
    setLoading(true)
    setCalled(true)
    try {
      const r = await fetch(`/api/reactions/list?postId=${encodeURIComponent(postId)}&limit=${first}`, { credentials: 'include' })
      if (r.ok) {
        const json = await r.json()
        setData({ reactions: { nodes: json?.nodes || [], pageInfo: json?.pageInfo || { hasNextPage: false, endCursor: null, totalCount: 0 } } })
      }
    } finally {
      setLoading(false)
    }
  }
  return [trigger, { data, loading, called, fetchMore: () => {} }]
}
