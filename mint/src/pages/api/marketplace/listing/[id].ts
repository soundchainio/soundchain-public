/**
 * GET /api/marketplace/listing/[id]
 *
 * Server-side proxy to soundchain.io's listing endpoint. CORS-safe.
 * Returns 404 cleanly when SC doesn't have a listing for the id.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SC_BASE = 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  const id = String(req.query.id || '').trim()
  if (!id) {
    return res.status(400).json({ error: 'id required' })
  }

  try {
    const upstream = await fetch(`${SC_BASE}/api/marketplace/listing/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    })

    const ct = upstream.headers.get('content-type') || ''
    if (!upstream.ok || !ct.includes('application/json')) {
      return res.status(404).json({ error: 'No listing for this id', status: upstream.status })
    }

    const data = await upstream.json()
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60')
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'proxy failed' })
  }
}
