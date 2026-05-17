/**
 * POST /api/character/portrait-to-mesh
 *
 * Vercel proxy to anvil's Lucy TripoSR — Character Designer Phase 16.3.
 * Single character portrait (data URL from /api/character/generate-portrait)
 * → rotatable GLB mesh via TripoSR on RTX 5000.
 *
 * Body:
 *   {
 *     image_b64: string,           // base64 PNG/JPEG bytes (no data URL prefix)
 *     [resolution?: number]        // 128-512, default 256 (marching cubes grid)
 *     [remove_bg?: boolean]        // default true — strips background for cleaner mesh
 *   }
 *
 * Returns binary GLB bytes (Content-Type: model/gltf-binary). Caller streams
 * the response into Three.js GLTFLoader.parse() or stores as a Blob URL.
 *
 * 24h cache because same portrait + same resolution = deterministic mesh.
 *
 * Falls back gracefully (503) when TRIPO_URL is unset — frontend treats
 * this as "3D not available" and skips the rotate-mesh affordance.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const TRIPO_URL = process.env.TRIPO_URL || ''

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
  // TripoSR cold-load = ~30s, inference ~10-30s on RTX 5000. Allow headroom.
  maxDuration: 180,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!TRIPO_URL) {
    return res.status(503).json({
      error: 'TRIPO_URL not configured. Stand up lucy-tripo on anvil and set TRIPO_URL on Vercel.',
      fallback: 'no-3d-yet',
    })
  }

  const { image_b64, resolution, remove_bg } = (req.body || {}) as {
    image_b64?: string
    resolution?: number
    remove_bg?: boolean
  }
  if (!image_b64 || typeof image_b64 !== 'string' || image_b64.length < 100) {
    return res.status(400).json({ error: 'image_b64 required (raw base64, no data: prefix)' })
  }
  // Strip data:image/... prefix if the client sent it accidentally
  const cleaned = image_b64.replace(/^data:image\/[a-zA-Z]+;base64,/, '')

  try {
    const ctl = new AbortController()
    const timeout = setTimeout(() => ctl.abort(), 170_000)
    const upstream = await fetch(`${TRIPO_URL.replace(/\/$/, '')}/generate-mesh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_b64: cleaned,
        resolution: typeof resolution === 'number' ? Math.max(128, Math.min(512, resolution)) : undefined,
        remove_bg: remove_bg !== false,
      }),
      signal: ctl.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return res.status(502).json({
        error: `anvil tripo returned ${upstream.status}`,
        detail: text.slice(0, 300),
        fallback: 'no-3d-yet',
      })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', 'model/gltf-binary')
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    return res.status(200).send(buf)
  } catch (err: any) {
    return res.status(502).json({
      error: err?.name === 'AbortError' ? 'tripo timed out (~170s ceiling)' : err?.message || 'unreachable',
      fallback: 'no-3d-yet',
    })
  }
}
