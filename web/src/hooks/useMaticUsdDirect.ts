/**
 * Phase 7e — Vercel-direct replacement for `useMaticUsdQuery`.
 *
 * Fetches /api/price/matic (already deployed, ~10ms response) instead of
 * routing through Apollo + Lambda + GraphQL. Returns the same shape:
 *   { data: { maticUsd: string } | undefined, loading: boolean, error: Error | null }
 * so callsites can swap their import and keep destructuring intact.
 *
 * Module-level cache + in-flight dedup so 5 callsites on the same page
 * only do one fetch. 60s freshness — POL/USD doesn't move fast enough
 * for any user to care about sub-minute updates.
 */
import { useEffect, useState } from 'react'

type MaticUsd = { maticUsd: string }
let cache: { value: MaticUsd; ts: number } | null = null
let inflight: Promise<MaticUsd | null> | null = null
const FRESH_MS = 60_000

const loadMaticUsd = async (): Promise<MaticUsd | null> => {
  if (cache && Date.now() - cache.ts < FRESH_MS) return cache.value
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch('/api/price/matic', { credentials: 'omit' })
      if (!r.ok) return null
      const json = await r.json()
      if (typeof json?.maticUsd !== 'string' && typeof json?.maticUsd !== 'number') return null
      const value: MaticUsd = { maticUsd: String(json.maticUsd) }
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

export const useMaticUsd = (): { data: MaticUsd | undefined; loading: boolean; error: Error | null } => {
  const initial = cache && Date.now() - cache.ts < FRESH_MS ? cache.value : undefined
  const [data, setData] = useState<MaticUsd | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!initial)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let cancelled = false
    if (data) { setLoading(false); return }
    setLoading(true)
    loadMaticUsd().then((value) => {
      if (cancelled) return
      if (value) { setData(value); setError(null) }
      else setError(new Error('matic price load failed'))
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { data, loading, error }
}

/**
 * Drop-in shape compatibility with `useMaticUsdQuery` — same destructuring
 * works at every callsite.
 */
export const useMaticUsdQueryDirect = useMaticUsd
