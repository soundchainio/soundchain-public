/**
 * POST /api/land/parcel-art
 *
 * Vercel proxy to anvil's Lucy SDXL server. Same backend as
 * /api/gallery/generate-cover, different variant preset (land-parcel
 * style anchors instead of gallery-cover).
 *
 * Powers Land Atlas Path A — when a user hovers/clicks an unmapped
 * parcel, generate a unique terrain skybox or ownership card based on
 * the parcel's geographic context (lat/lng, biome hint, nearby POIs).
 *
 * Body:
 *   {
 *     prompt: string,           // terrain description, required
 *     [variant?: "land-parcel" | "skybox"]   // default "land-parcel"
 *     [steps?: number]
 *     [seed?: number]
 *     [width?: number]
 *     [height?: number]
 *   }
 *
 * Pass seed=<parcel-id-hash> to ensure each parcel always generates the
 * same artwork (caller can reproduce on demand). Cache for 24h since
 * parcel artwork is deterministic per-seed.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SDXL_URL = process.env.SDXL_URL || ''

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 120,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!SDXL_URL) {
    return res.status(503).json({
      error: 'SDXL_URL not configured. Stand up lucy-sdxl on anvil and set SDXL_URL on Vercel.',
      fallback: 'placeholder',
    })
  }

  const { prompt, variant, steps, seed, width, height } = (req.body || {}) as {
    prompt?: string
    variant?: 'land-parcel' | 'skybox'
    steps?: number
    seed?: number
    width?: number
    height?: number
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ error: 'prompt required (min 3 chars)' })
  }
  const finalVariant = variant === 'skybox' ? 'skybox' : 'land-parcel'

  try {
    const ctl = new AbortController()
    const timeout = setTimeout(() => ctl.abort(), 110_000)
    const upstream = await fetch(`${SDXL_URL.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.slice(0, 2000),
        variant: finalVariant,
        steps: typeof steps === 'number' ? Math.max(10, Math.min(60, steps)) : 25,
        seed: typeof seed === 'number' ? seed : undefined,
        width: typeof width === 'number' ? width : undefined,
        height: typeof height === 'number' ? height : undefined,
      }),
      signal: ctl.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return res.status(502).json({
        error: `anvil sdxl returned ${upstream.status}`,
        detail: text.slice(0, 300),
        fallback: 'placeholder',
      })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    // 24h cache + immutable: same seed should always return the same image
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    return res.status(200).send(buf)
  } catch (err: any) {
    return res.status(502).json({
      error: err?.name === 'AbortError' ? 'sdxl timed out (~110s ceiling)' : err?.message || 'unreachable',
      fallback: 'placeholder',
    })
  }
}
