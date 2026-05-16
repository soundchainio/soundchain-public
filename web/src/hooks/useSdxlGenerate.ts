/**
 * useSdxlGenerate — Phase 16 frontend hook.
 *
 * Single hook for both Gallery3D (cover-art generation) and Land Atlas
 * (parcel artwork) — picks the right Vercel proxy endpoint based on the
 * `kind` param. Both hit the same anvil SDXL backend internally.
 *
 * Returns a data: URL once the image lands, so callers can drop it
 * straight into <img src={url} /> or pass as a Three.js texture URL
 * without any blob-juggling.
 *
 * Per-call result cached in module state keyed by `cacheKey`. Same key
 * → same call returns cached image instantly without re-hitting anvil.
 * Set deterministic cacheKey (e.g. trackId, parcelId) for stable art
 * per entity; null cacheKey re-generates every call.
 *
 * Usage in Gallery3D:
 *   const { url, loading, error } = useSdxlGenerate({
 *     kind: 'gallery',
 *     prompt: `${trackTitle} by ${artist}, ${genre}`,
 *     cacheKey: `track:${trackId}`,
 *     seed: hashStringToInt(trackId),
 *   })
 *
 * Usage in Land Atlas:
 *   const { url, loading, error } = useSdxlGenerate({
 *     kind: 'land',
 *     variant: 'land-parcel',
 *     prompt: `terrain near ${lat}, ${lng}`,
 *     cacheKey: `parcel:${parcelId}`,
 *     seed: hashStringToInt(parcelId),
 *   })
 *
 * Falls back silently (returns null url) when SDXL_URL isn't set on
 * Vercel or anvil is unreachable — caller renders default art.
 */
import { useEffect, useRef, useState } from 'react'

type GenerateKind = 'gallery' | 'land'
type LandVariant = 'land-parcel' | 'skybox'

interface GenerateOpts {
  kind: GenerateKind
  prompt: string
  /** For land kind only. Default 'land-parcel'. */
  variant?: LandVariant
  /** Stable cache key. Same key → same image. null = no cache (regen each time). */
  cacheKey?: string | null
  /** Deterministic seed. Same seed + prompt → same image. */
  seed?: number
  /** Steps 10-60, default 25. Lower = faster, higher = quality. */
  steps?: number
  width?: number
  height?: number
  /** Set false to defer generation until enabled becomes true. */
  enabled?: boolean
}

interface GenerateResult {
  url: string | null
  loading: boolean
  error: string | null
  /** Force-refresh, bypassing cache. */
  regenerate: () => void
}

// Module-level cache shared across hook instances. Keyed by cacheKey.
const imageCache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

async function generateSdxl(opts: GenerateOpts): Promise<string | null> {
  const endpoint = opts.kind === 'gallery'
    ? '/api/gallery/generate-cover'
    : '/api/land/parcel-art'

  const body: Record<string, any> = { prompt: opts.prompt }
  if (opts.kind === 'land' && opts.variant) body.variant = opts.variant
  if (typeof opts.seed === 'number') body.seed = opts.seed
  if (typeof opts.steps === 'number') body.steps = opts.steps
  if (typeof opts.width === 'number') body.width = opts.width
  if (typeof opts.height === 'number') body.height = opts.height

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // 503 = SDXL_URL not configured; treat as graceful fallback
    throw new Error(`sdxl ${res.status}`)
  }
  const blob = await res.blob()
  // Convert to data URL for stable use across re-renders + Three.js textures
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function useSdxlGenerate(opts: GenerateOpts): GenerateResult {
  const [url, setUrl] = useState<string | null>(() => {
    if (opts.cacheKey && imageCache.has(opts.cacheKey)) {
      return imageCache.get(opts.cacheKey) || null
    }
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const enabled = opts.enabled !== false
  const cacheKey = opts.cacheKey || null
  const promptKey = opts.prompt

  useEffect(() => {
    if (!enabled || !promptKey || promptKey.trim().length < 3) return
    // Cache hit — show immediately, no fetch
    if (cacheKey && imageCache.has(cacheKey)) {
      setUrl(imageCache.get(cacheKey) || null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    // Single-flight per cacheKey — multiple hooks asking for the same art
    // share one network call
    const flightKey = cacheKey || `prompt:${promptKey}:seed:${opts.seed || ''}`
    let promise = inflight.get(flightKey)
    if (!promise) {
      promise = generateSdxl(optsRef.current)
      inflight.set(flightKey, promise)
    }

    promise
      .then((dataUrl) => {
        if (cancelled) return
        if (dataUrl) {
          if (cacheKey) imageCache.set(cacheKey, dataUrl)
          setUrl(dataUrl)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'sdxl failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
        inflight.delete(flightKey)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, promptKey, cacheKey, opts.seed, refreshCount])

  return {
    url,
    loading,
    error,
    regenerate: () => {
      if (cacheKey) imageCache.delete(cacheKey)
      setRefreshCount((c) => c + 1)
    },
  }
}

/**
 * Stable 32-bit hash of a string — useful for deterministic seed
 * generation from trackId / parcelId / handle. djb2-style.
 */
export function hashStringToSeed(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i)
    h = h & 0xffffffff
  }
  return Math.abs(h)
}
