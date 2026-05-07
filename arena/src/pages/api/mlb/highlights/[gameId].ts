/**
 * GET /api/mlb/highlights/[gameId]?date=YYYY-MM-DD&away=...&home=...
 *
 * Proxies MLB statsapi `/api/v1/game/{gamePk}/content` highlights into the
 * arena. ESPN gameId → MLB gamePk resolved via schedule + team-name match,
 * persisted permanently in Mongo (`arena_mlb_gamepk_map`) since gamePks
 * never change. Highlights cached in `arena_mlb_highlights_cache` with
 * status-aware TTL — live games ~120s (statsapi clip cadence), finals 24h.
 *
 * Returns shaped 404 (not 502) when no MLB game matches the ESPN inputs so
 * the frontend can fall back to the universal YouTube highlights strip.
 *
 * Same posture as `/api/nba/boxscore/[gameId]`: stale-while-error means
 * a transient statsapi outage returns last-known-good with `stale:true`.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import { resolveMlbGamePk, fetchMlbGameHighlights, type MlbHighlight } from '@/lib/mlbContent'

interface MapDoc { espnGameId: string; gamePk: number; resolvedAt: Date }
interface CacheDoc { gamePk: number; payload: MlbHighlight[]; fetchedAt: Date; status: 'live' | 'final' }

let mapIdxEnsured = false
let cacheIdxEnsured = false

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const gameId = String(req.query.gameId ?? '')
  const date = String(req.query.date ?? '')
  const away = String(req.query.away ?? '')
  const home = String(req.query.home ?? '')
  const status = String(req.query.status ?? '') as 'pre' | 'live' | 'final' | ''

  if (!gameId || !date || !away || !home) {
    return res.status(400).json({ error: 'Missing gameId/date/away/home query params' })
  }
  if (status === 'pre') {
    return res.status(400).json({ error: 'No highlights before first pitch' })
  }

  const db = await arenaDb()
  const mapCol = db.collection<MapDoc>('arena_mlb_gamepk_map')
  const cacheCol = db.collection<CacheDoc>('arena_mlb_highlights_cache')

  if (!mapIdxEnsured) { try { await mapCol.createIndex({ espnGameId: 1 }, { unique: true }); mapIdxEnsured = true } catch {} }
  if (!cacheIdxEnsured) { try { await cacheCol.createIndex({ gamePk: 1 }, { unique: true }); cacheIdxEnsured = true } catch {} }

  // Resolve ESPN gameId → MLB gamePk (one-time lookup, then cached forever)
  let gamePk: number | null = null
  const existing = await mapCol.findOne({ espnGameId: gameId })
  if (existing) {
    gamePk = existing.gamePk
  } else {
    const resolved = await resolveMlbGamePk(date, away, home)
    if (!resolved) {
      return res.status(404).json({ error: 'No MLB statsapi game matched ESPN inputs', date, away, home })
    }
    gamePk = resolved.gamePk
    try { await mapCol.insertOne({ espnGameId: gameId, gamePk, resolvedAt: new Date() }) } catch {}
  }

  // Cache check — TTL by status
  const liveTtl = 120_000   // 120s — statsapi clip cadence
  const finalTtl = 24 * 3600_000  // 24h
  const ttl = status === 'final' ? finalTtl : liveTtl

  const cached = await cacheCol.findOne({ gamePk: gamePk! })
  if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
    res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
    return res.json({ gamePk, highlights: cached.payload, cached: true, fetchedAt: cached.fetchedAt })
  }

  // Fetch upstream
  let highlights: MlbHighlight[] = []
  try {
    highlights = await fetchMlbGameHighlights(gamePk!)
  } catch {
    // stale-while-error
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=60')
      return res.json({ gamePk, highlights: cached.payload, cached: true, stale: true, fetchedAt: cached.fetchedAt })
    }
    return res.status(502).json({ error: 'MLB statsapi upstream error', gamePk })
  }

  // Persist
  try {
    await cacheCol.updateOne(
      { gamePk: gamePk! },
      { $set: { gamePk: gamePk!, payload: highlights, fetchedAt: new Date(), status: status || 'live' } },
      { upsert: true },
    )
  } catch {}

  res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
  return res.json({ gamePk, highlights, cached: false, fetchedAt: new Date() })
}
