/**
 * Phase 7e — Vercel-direct replacement for `useProfileByHandleQuery`.
 *
 * GET /api/profile/[handle] → rich profile shape (cookie-authed for
 * isFollowed / isSubscriber / unread counts when those land).
 *
 * Returns Apollo contract `data.profileByHandle = { ... }` with the
 * endpoint's superset of Slim fields. Missing-in-endpoint fields
 * (isFollowed, isSubscriber, unreadNotificationCount, unreadMessageCount)
 * default to safe zero/false so consumers compile.
 */
import { useEffect, useState } from 'react'
import type { Profile } from 'lib/graphql'

type ApolloShape = { profileByHandle: (Partial<Profile> & { id: string }) | null }

const cache = new Map<string, { value: ApolloShape; ts: number }>()
const inflight = new Map<string, Promise<ApolloShape | null>>()
const FRESH_MS = 30_000

const loadProfile = async (handle: string): Promise<ApolloShape | null> => {
  if (!handle) return null
  const hit = cache.get(handle)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  const existing = inflight.get(handle)
  if (existing) return existing
  const promise = (async () => {
    try {
      const r = await fetch(`/api/profile/${encodeURIComponent(handle)}`, { credentials: 'include' })
      if (!r.ok) {
        const value: ApolloShape = { profileByHandle: null }
        cache.set(handle, { value, ts: Date.now() })
        return value
      }
      const json = await r.json()
      const p = json?.profile || json
      if (!p?.id) {
        const value: ApolloShape = { profileByHandle: null }
        cache.set(handle, { value, ts: Date.now() })
        return value
      }
      const value: ApolloShape = {
        profileByHandle: {
          ...p,
          id: String(p.id),
          userHandle: p.userHandle || handle,
          // Defaults for fields the endpoint doesn't ship yet
          isFollowed: p.isFollowed ?? false,
          isSubscriber: p.isSubscriber ?? false,
          unreadNotificationCount: p.unreadNotificationCount ?? 0,
          unreadMessageCount: p.unreadMessageCount ?? 0,
        } as any,
      }
      cache.set(handle, { value, ts: Date.now() })
      return value
    } catch {
      return null
    } finally {
      inflight.delete(handle)
    }
  })()
  inflight.set(handle, promise)
  return promise
}

export const useProfileByHandle = (opts: { handle?: string; skip?: boolean }): { data: ApolloShape | undefined; loading: boolean; error: Error | null } => {
  const handle = opts.handle || ''
  const skip = !!opts.skip || !handle
  const initial = !skip ? cache.get(handle)?.value : undefined
  const [data, setData] = useState<ApolloShape | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!skip && !initial)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    loadProfile(handle).then((value) => {
      if (cancelled) return
      if (value) { setData(value); setError(null) }
      else setError(new Error('profile load failed'))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [handle, skip])
  return { data, loading, error }
}

// Phase 7e — useProfileQuery (by ObjectId) shares the same endpoint
// (path param accepts both handle + ObjectId) so we reuse the loader.
// `profile` non-null when data is set (consumers that check `if (data)`
// already gate against the null-profile case via data being undefined).
type ProfileQueryShape = { profile: Partial<Profile> }
export const useProfileById = (opts: { id?: string; skip?: boolean }): { data: ProfileQueryShape | undefined; loading: boolean; error: Error | null } => {
  const id = opts.id || ''
  const skip = !!opts.skip || !id
  const initialCached = !skip ? cache.get(id)?.value : undefined
  const initial: ProfileQueryShape | undefined = initialCached?.profileByHandle
    ? { profile: initialCached.profileByHandle }
    : undefined
  const [data, setData] = useState<ProfileQueryShape | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!skip && !initial)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    loadProfile(id).then((value) => {
      if (cancelled) return
      if (value?.profileByHandle) {
        setData({ profile: value.profileByHandle })
        setError(null)
      } else if (value) {
        setData(undefined)
      } else {
        setError(new Error('profile load failed'))
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, skip])
  return { data, loading, error }
}

// Lazy variant for ManageRequestCard / ListingsItem / NftOwner / etc
// Returns `[loadFn, { data, loading }]` matching Apollo's lazy-query shape.
export const useProfileLazyById = (): [
  (opts: { variables: { id: string } }) => Promise<void>,
  { data: ProfileQueryShape | undefined; loading: boolean }
] => {
  const [data, setData] = useState<ProfileQueryShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const trigger = async (opts: { variables: { id: string } }) => {
    const id = opts.variables.id
    if (!id) return
    setLoading(true)
    const value = await loadProfile(id)
    if (value?.profileByHandle) setData({ profile: value.profileByHandle })
    setLoading(false)
  }
  return [trigger, { data, loading }]
}
