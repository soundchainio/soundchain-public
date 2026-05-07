/**
 * GET /api/nba/highlights/[gameId]?date=YYYY-MM-DD&away=...&home=...&status=...
 *
 * NBA-native highlights via stats.nba.com videodetailsasset → direct mp4 URLs
 * hosted on nba.com's video CDN. ESPN gameId → nba.com gameId resolved via the
 * shared `nbaGameMap` (same map collection used by all box-score tabs).
 *
 * Defaults to ContextMeasure=FG3M (3-pointers, ~15-25 clips/game). Auto-falls
 * back to FGM (made baskets, 70-100 clips) if the 3-pointer set is too thin —
 * which can happen for low-scoring games or first-quarter live polling.
 *
 * Same posture as `/api/mlb/highlights/[gameId]` and `/api/nhl/highlights`:
 * stale-while-error means a transient stats.nba.com outage returns
 * last-known-good with `stale:true` rather than a 502.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import { resolveNbaGameId } from '@/lib/nbaGameMap'
import { fetchVideoHighlights, nbaSeasonForDate, type NbaHighlightClip } from '@/lib/nbaStats'

interface CacheDoc {
  nbaGameId: string
  payload: NbaHighlightClip[]
  fetchedAt: Date
  status: 'live' | 'final'
}

let cacheIdxEnsured = false

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const espnGameId = String(req.query.gameId ?? '')
  const dateIso = String(req.query.date ?? '')
  const away = String(req.query.away ?? '')
  const home = String(req.query.home ?? '')
  const status = String(req.query.status ?? '') as 'pre' | 'live' | 'final' | ''

  if (!espnGameId || !dateIso || !away || !home) {
    return res.status(400).json({ error: 'Missing gameId/date/away/home query params' })
  }
  if (status === 'pre') {
    return res.status(400).json({ error: 'No highlights before tip-off' })
  }

  let nbaGameId: string | null
  try {
    nbaGameId = await resolveNbaGameId({
      espnGameId,
      gameDateIso: dateIso,
      awayTricode: away,
      homeTricode: home,
    })
  } catch (err: any) {
    return res.status(502).json({ error: `gameId resolve failed: ${err?.message ?? 'unknown'}` })
  }
  if (!nbaGameId) {
    return res.status(404).json({ error: 'No nba.com game found for this matchup' })
  }

  const db = await arenaDb()
  const cacheCol = db.collection<CacheDoc>('arena_nba_highlights_cache')
  if (!cacheIdxEnsured) {
    try { await cacheCol.createIndex({ nbaGameId: 1 }, { unique: true }); cacheIdxEnsured = true } catch {}
  }

  // TTL: 90s live (clips trickle in as plays happen), 24h final.
  const liveTtl = 90_000
  const finalTtl = 24 * 3600_000
  const ttl = status === 'final' ? finalTtl : liveTtl

  const cached = await cacheCol.findOne({ nbaGameId: nbaGameId! })
  if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
    res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
    return res.json({ nbaGameId, highlights: cached.payload, cached: true, fetchedAt: cached.fetchedAt })
  }

  const gameDate = new Date(dateIso)
  const season = nbaSeasonForDate(gameDate)
  // Playoff gameIds start with "004" (e.g. 0042500232); regular season starts "002".
  const seasonType: 'Playoffs' | 'Regular Season' = nbaGameId.startsWith('004') ? 'Playoffs' : 'Regular Season'

  let highlights: NbaHighlightClip[] = []
  try {
    highlights = await fetchVideoHighlights(nbaGameId, season, seasonType, 'FG3M', 24)
    // Auto-fallback to FGM when 3-pointer set is sparse (early game, low-3PA matchup)
    if (highlights.length < 6) {
      const fgm = await fetchVideoHighlights(nbaGameId, season, seasonType, 'FGM', 24)
      // Keep 3PT clips first (more shareable), then top up with FGM, dedupe by eventId
      const seen = new Set(highlights.map((h) => h.eventId))
      for (const c of fgm) {
        if (!seen.has(c.eventId)) {
          highlights.push(c)
          seen.add(c.eventId)
        }
      }
    }
  } catch (err: any) {
    if (cached) {
      res.setHeader('Cache-Control', 'no-store')
      return res.json({
        nbaGameId,
        highlights: cached.payload,
        cached: true,
        stale: true,
        fetchedAt: cached.fetchedAt,
        upstreamError: err?.message ?? 'unknown',
      })
    }
    return res.status(502).json({ error: `stats.nba.com video fetch failed: ${err?.message ?? 'unknown'}`, nbaGameId })
  }

  try {
    await cacheCol.updateOne(
      { nbaGameId: nbaGameId! },
      { $set: { nbaGameId: nbaGameId!, payload: highlights, fetchedAt: new Date(), status: status === 'final' ? 'final' : 'live' } },
      { upsert: true },
    )
  } catch {}

  res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
  return res.json({ nbaGameId, highlights, cached: false, fetchedAt: new Date() })
}
