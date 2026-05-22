/**
 * Phase 7e — Vercel-direct replacement for `useNotificationsQuery` +
 * `useNotificationCountLazyQuery`.
 *
 * GET /api/notifications/list — returns discriminated-union nodes
 * GET /api/notifications/list?mode=count — returns { count }
 *
 * Returns Apollo contract `data.notifications.nodes[]`.
 */
import { useEffect, useState } from 'react'

type NotificationNode = any  // Discriminated union — type-cast in Notification.tsx renderer
type ApolloShape = {
  notifications: {
    nodes: NotificationNode[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

const fetchNotifications = async (limit: number): Promise<NotificationNode[] | null> => {
  try {
    const r = await fetch(`/api/notifications/list?limit=${limit}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return Array.isArray(json?.nodes) ? json.nodes : []
  } catch {
    return null
  }
}

export const useNotifications = (opts?: {
  variables?: { sort?: any; page?: { first?: number } }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const skip = !!opts?.skip
  const limit = opts?.variables?.page?.first || 20
  const [nodes, setNodes] = useState<NotificationNode[]>([])
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchNotifications(limit).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('notifications load failed')); setLoading(false); return }
      setNodes(res)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [limit, skip, bust])
  const data: ApolloShape | undefined = nodes.length > 0 || !loading ? {
    notifications: {
      nodes,
      pageInfo: { hasNextPage: false, endCursor: null, totalCount: nodes.length },
    },
  } : undefined
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, refetch }
}

// Lazy notification-count variant (for badge that polls)
type CountShape = { myProfile: { unreadNotificationCount: number } }
export const useNotificationCountLazy = (_opts?: { fetchPolicy?: string }): [
  () => Promise<void>,
  { data: CountShape | undefined; loading: boolean }
] => {
  const [data, setData] = useState<CountShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const trigger = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/me', { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } })
      if (r.ok) {
        const json = await r.json()
        const p = json?.me?.profile
        setData({ myProfile: { unreadNotificationCount: p?.unreadNotificationCount || 0 } })
      }
    } finally {
      setLoading(false)
    }
  }
  return [trigger, { data, loading }]
}
