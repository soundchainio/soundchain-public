/**
 * Phase 7e — Vercel-direct replacement for `useGetUserPlaylistsQuery`.
 *
 * GET /api/playlists/list?profileId=xxx → `{ nodes: [{ id, title,
 * description, coverImage, trackCount, profileId, createdAt }] }`
 *
 * Reshapes to the Apollo contract:
 *   data.getUserPlaylists.nodes[].artworkUrl   ← coverImage
 *   data.getUserPlaylists.nodes[].tracks.nodes ← Array(trackCount).fill({})
 *                                                 (just enough so .length matches)
 *   data.getUserPlaylists.nodes[].favoriteCount ← 0 (endpoint doesn't ship it yet)
 *
 * Cached per-profile (60s). LeftSidebar + Timeline can swap their imports
 * with a one-line aliasing change. Slug page keeps Apollo for now since
 * it round-trips through setSelectedPlaylist → PlaylistDetail which
 * needs the full rich shape.
 */
import { useEffect, useState } from 'react'

type ApolloPlaylistNode = {
  id: string
  title: string
  description: string | null
  artworkUrl: string | null
  profileId: string
  favoriteCount: number
  followCount: number
  isFavorite: boolean
  isFollowed: boolean
  createdAt: string
  updatedAt: string
  tracks: {
    nodes: Array<unknown>
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  } | null
}

type ApolloShape = {
  getUserPlaylists: {
    nodes: ApolloPlaylistNode[]
    pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null }
  }
}

const cache = new Map<string, { value: ApolloShape; ts: number }>()
const FRESH_MS = 60_000

const loadPlaylists = async (profileId: string): Promise<ApolloShape | null> => {
  if (!profileId) return null
  const hit = cache.get(profileId)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/playlists/list?profileId=${encodeURIComponent(profileId)}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    if (!Array.isArray(json?.nodes)) return null
    const nodes: ApolloPlaylistNode[] = json.nodes.map((n: any) => ({
      id: String(n.id || ''),
      title: String(n.title || ''),
      description: n.description ?? null,
      artworkUrl: n.coverImage ?? n.artworkUrl ?? null,
      profileId: String(n.profileId || ''),
      favoriteCount: Number(n.favoriteCount || 0),
      followCount: Number(n.followCount || 0),
      isFavorite: !!n.isFavorite,
      isFollowed: !!n.isFollowed,
      createdAt: n.createdAt || '',
      updatedAt: n.updatedAt || n.createdAt || '',
      tracks: {
        // Endpoint only ships trackCount — fill an array of that length so
        // consumers that read `.tracks.nodes.length` get the right count.
        nodes: Array.from({ length: Number(n.trackCount || 0) }),
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    }))
    const value: ApolloShape = {
      getUserPlaylists: {
        nodes,
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      },
    }
    cache.set(profileId, { value, ts: Date.now() })
    return value
  } catch {
    return null
  }
}

export const useGetUserPlaylists = (opts?: { profileId?: string; skip?: boolean }): { data: ApolloShape | undefined; loading: boolean; error: Error | null; refetch: () => void } => {
  const profileId = opts?.profileId || ''
  const skip = !!opts?.skip || !profileId
  const initial = !skip ? cache.get(profileId)?.value : undefined
  const [data, setData] = useState<ApolloShape | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!skip && !initial)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    loadPlaylists(profileId).then((value) => {
      if (cancelled) return
      if (value) { setData(value); setError(null) }
      else setError(new Error('playlists load failed'))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [profileId, skip, bust])
  const refetch = () => {
    cache.delete(profileId)
    setBust((b) => b + 1)
  }
  return { data, loading, error, refetch }
}

// Single playlist by id (Apollo usePlaylistLazyQuery shape)
type SinglePlaylistShape = { playlist: any | null }
type LazySingleResult = { data: SinglePlaylistShape | undefined; loading: boolean; called: boolean }
type LazySingleTrigger = (opts?: { variables?: { id?: string } }) => Promise<void>

export const usePlaylistLazy = (): [LazySingleTrigger, LazySingleResult] => {
  const [data, setData] = useState<SinglePlaylistShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazySingleTrigger = async (opts) => {
    const id = opts?.variables?.id || ''
    if (!id) return
    setLoading(true)
    setCalled(true)
    try {
      const r = await fetch(`/api/playlists/get?id=${encodeURIComponent(id)}`, { credentials: 'include' })
      if (r.ok) {
        const json = await r.json()
        setData({ playlist: json?.playlist ?? null })
      } else {
        setData({ playlist: null })
      }
    } finally {
      setLoading(false)
    }
  }
  return [trigger, { data, loading, called }]
}
