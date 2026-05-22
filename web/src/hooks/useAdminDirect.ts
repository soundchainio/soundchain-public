/**
 * Phase 7e — Vercel-direct admin badge + verification-requests list.
 *
 * usePendingRequestsBadgeNumber — count for sidebar admin badge
 * useProfileVerificationRequests — paginated list of pending verifications
 */
import { useEffect, useState } from 'react'

type BadgeShape = { pendingRequestsBadgeNumber: number }
type ListShape = {
  profileVerificationRequests: {
    nodes: any[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

const fetchBadge = async (): Promise<BadgeShape | null> => {
  try {
    const r = await fetch('/api/admin/pending-requests-count', { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return { pendingRequestsBadgeNumber: Number(json?.count || 0) }
  } catch {
    return null
  }
}

export const usePendingRequestsBadgeNumber = (opts?: { skip?: boolean; pollInterval?: number }): {
  data: BadgeShape | undefined
  loading: boolean
} => {
  const skip = !!opts?.skip
  const pollInterval = opts?.pollInterval || 0
  const [data, setData] = useState<BadgeShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    const run = () => {
      fetchBadge().then((res) => {
        if (cancelled) return
        if (res) setData(res)
        setLoading(false)
      })
    }
    run()
    let timer: any = null
    if (pollInterval > 0) timer = setInterval(run, pollInterval)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [skip, pollInterval])
  return { data, loading }
}

const fetchVerifList = async (status: string, limit: number, cursor?: string | null): Promise<any[] | null> => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  try {
    const r = await fetch(`/api/admin/verification-requests?${params}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return Array.isArray(json?.nodes) ? json.nodes : []
  } catch {
    return null
  }
}

export const useProfileVerificationRequests = (opts?: {
  variables?: { status?: string; page?: { first?: number } }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ListShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: () => Promise<void>
  refetch: () => Promise<void>
} => {
  const status = opts?.variables?.status || ''
  const first = opts?.variables?.page?.first ?? 20
  const skip = !!opts?.skip
  const [nodes, setNodes] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchVerifList(status, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('verification requests load failed')); setLoading(false); return }
      setNodes(res)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [status, first, skip, bust])
  const data: ListShape | undefined = nodes.length > 0 || !loading ? {
    profileVerificationRequests: { nodes, pageInfo: { hasNextPage: false, endCursor: null, totalCount: nodes.length } },
  } : undefined
  const fetchMore = async () => {}
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}
