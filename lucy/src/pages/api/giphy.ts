/**
 * /api/giphy?q=...&limit=12 — server-side GIPHY search proxy.
 *
 * Uses the same provider as SoundChain pulse-feed + wall posts (GIPHY).
 * Server-side so the API key stays out of the client bundle.
 *
 * Returns:
 *   { gifs: [{ id, url, preview, title }] }
 *
 * Env: GIPHY_API_KEY required on the soundchain-lucy Vercel project.
 *      Falls back to NEXT_PUBLIC_GIPHY_API_KEY if only that is set (parity
 *      with how SC web/arena currently store the key).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const GIPHY_KEY =
  process.env.GIPHY_API_KEY ||
  process.env.NEXT_PUBLIC_GIPHY_API_KEY ||
  ''

interface GifItem {
  id: string
  url: string      // playable GIF (downsized for messaging)
  preview: string  // small still or low-bitrate preview for picker grid
  title: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }
  if (!GIPHY_KEY) {
    return res.status(500).json({ error: 'GIPHY_API_KEY not set on this Vercel project' })
  }

  const q = (req.query.q as string || '').trim()
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 12, 1), 24)
  const rating = (req.query.rating as string) || 'pg-13'

  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=${rating}`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=${rating}`

  try {
    const upstream = await fetch(endpoint)
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `GIPHY ${upstream.status}` })
    }
    const json: any = await upstream.json()
    const gifs: GifItem[] = (json?.data || []).map((g: any) => ({
      id: g.id,
      url: g.images?.downsized_medium?.url || g.images?.original?.url || '',
      preview: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || g.images?.fixed_width?.url || '',
      title: g.title || '',
    })).filter((g: GifItem) => g.url)

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ gifs })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'GIPHY upstream failed' })
  }
}
