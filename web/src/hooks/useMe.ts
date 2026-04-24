import { useMeQuery } from 'lib/graphql'
import { useState, useEffect, createContext, useContext } from 'react'

/**
 * Vercel-direct /api/me cache — shared across all useMe() consumers.
 * Fetches once on first mount, caches in module scope.
 * Falls back to Apollo useMeQuery if Vercel-direct fails.
 */
let meCache: any = undefined // undefined = not fetched, null = no user, object = user
let meFetchPromise: Promise<any> | null = null
let meFetched = false

function fetchMeDirect(): Promise<any> {
  if (meFetchPromise) return meFetchPromise
  meFetchPromise = fetch('/api/me', { credentials: 'include' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      meCache = data?.me ?? null
      meFetched = true
      meFetchPromise = null
      return meCache
    })
    .catch(() => {
      meFetchPromise = null
      return undefined // fall through to Apollo
    })
  return meFetchPromise
}

export const useMe = () => {
  const [directMe, setDirectMe] = useState<any>(meCache)

  // Vercel-direct fetch (fast, no Lambda)
  useEffect(() => {
    if (meFetched) {
      setDirectMe(meCache)
      return
    }
    fetchMeDirect().then(me => {
      if (me !== undefined) setDirectMe(me)
    })
  }, [])

  // Apollo fallback (slower, through Lambda — only used if Vercel-direct fails)
  let apolloMe: any = undefined
  try {
    const result = useMeQuery()
    apolloMe = result.data?.me
  } catch {
    // Apollo not available (no provider) — fine, Vercel-direct handles it
  }

  // Prefer Vercel-direct, fall back to Apollo
  return directMe !== undefined ? directMe : apolloMe
}

/**
 * Force refetch /api/me (call after profile updates, login, etc.)
 */
export function invalidateMe() {
  meCache = undefined
  meFetched = false
  meFetchPromise = null
  fetchMeDirect()
}
