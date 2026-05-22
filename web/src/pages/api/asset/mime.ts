/**
 * GET /api/asset/mime?url=<url> — Vercel-direct (Phase 7e)
 * Returns the response content-type of a given URL.
 * Used by <Asset> component to decide image-vs-video rendering.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const url = req.query.url as string
  if (!url) return res.status(400).json({ error: 'url required' })

  // Quick path: file extension sniff before round-trip
  const lower = url.toLowerCase()
  if (/\.(png|jpg|jpeg|gif|webp|svg|avif)(\?|$)/.test(lower)) {
    res.setHeader('Cache-Control', 's-maxage=86400, immutable')
    return res.status(200).json({ value: 'image/png' })
  }
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) {
    res.setHeader('Cache-Control', 's-maxage=86400, immutable')
    return res.status(200).json({ value: 'video/mp4' })
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/.test(lower)) {
    res.setHeader('Cache-Control', 's-maxage=86400, immutable')
    return res.status(200).json({ value: 'audio/mpeg' })
  }

  // Fallback: HEAD request to detect content-type
  try {
    const r = await fetch(url, { method: 'HEAD' })
    const ct = r.headers.get('content-type') || 'application/octet-stream'
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ value: ct })
  } catch {
    return res.status(200).json({ value: 'application/octet-stream' })
  }
}
