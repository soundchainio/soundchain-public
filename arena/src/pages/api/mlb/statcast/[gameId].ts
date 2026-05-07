/**
 * GET /api/mlb/statcast/[gameId]?date=YYYY-MM-DD&away=...&home=...&status=
 *
 * Statcast snapshot for an MLB game — leaders + spray chart input + pitcher
 * arsenals. Reuses the gamePk map seeded by /api/mlb/highlights so we don't
 * resolve ESPN→gamePk twice. If the highlights endpoint hasn't been hit yet,
 * resolves on demand.
 *
 * Cache: status-aware TTL. Live games refresh every 60s (statsapi pbp updates
 * after every pitch but the snapshot only changes meaningfully per at-bat,
 * ~3-5min cadence — 60s is a safe ceiling). Final games are immutable, 24h.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import { resolveMlbGamePk } from '@/lib/mlbContent'
import { fetchMlbStatcast, type MlbStatcastSnapshot } from '@/lib/mlbStatcast'

interface MapDoc { espnGameId: string; gamePk: number; resolvedAt: Date }
interface CacheDoc { gamePk: number; payload: MlbStatcastSnapshot; fetchedAt: Date; status: 'live' | 'final' }

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
    return res.status(400).json({ error: 'No Statcast before first pitch' })
  }

  const db = await arenaDb()
  const mapCol = db.collection<MapDoc>('arena_mlb_gamepk_map')
  const cacheCol = db.collection<CacheDoc>('arena_mlb_statcast_cache')

  if (!mapIdxEnsured) { try { await mapCol.createIndex({ espnGameId: 1 }, { unique: true }); mapIdxEnsured = true } catch {} }
  if (!cacheIdxEnsured) { try { await cacheCol.createIndex({ gamePk: 1 }, { unique: true }); cacheIdxEnsured = true } catch {} }

  // Resolve gamePk (shared with highlights endpoint via same map collection)
  let gamePk: number | null = null
  const existing = await mapCol.findOne({ espnGameId: gameId })
  if (existing) {
    gamePk = existing.gamePk
  } else {
    const resolved = await resolveMlbGamePk(date, away, home)
    if (!resolved) {
      return res.status(404).json({ error: 'No MLB game matched ESPN inputs', date, away, home })
    }
    gamePk = resolved.gamePk
    try { await mapCol.insertOne({ espnGameId: gameId, gamePk, resolvedAt: new Date() }) } catch {}
  }

  // Cache check
  const liveTtl = 60_000
  const finalTtl = 24 * 3600_000
  const ttl = status === 'final' ? finalTtl : liveTtl

  const cached = await cacheCol.findOne({ gamePk: gamePk! })
  if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
    res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
    return res.json({ gamePk, statcast: cached.payload, cached: true, fetchedAt: cached.fetchedAt })
  }

  // Fetch upstream
  let snapshot: MlbStatcastSnapshot | null = null
  try {
    snapshot = await fetchMlbStatcast(gamePk!)
  } catch {
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=60')
      return res.json({ gamePk, statcast: cached.payload, cached: true, stale: true, fetchedAt: cached.fetchedAt })
    }
    return res.status(502).json({ error: 'MLB statsapi upstream error', gamePk })
  }
  if (!snapshot) return res.status(404).json({ error: 'No Statcast data', gamePk })

  // Persist
  try {
    await cacheCol.updateOne(
      { gamePk: gamePk! },
      { $set: { gamePk: gamePk!, payload: snapshot, fetchedAt: new Date(), status: status || 'live' } },
      { upsert: true },
    )
  } catch {}

  res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 2000)}, stale-while-revalidate=3600`)
  return res.json({ gamePk, statcast: snapshot, cached: false, fetchedAt: new Date() })
}
