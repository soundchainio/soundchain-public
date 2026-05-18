import { useEffect, useState } from 'react'

// HOTFIX 2026-05-18: api.soundchain.io (Lambda) is down — Phase 7e (Apollo
// strip) wasn't fully completed, so useMe was still hitting the Lambda
// `me` resolver via useMeQuery. With the API unreachable, every authed page
// renders as logged-out (no avatar in top nav, no profile, no actions),
// blocking every email signup since the Vercel-direct cutover.
//
// This rewrite calls /api/me (Vercel-direct → Atlas) instead. Same return
// shape as before (the `me` object, unwrapped from the Apollo data envelope)
// so the 100+ consumers keep working without edits.

// Module-level cache — share one fetch across every useMe() call mounted at
// the same time, and survive re-renders without thrashing the network.
type Me = any
let cachedMe: Me | undefined = undefined
let fetching: Promise<Me> | null = null
let lastFetchedAt = 0
const subscribers = new Set<(me: Me) => void>()

// Treat as stale after 60s — short enough to catch wallet/handle edits, long
// enough to not hammer /api/me on rapid page nav. Login flow does a hard
// reload (`window.location.assign`) so the cache starts empty post-login.
const STALE_MS = 60_000

async function fetchMe(): Promise<Me> {
  if (fetching) return fetching
  fetching = (async () => {
    try {
      const res = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!res.ok) {
        cachedMe = null
      } else {
        const json = await res.json()
        cachedMe = json?.me ?? null
      }
      lastFetchedAt = Date.now()
      subscribers.forEach(fn => fn(cachedMe))
      return cachedMe
    } catch {
      cachedMe = null
      lastFetchedAt = Date.now()
      subscribers.forEach(fn => fn(cachedMe))
      return cachedMe
    } finally {
      fetching = null
    }
  })()
  return fetching
}

export const useMe = () => {
  const [me, setMe] = useState<Me>(cachedMe)

  useEffect(() => {
    subscribers.add(setMe)
    const isStale = !cachedMe || Date.now() - lastFetchedAt > STALE_MS
    if (isStale) {
      fetchMe().then(next => setMe(next))
    } else {
      setMe(cachedMe)
    }
    return () => {
      subscribers.delete(setMe)
    }
  }, [])

  return me
}

// Optional escape hatch — call after auth state changes (login/logout) to
// force a refetch immediately rather than waiting for the next mount.
export function invalidateMe() {
  cachedMe = undefined
  lastFetchedAt = 0
  return fetchMe()
}
