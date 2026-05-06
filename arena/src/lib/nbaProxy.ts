/**
 * Shared "proxy stats.nba.com endpoint with Mongo cache" helper.
 *
 * Each NBA stat tab (tracking, hustle, matchups, shot chart) has the same
 * shape: resolve ESPN→nba.com gameId, check cache, fetch upstream, persist,
 * return. This function is the body — the per-tab routes just plug in the
 * cache key + the fetcher.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Collection } from 'mongodb'
import { arenaDb } from '@/lib/mongo'
import { resolveNbaGameId } from '@/lib/nbaGameMap'

interface CacheDoc {
  nbaGameId: string
  type: string
  payload: any
  fetchedAt: Date
  status: 'live' | 'final'
}

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

interface ProxyOpts<T> {
  type: 'tracking' | 'hustle' | 'matchups' | 'shotchart'
  // TTL during live game (ms). Pass higher values for stats that update slowly.
  liveTtlMs: number
  // Final-state TTL — most stats are immutable post-game so 24h is plenty.
  finalTtlMs?: number
  // The actual upstream fetch. Receives nba.com gameId + the date (used by
  // shotchart for season derivation).
  fetcher: (nbaGameId: string, gameDate: Date) => Promise<T>
}

export async function nbaCachedProxy<T>(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: ProxyOpts<T>,
) {
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
    return res.status(400).json({ error: 'No stats available before tip-off' })
  }
  if (!dateIso || !away || !home) {
    return res.status(400).json({ error: 'Missing date/away/home query params' })
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

  const liveOrFinal = status === 'final' ? 'final' : 'live'
  const ttl = liveOrFinal === 'final' ? (opts.finalTtlMs ?? 24 * 60 * 60 * 1000) : opts.liveTtlMs
  const force = String(req.query.force ?? '') === '1'

  const db = await arenaDb()
  const col = db.collection<CacheDoc>('arena_nba_boxscore_cache')
  ensureIndex(col).catch(() => undefined)

  if (!force) {
    const cached = await col.findOne({ nbaGameId, type: opts.type })
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

  const gameDate = new Date(dateIso)
  let payload: T
  try {
    payload = await opts.fetcher(nbaGameId, gameDate)
  } catch (err: any) {
    const stale = await col.findOne({ nbaGameId, type: opts.type })
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

  const fetchedAt = new Date()
  await col
    .updateOne(
      { nbaGameId, type: opts.type },
      { $set: { nbaGameId, type: opts.type, payload, fetchedAt, status: liveOrFinal } },
      { upsert: true },
    )
    .catch(() => undefined)

  res.setHeader('Cache-Control', `public, s-maxage=${Math.floor(ttl / 1000)}`)
  return res.status(200).json({
    ...(payload as any),
    nbaGameId,
    espnGameId,
    cached: false,
    fetchedAt: fetchedAt.toISOString(),
  })
}
