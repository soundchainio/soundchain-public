/**
 * GET /api/nhl/highlights/[gameId]?date=YYYY-MM-DD&away=...&home=...&status=...
 *
 * Proxies api-web.nhle.com `/gamecenter/{nhlGameId}/landing` per-goal Brightcove
 * highlight clips into the arena. ESPN gameId → NHL gameId resolved via
 * schedule + tricode match, persisted permanently in `arena_nhl_gameid_map`
 * since NHL gameIds never change.
 *
 * Same posture as `/api/mlb/highlights/[gameId]`: stale-while-error means a
 * transient NHL.com outage returns last-known-good with `stale:true` rather
 * than a 502.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import { resolveNhlGameId, fetchNhlGameHighlights, type NhlHighlight } from '@/lib/nhlContent'

interface MapDoc { espnGameId: string; nhlGameId: number; resolvedAt: Date }
interface CacheDoc { nhlGameId: number; payload: NhlHighlight[]; fetchedAt: Date; status: 'live' | 'final' }

let mapIdxEnsured = false
let cacheIdxEnsured = false

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const gameId = String(req.query.gameId ?? '')
  const date = String(req.query.date ?? '').slice(0, 10)
  const away = String(req.query.away ?? '')
  const home = String(req.query.home ?? '')
  const status = String(req.query.status ?? '') as 'pre' | 'live' | 'final' | ''

  if (!gameId || !date || !away || !home) {
    return res.status(400).json({ error: 'Missing gameId/date/away/home query params' })
  }
  if (status === 'pre') {
    return res.status(400).json({ error: 'No highlights before puck drop' })
  }

  const db = await arenaDb()
  const mapCol = db.collection<MapDoc>('arena_nhl_gameid_map')
  const cacheCol = db.collection<CacheDoc>('arena_nhl_highlights_cache')

  if (!mapIdxEnsured) { try { await mapCol.createIndex({ espnGameId: 1 }, { unique: true }); mapIdxEnsured = true } catch {} }
  if (!cacheIdxEnsured) { try { await cacheCol.createIndex({ nhlGameId: 1 }, { unique: true }); cacheIdxEnsured = true } catch {} }

  let nhlGameId: number | null = null
  let resolvedAway = away
  let resolvedHome = home
  const existing = await mapCol.findOne({ espnGameId: gameId })
  if (existing) {
    nhlGameId = existing.nhlGameId
  } else {
    const resolved = await resolveNhlGameId(date, away, home)
    if (!resolved) {
      return res.status(404).json({ error: 'No NHL game matched ESPN inputs', date, away, home })
    }
    nhlGameId = resolved.nhlGameId
    resolvedAway = resolved.awayAbbr
    resolvedHome = resolved.homeAbbr
    try { await mapCol.insertOne({ espnGameId: gameId, nhlGameId, resolvedAt: new Date() }) } catch {}
  }

  // TTL by status — landing clip cadence is ~per-goal, so 90s catches new
  // goals during live play; finals are immutable so 24h.
  const liveTtl = 90_000
  const finalTtl = 24 * 3600_000
  const ttl = status === 'final' ? finalTtl : liveTtl

  const cached = await cacheCol.findOne({ nhlGameId: nhlGameId! })
  if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
    res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
    return res.json({ nhlGameId, highlights: cached.payload, cached: true, fetchedAt: cached.fetchedAt })
  }

  let highlights: NhlHighlight[] = []
  try {
    highlights = await fetchNhlGameHighlights(nhlGameId!, resolvedAway, resolvedHome)
  } catch {
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=60')
      return res.json({ nhlGameId, highlights: cached.payload, cached: true, stale: true, fetchedAt: cached.fetchedAt })
    }
    return res.status(502).json({ error: 'NHL.com upstream error', nhlGameId })
  }

  try {
    await cacheCol.updateOne(
      { nhlGameId: nhlGameId! },
      { $set: { nhlGameId: nhlGameId!, payload: highlights, fetchedAt: new Date(), status: status || 'live' } },
      { upsert: true },
    )
  } catch {}

  res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
  return res.json({ nhlGameId, highlights, cached: false, fetchedAt: new Date() })
}
