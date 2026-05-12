/**
 * GET /api/tracks/list?trackId=<id>
 *
 * Server-side proxy to soundchain.io's track endpoint. Mint runs at a
 * different origin (mint.soundchain.io) so the browser CORS-blocks direct
 * fetches to soundchain.io. Proxying through the same origin sidesteps that.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SC_BASE = 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  const trackId = String(req.query.trackId || '').trim()
  if (!trackId) {
    return res.status(400).json({ error: 'trackId required' })
  }

  try {
    const upstream = await fetch(`${SC_BASE}/api/tracks/list?trackId=${encodeURIComponent(trackId)}`, {
      headers: { Accept: 'application/json' },
    })

    const ct = upstream.headers.get('content-type') || ''
    if (!upstream.ok || !ct.includes('application/json')) {
      return res.status(upstream.status === 200 ? 502 : upstream.status).json({
        error: 'Upstream did not return JSON',
        status: upstream.status,
      })
    }

    const data = await upstream.json()
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'proxy failed' })
  }
}
