/**
 * Phase 7e — Vercel-direct replacement for `useExploreGenreCountsQuery`.
 *
 * GET /api/tracks/genres → `{ genres: [{ name, count }] }`
 * Re-shapes to the Apollo contract: `data.exploreGenreCounts = [{ genre, count }]`
 * so the dex/[...slug].tsx callsite keeps working with zero rewrites.
 *
 * Module cache (5min) — genre counts move slowly. Supports skip option to
 * defer the fetch until the consumer actually needs it (explore tab only).
 */
import { useEffect, useState } from 'react'

type GenreCount = { genre: string; count: number }
type ApolloShape = { exploreGenreCounts: GenreCount[] }

let cache: { value: ApolloShape; ts: number } | null = null
let inflight: Promise<ApolloShape | null> | null = null
const FRESH_MS = 5 * 60_000

const loadGenres = async (): Promise<ApolloShape | null> => {
  if (cache && Date.now() - cache.ts < FRESH_MS) return cache.value
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch('/api/tracks/genres', { credentials: 'omit' })
      if (!r.ok) return null
      const json = await r.json()
      if (!Array.isArray(json?.genres)) return null
      const value: ApolloShape = {
        exploreGenreCounts: json.genres.map((g: any) => ({
          genre: String(g.name || ''),
          count: Number(g.count || 0),
        })),
      }
      cache = { value, ts: Date.now() }
      return value
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export const useExploreGenreCounts = (opts?: { skip?: boolean }): { data: ApolloShape | undefined; loading: boolean; error: Error | null } => {
  const skip = !!opts?.skip
  const initial = !skip && cache && Date.now() - cache.ts < FRESH_MS ? cache.value : undefined
  const [data, setData] = useState<ApolloShape | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!skip && !initial)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    if (data) { setLoading(false); return }
    setLoading(true)
    loadGenres().then((value) => {
      if (cancelled) return
      if (value) { setData(value); setError(null) }
      else setError(new Error('genres load failed'))
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])
  return { data, loading, error }
}
