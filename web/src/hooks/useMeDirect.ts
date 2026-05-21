/**
 * Phase 7e — Vercel-direct replacement for `useMeQuery` from Apollo.
 *
 * Wraps the existing `useMe` hook (which already reads /api/me) and
 * returns the Apollo contract `{ data: { me }, loading, refetch }` so
 * callsites swap with a 1-line import change.
 */
import { useEffect, useState } from 'react'
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
