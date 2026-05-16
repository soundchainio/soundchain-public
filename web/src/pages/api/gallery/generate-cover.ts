/**
 * POST /api/gallery/generate-cover
 *
 * Vercel proxy to anvil's Lucy SDXL server (port 11438 via reverse-SSH
 * tunnel → EC2 nginx /sdxl/ location, exposed as norman.soundchain.io/sdxl).
 *
 * Returns PNG image bytes — caller can pipe directly to <img src="..."/>
 * via a data URL, OR upload the bytes to IPFS for permanent storage.
 *
 * Body:
 *   {
 *     prompt: string,           // album/cover description, required
 *     [steps?: number]          // 10-60, default 25
 *     [seed?: number]           // for deterministic regeneration
 *     [width?: number]          // default 1024
 *     [height?: number]         // default 1024
 *   }
 *
 * Always uses variant="gallery-cover" preset on the backend — anvil wraps
 * the prompt with album-art style anchors automatically.
 *
 * SDXL_URL env var = the tunnel root. When unset, returns 503 so the
 * caller can fall back to placeholder art instead of breaking.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SDXL_URL = process.env.SDXL_URL || ''

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 120,   // SDXL cold load + inference can take ~60s; bake in headroom
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

  const { prompt, steps, seed, width, height } = (req.body || {}) as {
    prompt?: string
    steps?: number
    seed?: number
    width?: number
    height?: number
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ error: 'prompt required (min 3 chars)' })
  }

  try {
    const ctl = new AbortController()
    const timeout = setTimeout(() => ctl.abort(), 110_000)
    const upstream = await fetch(`${SDXL_URL.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.slice(0, 2000),
        variant: 'gallery-cover',
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
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    return res.status(200).send(buf)
  } catch (err: any) {
    return res.status(502).json({
      error: err?.name === 'AbortError' ? 'sdxl timed out (~110s ceiling)' : err?.message || 'unreachable',
      fallback: 'placeholder',
    })
  }
}
