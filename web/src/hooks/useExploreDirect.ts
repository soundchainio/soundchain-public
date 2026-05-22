/**
 * Phase 7e — Vercel-direct replacement for `useExploreQuery` (combined explore).
 *
 * Aggregates /api/users/explore + /api/tracks/explore in parallel, returns
 * Apollo contract `data.explore = { totalTracks, totalProfiles, tracks[], profiles[] }`.
 */
import { useEffect, useState } from 'react'

type ApolloShape = {
  explore: {
    totalTracks: number
    totalProfiles: number
    tracks: any[]
    profiles: any[]
  }
}

const fetchExplore = async (search: string): Promise<ApolloShape | null> => {
  try {
    const qs = search ? `?search=${encodeURIComponent(search)}&limit=30` : '?limit=30'
    const [usersResp, tracksResp] = await Promise.all([
      fetch(`/api/users/explore${qs}`, { credentials: 'include' }),
      fetch(`/api/tracks/explore${qs}`, { credentials: 'include' }),
    ])
    const users = usersResp.ok ? await usersResp.json() : { nodes: [], pageInfo: { totalCount: 0 } }
    const tracks = tracksResp.ok ? await tracksResp.json() : { nodes: [], pageInfo: { totalCount: 0 } }
    return {
      explore: {
        totalTracks: Number(tracks?.pageInfo?.totalCount || (tracks?.nodes?.length || 0)),
        totalProfiles: Number(users?.pageInfo?.totalCount || (users?.nodes?.length || 0)),
        tracks: Array.isArray(tracks?.nodes) ? tracks.nodes : [],
        profiles: Array.isArray(users?.nodes) ? users.nodes : [],
      },
    }
  } catch {
    return null
  }
}

export const useExplore = (opts?: {
  variables?: { search?: string }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ApolloShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const search = opts?.variables?.search || ''
  const skip = !!opts?.skip
  const [data, setData] = useState<ApolloShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchExplore(search).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('explore load failed')); setLoading(false); return }
      setData(res)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [search, skip, bust])
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, refetch }
}
