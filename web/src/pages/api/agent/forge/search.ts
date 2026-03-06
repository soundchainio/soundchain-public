/**
 * Agent FORGE — Search Log & Cache Endpoint
 * POST /api/agent/forge/search — Log search queries + top results
 * GET /api/agent/forge/search — View recent searches + popular queries
 *
 * The source code engine. Scans every open source repo on Earth.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const MAX_SEARCHES = 500
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Global store
const searchLog: any[] = (global as any).__forgeSearchLog || []
if (!(global as any).__forgeSearchLog) {
  ;(global as any).__forgeSearchLog = searchLog
}

function generateId(): string {
  return 'fl_' + Math.random().toString(36).slice(2, 10)
}

function pruneExpired(): void {
  const cutoff = Date.now() - TTL_MS
  while (searchLog.length > 0 && searchLog[0].timestamp < cutoff) {
    searchLog.shift()
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const body = req.body
    if (!body.query) {
      return res.status(400).json({ error: 'Missing query' })
    }

    pruneExpired()

    const entry = {
      id: generateId(),
      query: String(body.query).slice(0, 200),
      category: body.category || null,
      resultCount: body.resultCount || 0,
      topResults: Array.isArray(body.topResults) ? body.topResults.slice(0, 5) : [],
      timestamp: Date.now(),
    }

    searchLog.push(entry)
    while (searchLog.length > MAX_SEARCHES) searchLog.shift()

    return res.status(200).json({ verdict: 'LOGGED', id: entry.id })
  }

  // GET — return recent searches + popular queries
  pruneExpired()

  const { limit } = req.query
  const maxResults = Math.min(Number(limit) || 50, 200)

  // Compute popular queries
  const queryCounts: Record<string, number> = {}
  for (const entry of searchLog) {
    const q = entry.query.toLowerCase()
    queryCounts[q] = (queryCounts[q] || 0) + 1
  }

  const popularQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }))

  return res.status(200).json({
    recentSearches: searchLog.slice(-maxResults).reverse(),
    popularQueries,
    totalSearches: searchLog.length,
    timestamp: Date.now(),
  })
}
