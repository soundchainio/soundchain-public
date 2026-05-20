/**
 * Phase 7e — Vercel-direct replacement for `PROFILE_STREAMING_REWARDS` +
 * `MY_LISTENER_REWARDS` Apollo gql queries.
 *
 * GET /api/profile/rewards?profileId=xxx
 * Returns { creatorRewards: {...}, listenerRewards: {...} } in one call.
 *
 * Two shims:
 *   - useProfileStreamingRewards → mirrors Apollo `scidsByProfile` array
 *   - useMyListenerRewards       → mirrors Apollo `myListenerRewards` object
 *
 * Both share one cache so a single network call drives both views.
 */
import { useEffect, useState } from 'react'

type EndpointShape = {
  creatorRewards: {
    totalOgunEarned: number
    dailyOgunEarned: number
    totalStreamsReceived: number
    trackCount: number
    tracks: Array<{ id: string; title: string; streamCount: number; ogunEarned: number }>
  }
  listenerRewards: {
    dailyListenerOgunEarned: number
    totalListenerOgunEarned: number
    dailyTracksStreamed: number
    totalTracksStreamed: number
  }
}

type ScidByProfile = {
  id: string
  scid: string
  streamCount: number
  ogunRewardsEarned: number
  ogunRewardsClaimed: number
}

type StreamingShape = { scidsByProfile: ScidByProfile[] }
type ListenerShape = {
  myListenerRewards: {
    dailyEarned: number
    totalEarned: number
    dailyLimit: number
    tracksStreamedToday: number
  }
}

const cache = new Map<string, { value: EndpointShape; ts: number }>()
const inflight = new Map<string, Promise<EndpointShape | null>>()
const FRESH_MS = 30_000

const loadRewards = async (profileId: string): Promise<EndpointShape | null> => {
  if (!profileId) return null
  const hit = cache.get(profileId)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  const existing = inflight.get(profileId)
  if (existing) return existing
  const promise = (async () => {
    try {
      const r = await fetch(`/api/profile/rewards?profileId=${encodeURIComponent(profileId)}`, { credentials: 'include' })
      if (!r.ok) return null
      const json = (await r.json()) as EndpointShape
      cache.set(profileId, { value: json, ts: Date.now() })
      return json
    } catch {
      return null
    } finally {
      inflight.delete(profileId)
    }
  })()
  inflight.set(profileId, promise)
  return promise
}

const subscribe = (profileId: string, skip: boolean, setLoading: (l: boolean) => void, setShape: (s: EndpointShape | null) => void) => {
  if (skip || !profileId) { setLoading(false); return () => {} }
  let cancelled = false
  setLoading(true)
  loadRewards(profileId).then((value) => {
    if (cancelled) return
    setShape(value)
    setLoading(false)
  })
  return () => { cancelled = true }
}

export const useProfileStreamingRewards = (opts: { profileId?: string; skip?: boolean }): { data: StreamingShape | undefined; loading: boolean } => {
  const profileId = opts.profileId || ''
  const skip = !!opts.skip || !profileId
  const [shape, setShape] = useState<EndpointShape | null>(() => cache.get(profileId)?.value ?? null)
  const [loading, setLoading] = useState<boolean>(!skip && !shape)
  useEffect(() => subscribe(profileId, skip, setLoading, setShape), [profileId, skip])
  const data: StreamingShape | undefined = shape ? {
    scidsByProfile: shape.creatorRewards.tracks.map((t) => ({
      id: t.id,
      scid: '',  // endpoint doesn't ship scid in the rewards projection
      streamCount: t.streamCount,
      ogunRewardsEarned: t.ogunEarned,
      ogunRewardsClaimed: 0,  // endpoint doesn't ship claimed yet — backfill needed
    })),
  } : undefined
  return { data, loading }
}

export const useMyListenerRewards = (opts: { profileId?: string; skip?: boolean }): { data: ListenerShape | undefined; loading: boolean } => {
  const profileId = opts.profileId || ''
  const skip = !!opts.skip || !profileId
  const [shape, setShape] = useState<EndpointShape | null>(() => cache.get(profileId)?.value ?? null)
  const [loading, setLoading] = useState<boolean>(!skip && !shape)
  useEffect(() => subscribe(profileId, skip, setLoading, setShape), [profileId, skip])
  const data: ListenerShape | undefined = shape ? {
    myListenerRewards: {
      dailyEarned: shape.listenerRewards.dailyListenerOgunEarned,
      totalEarned: shape.listenerRewards.totalListenerOgunEarned,
      dailyLimit: 100,  // hardcoded default; endpoint doesn't track per-user limit
      tracksStreamedToday: shape.listenerRewards.dailyTracksStreamed,
    },
  } : undefined
  return { data, loading }
}
