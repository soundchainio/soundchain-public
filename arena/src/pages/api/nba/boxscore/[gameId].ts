/**
 * NBA box-score proxy: Traditional + Advanced in one fetch.
 *
 * The two tabs share the player roster, so we always fetch them together —
 * one round-trip serves both the Traditional pill and the Advanced pill. Same
 * Mongo cache row.
 *
 * URL: /api/nba/boxscore/{espnGameId}?date={iso}&away={tricode}&home={tricode}&status={pre|live|final}
 *
 * Path param is ESPN's gameId (what arena's frontend already has from the
 * scoreboard endpoint). We resolve it to nba.com's gameId via nbaGameMap on
 * first call per game (cached forever after).
 *
 * Cache TTL: 30s during live, 24h once final. Pre-game gets a 400 — there's no
 * box score before tip-off and we don't want to burn rate budget polling for
 * nothing.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Collection } from 'mongodb'
import { arenaDb } from '@/lib/mongo'
import {
  fetchBoxScoreTraditional,
  fetchBoxScoreAdvanced,
  type NbaBoxScoreV3,
} from '@/lib/nbaStats'
import { resolveNbaGameId } from '@/lib/nbaGameMap'

interface CacheDoc {
  nbaGameId: string
  type: string                 // 'main' | 'tracking' | 'hustle' | 'matchups' | 'shotchart'
  payload: any
  fetchedAt: Date
  status: 'live' | 'final'
}

const LIVE_TTL_MS = 30_000
const FINAL_TTL_MS = 24 * 60 * 60 * 1000

let indexEnsured = false
async function ensureIndex(col: Collection<CacheDoc>) {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await col.createIndex({ nbaGameId: 1, type: 1 }, { unique: true })
  } catch {
    indexEnsured = false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const espnGameId = String(req.query.gameId ?? '').trim()
  if (!espnGameId) return res.status(400).json({ error: 'Missing gameId' })

  const dateIso = String(req.query.date ?? '').trim()
  const away = String(req.query.away ?? '').trim()
  const home = String(req.query.home ?? '').trim()
  const status = String(req.query.status ?? '').trim() as 'pre' | 'live' | 'final' | ''

  if (status === 'pre') {
    return res.status(400).json({ error: 'No box score available before tip-off' })
  }
  if (!dateIso || !away || !home) {
    return res.status(400).json({ error: 'Missing date/away/home query params' })
  }

  // Resolve ESPN gameId → nba.com gameId (cached forever after first hit)
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
  const col = db.collection<CacheDoc>('arena_nba_boxscore_cache')
  ensureIndex(col).catch(() => undefined)

  const liveOrFinal = status === 'final' ? 'final' : 'live'
  const ttl = liveOrFinal === 'final' ? FINAL_TTL_MS : LIVE_TTL_MS
  const force = String(req.query.force ?? '') === '1'

  // Cache check
  if (!force) {
    const cached = await col.findOne({ nbaGameId, type: 'main' })
    if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
      res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 1000)}`)
      return res.status(200).json({
        ...cached.payload,
        nbaGameId,
        espnGameId,
        cached: true,
        fetchedAt: cached.fetchedAt.toISOString(),
      })
    }
  }

  // Cache miss — fetch both V3 tabs in parallel
  let traditional: NbaBoxScoreV3
  let advanced: NbaBoxScoreV3
  try {
    [traditional, advanced] = await Promise.all([
      fetchBoxScoreTraditional(nbaGameId),
      fetchBoxScoreAdvanced(nbaGameId),
    ])
  } catch (err: any) {
    // Stale-while-error: if upstream blew up but we have any cached row, return
    // it w/ a stale flag rather than 502'ing. Same posture as highlights.ts.
    const stale = await col.findOne({ nbaGameId, type: 'main' })
    if (stale) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({
        ...stale.payload,
        nbaGameId,
        espnGameId,
        cached: true,
        stale: true,
        fetchedAt: stale.fetchedAt.toISOString(),
        upstreamError: err?.message ?? 'unknown',
      })
    }
    return res.status(502).json({
      error: `stats.nba.com fetch failed: ${err?.message ?? 'unknown'}`,
      nbaGameId,
      espnGameId,
    })
  }

  const payload = { traditional, advanced, status: liveOrFinal }
  const fetchedAt = new Date()
  await col
    .updateOne(
      { nbaGameId, type: 'main' },
      { $set: { nbaGameId, type: 'main', payload, fetchedAt, status: liveOrFinal } },
      { upsert: true },
    )
    .catch(() => undefined)

  res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 1000)}`)
  return res.status(200).json({
    ...payload,
    nbaGameId,
    espnGameId,
    cached: false,
    fetchedAt: fetchedAt.toISOString(),
  })
}
