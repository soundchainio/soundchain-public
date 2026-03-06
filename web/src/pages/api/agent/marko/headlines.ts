/**
 * Agent MARKO — Headlines Endpoint
 * GET /api/agent/marko/headlines — List latest headlines across all sectors
 * POST /api/agent/marko/headlines — Ingest new headline (from scanner/webhook)
 *
 * No delays. Precise. Latest. Global.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const MAX_HEADLINES = 500
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Global store
const headlineStore: any[] = (global as any).__markoHeadlines || []
if (!(global as any).__markoHeadlines) {
  ;(global as any).__markoHeadlines = headlineStore
}

function generateId(): string {
  return 'mh_' + Math.random().toString(36).slice(2, 10)
}

function pruneExpired(): void {
  const cutoff = Date.now() - TTL_MS
  while (headlineStore.length > 0 && headlineStore[0].timestamp < cutoff) {
    headlineStore.shift()
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const body = req.body
    if (!body.title || !body.sector) {
      return res.status(400).json({ error: 'Missing title or sector' })
    }

    pruneExpired()

    const headline = {
      id: generateId(),
      title: String(body.title).slice(0, 500),
      source: String(body.source || 'unknown').slice(0, 100),
      sector: body.sector,
      priority: body.priority || 'MEDIUM',
      signal: body.signal || 'NEUTRAL',
      url: body.url ? String(body.url).slice(0, 1000) : undefined,
      symbols: Array.isArray(body.symbols) ? body.symbols.slice(0, 10) : [],
      timestamp: Date.now(),
    }

    headlineStore.push(headline)
    while (headlineStore.length > MAX_HEADLINES) headlineStore.shift()

    return res.status(200).json({ verdict: 'INGESTED', id: headline.id })
  }

  // GET
  pruneExpired()

  const { sector, priority, limit } = req.query
  let results = [...headlineStore]

  if (sector && typeof sector === 'string') {
    results = results.filter((h) => h.sector === sector)
  }
  if (priority && typeof priority === 'string') {
    results = results.filter((h) => h.priority === priority)
  }

  const maxResults = Math.min(Number(limit) || 50, 200)

  return res.status(200).json({
    headlines: results.slice(-maxResults).reverse(),
    total: results.length,
    timestamp: Date.now(),
  })
}
