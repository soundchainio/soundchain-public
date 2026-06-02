/**
 * Phase 7e — Vercel-direct replacement for `useMeQuery` from Apollo.
 *
 * Wraps the existing `useMe` hook (which already reads /api/me) and
 * returns the Apollo contract `{ data: { me }, loading, refetch }` so
 * callsites swap with a 1-line import change.
 */
import { useCallback, useEffect, useState } from 'react'
import { useMe, invalidateMe } from './useMe'

type MeShape = { me: any }

export const useMeDirectQuery = (opts?: { skip?: boolean; ssr?: boolean; fetchPolicy?: string }): {
  data: MeShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const me = useMe()
  const skip = !!opts?.skip
  // Loading state: true on first render until useMe resolves a value (null or object)
  const [hydrated, setHydrated] = useState(me !== undefined)
  useEffect(() => {
    if (me !== undefined) setHydrated(true)
  }, [me])
  const data: MeShape | undefined = hydrated ? { me } : undefined
  const refetch = async () => {
    if (skip) return
    await invalidateMe()
  }
  return { data, loading: !hydrated && !skip, error: null, refetch }
}

// Lazy variant of an unread-message-count query — bypasses the useMe
// module cache by hitting /api/me directly with cache-bust so the badge
// updates on every route change.
type UnreadShape = { myProfile: { unreadMessageCount: number; unreadNotificationCount?: number } }

export const useUnreadMessageCountLazy = (_opts?: { fetchPolicy?: string }): [
  () => Promise<void>,
  { data: UnreadShape | undefined; loading: boolean }
] => {
  const [data, setData] = useState<UnreadShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  // MUST be memoized: consumers (InboxBadge, pulse) put this trigger in a
  // useEffect dep array. An unstable (new-every-render) function there causes an
  // infinite fetch loop → /api/me flood → Vercel DDoS auto-deny → site 403.
  const trigger = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/me', { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } })
      if (r.ok) {
        const json = await r.json()
        const p = json?.me?.profile
        setData({
          myProfile: {
            unreadMessageCount: p?.unreadMessageCount || 0,
            unreadNotificationCount: p?.unreadNotificationCount || 0,
          },
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])
  return [trigger, { data, loading }]
}
