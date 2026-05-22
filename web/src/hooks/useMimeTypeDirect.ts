/**
 * Phase 7e — Vercel-direct replacement for `useMimeTypeQuery`.
 * GET /api/asset/mime?url=
 */
import { useEffect, useState } from 'react'

type MimeShape = { mimeType: { value: string } }

const cache = new Map<string, MimeShape>()

export const useMimeType = (opts: {
  variables?: { url?: string }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: MimeShape | undefined
  loading: boolean
  error: Error | null
} => {
  const url = opts?.variables?.url || ''
  const skip = !!opts?.skip || !url
  const initial = !skip ? cache.get(url) : undefined
  const [data, setData] = useState<MimeShape | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!skip && !initial)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    if (cache.has(url)) {
      setData(cache.get(url))
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/asset/mime?url=${encodeURIComponent(url)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled) return
        if (json?.value) {
          const shape: MimeShape = { mimeType: { value: json.value } }
          cache.set(url, shape)
          setData(shape)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [url, skip])
  return { data, loading, error: null }
}
