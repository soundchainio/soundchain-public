/**
 * Phase 7e — Vercel-direct replacement for `useFollowersQuery` +
 * `useFollowingQuery` + their Lazy variants.
 *
 * GET /api/users/social?profileId=xxx&type=followers|following&limit=N
 *
 * Returns Apollo contract:
 *   useFollowers → data.followers.nodes[].followerProfile
 *   useFollowing → data.following.nodes[].followedProfile  (endpoint
 *                  emits .followingProfile, shim renames to .followedProfile)
 */
import { useEffect, useState } from 'react'

type ProfileSlim = {
  id: string
  displayName: string
  profilePicture: string | null
  verified: boolean
  userHandle: string
  teamMember: boolean
  badges: string[]
  tracksCount?: number
  followerCount?: number
}

type FollowersShape = { followers: { nodes: Array<{ id: string; followerProfile: ProfileSlim }>; pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number } } }
type FollowingShape = { following: { nodes: Array<{ id: string; followedProfile: ProfileSlim }>; pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number } } }

const cache = new Map<string, { value: any; ts: number }>()
const FRESH_MS = 60_000

const fetchSocial = async (profileId: string, type: 'followers' | 'following', limit: number): Promise<any | null> => {
  const cacheKey = `${profileId}:${type}:${limit}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/users/social?profileId=${encodeURIComponent(profileId)}&type=${type}&limit=${limit}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    if (!Array.isArray(json?.nodes)) return null
    cache.set(cacheKey, { value: json, ts: Date.now() })
    return json
  } catch {
    return null
  }
}

export const useFollowers = (opts: { profileId?: string; first?: number; skip?: boolean }): {
  data: FollowersShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: () => Promise<void>
  refetch: () => Promise<void>
} => {
  const profileId = opts.profileId || ''
  const first = opts.first ?? 50
  const skip = !!opts.skip || !profileId
  const [data, setData] = useState<FollowersShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchSocial(profileId, 'followers', first).then((json) => {
      if (cancelled) return
      if (!json) { setError(new Error('followers load failed')); setLoading(false); return }
      setData({
        followers: {
          nodes: json.nodes,
          pageInfo: { hasNextPage: !!json.pageInfo?.hasNextPage, endCursor: json.pageInfo?.endCursor || null, totalCount: Number(json.pageInfo?.totalCount || json.nodes.length) },
        },
      })
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [profileId, first, skip, bust])
  const fetchMore = async () => {}  // single-page endpoint v1; pagination shipped when endpoint adds cursor
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

export const useFollowing = (opts: { profileId?: string; first?: number; skip?: boolean }): {
  data: FollowingShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: () => Promise<void>
  refetch: () => Promise<void>
} => {
  const profileId = opts.profileId || ''
  const first = opts.first ?? 50
  const skip = !!opts.skip || !profileId
  const [data, setData] = useState<FollowingShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchSocial(profileId, 'following', first).then((json) => {
      if (cancelled) return
      if (!json) { setError(new Error('following load failed')); setLoading(false); return }
      // Endpoint emits `followingProfile`; Apollo contract is `followedProfile`. Rename.
      const nodes = json.nodes.map((n: any) => ({
        id: n.id,
        followedProfile: n.followingProfile || n.followedProfile,
      }))
      setData({
        following: {
          nodes,
          pageInfo: { hasNextPage: !!json.pageInfo?.hasNextPage, endCursor: json.pageInfo?.endCursor || null, totalCount: Number(json.pageInfo?.totalCount || nodes.length) },
        },
      })
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [profileId, first, skip, bust])
  const fetchMore = async () => {}
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

// Lazy variants (for typeahead / on-demand load patterns)
type LazyResult<T> = { data: T | undefined; loading: boolean; called: boolean }
type LazyTrigger = (opts?: { variables?: { profileId?: string; page?: { first?: number; after?: string | null } } }) => Promise<void>

export const useFollowersLazy = (defaults?: { variables?: { profileId?: string } }): [LazyTrigger, LazyResult<FollowersShape>] => {
  const [data, setData] = useState<FollowersShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyTrigger = async (opts) => {
    const profileId = opts?.variables?.profileId ?? defaults?.variables?.profileId ?? ''
    if (!profileId) return
    const first = opts?.variables?.page?.first ?? 50
    setLoading(true)
    setCalled(true)
    const json = await fetchSocial(profileId, 'followers', first)
    if (json) {
      setData({
        followers: {
          nodes: json.nodes,
          pageInfo: { hasNextPage: !!json.pageInfo?.hasNextPage, endCursor: json.pageInfo?.endCursor || null, totalCount: Number(json.pageInfo?.totalCount || json.nodes.length) },
        },
      })
    }
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}

export const useFollowingLazy = (defaults?: { variables?: { profileId?: string } }): [LazyTrigger, LazyResult<FollowingShape>] => {
  const [data, setData] = useState<FollowingShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyTrigger = async (opts) => {
    const profileId = opts?.variables?.profileId ?? defaults?.variables?.profileId ?? ''
    if (!profileId) return
    const first = opts?.variables?.page?.first ?? 50
    setLoading(true)
    setCalled(true)
    const json = await fetchSocial(profileId, 'following', first)
    if (json) {
      const nodes = json.nodes.map((n: any) => ({
        id: n.id,
        followedProfile: n.followingProfile || n.followedProfile,
      }))
      setData({
        following: {
          nodes,
          pageInfo: { hasNextPage: !!json.pageInfo?.hasNextPage, endCursor: json.pageInfo?.endCursor || null, totalCount: Number(json.pageInfo?.totalCount || nodes.length) },
        },
      })
    }
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}
