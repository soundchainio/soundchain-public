/**
 * GET /api/neural/state
 *
 * Vercel proxy to anvil's Lucy Neural server (port 11437 on anvil,
 * forwarded via reverse-SSH tunnel to EC2:11437, exposed publicly as
 * https://norman.soundchain.io/neural/* through EC2 nginx).
 *
 * NEURAL_URL env var is the tunnel root, e.g. https://norman.soundchain.io/neural
 * When unset, this route 503s and the client visualizer falls back to
 * its existing audio-FFT-driven mode (graceful degradation).
 *
 * Response shape mirrors anvil's /state directly:
 *   {
 *     regions: { auditory, motor, prefrontal, emotional, reward },
 *     engagement: 0-100,
 *     source: "synthetic" | "audio-ml" | "eeg",
 *     model: string,
 *     timestamp: number
 *   }
 *
 * No auth gate — Neural visualization is read-only and harmless to
 * surface globally. If we later want per-user scoring (e.g. from each
 * user's own EEG), this becomes auth-gated and parameterized by user.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const NEURAL_URL = process.env.NEURAL_URL || ''
// Cache the response for 250ms to throttle anvil load when many clients
// poll the same instant. Visualizer polls every 1s; with 4+ tabs open this
// caps anvil at ~4 req/s instead of 4× clients.
let cache: { ts: number; data: any } | null = null
const CACHE_TTL_MS = 250

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  if (!NEURAL_URL) {
    return res.status(503).json({
      error: 'NEURAL_URL not configured. Set it on Vercel pointing at anvil tunnel (e.g. https://norman.soundchain.io/neural).',
      fallback: 'audio-fft',
    })
  }

  // Cache hit
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1, stale-while-revalidate=5')
    return res.status(200).json(cache.data)
  }

  try {
    const ctl = new AbortController()
    const timeout = setTimeout(() => ctl.abort(), 3000)
    const upstream = await fetch(`${NEURAL_URL.replace(/\/$/, '')}/state`, {
      method: 'GET',
      signal: ctl.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      return res.status(502).json({
        error: `anvil neural returned ${upstream.status}`,
        fallback: 'audio-fft',
      })
    }
    const data = await upstream.json()
    cache = { ts: Date.now(), data }
    res.setHeader('X-Cache', 'MISS')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1, stale-while-revalidate=5')
    return res.status(200).json(data)
  } catch (err: any) {
    // Stale cache on error (better than nothing)
    if (cache) {
      res.setHeader('X-Cache', 'STALE-ERROR')
      return res.status(200).json({ ...cache.data, stale: true })
    }
    return res.status(502).json({
      error: err?.name === 'AbortError' ? 'anvil neural timed out' : err?.message || 'unreachable',
      fallback: 'audio-fft',
    })
  }
}
