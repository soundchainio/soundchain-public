/**
 * /api/arena/fantasy/[id]/live-feed
 *
 * Returns the top scoring events for every rostered player in this league's
 * current/most-recent NFL week. Shape tuned for a marquee ticker — each item
 * is a short string + metadata so the component can render with zero transforms.
 *
 * Off-season → returns { items: [], nflWeek: 0, reason: 'offseason' }.
 * Cached 60s server-side to survive burst polling.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { FantasyLeague } from 'lib/arena/fantasy/types'
import {
  fetchAthleteGamelog,
  fetchCurrentNFLWeek,
} from 'lib/arena/fantasy/espn'
import {
  computeFantasyPoints,
  FantasyPlayerStats,
} from 'lib/arena/fantasy/scoring'

interface FeedItem {
  playerId: string
  fullName: string
  position: string
  teamAbbr: string
  ownerHandle: string
  slot: string
  week: number
  points: number
  summary: string   // e.g. "24.6 pts · 2TD 280yd"
}

interface CachedFeed {
  at: number
  week: number
  items: FeedItem[]
}

const CACHE = new Map<string, CachedFeed>()
const CACHE_TTL_MS = 60 * 1000

function summarize(stats: FantasyPlayerStats): string {
  const parts: string[] = []
  if (stats.passTDs) parts.push(`${stats.passTDs}passTD`)
  if (stats.passYards) parts.push(`${stats.passYards}passYd`)
  if (stats.rushTDs) parts.push(`${stats.rushTDs}rushTD`)
  if (stats.rushYards) parts.push(`${stats.rushYards}rushYd`)
  if (stats.recTDs) parts.push(`${stats.recTDs}recTD`)
  if (stats.recYards) parts.push(`${stats.recYards}recYd`)
  if (stats.receptions) parts.push(`${stats.receptions}rec`)
  if (stats.fieldGoalsMade) parts.push(`${stats.fieldGoalsMade}FG`)
  if (stats.defTDs) parts.push(`${stats.defTDs}defTD`)
  if (stats.defSacks) parts.push(`${stats.defSacks}sk`)
  return parts.slice(0, 3).join(' ')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: 'valid id required' })

  const cached = CACHE.get(id)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json({ items: cached.items, nflWeek: cached.week, cached: true })
  }

  try {
    const nflWeek = await fetchCurrentNFLWeek()
    if (!nflWeek.week || nflWeek.week < 1) {
      const empty: CachedFeed = { at: Date.now(), week: 0, items: [] }
      CACHE.set(id, empty)
      return res.status(200).json({ items: [], nflWeek: 0, reason: 'offseason' })
    }

    const client = await clientPromise
    const db = client.db('soundchain')
    const leagues = db.collection<FantasyLeague>('fantasy_leagues')
    const league = await leagues.findOne({ _id: new ObjectId(id) as any })
    if (!league) return res.status(404).json({ error: 'league not found' })

    // Gather {playerId → {ownerHandle, slot, fullName, ...}} from rosters
    type PlayerCtx = { ownerHandle: string; slot: string; fullName: string; position: string; teamAbbr: string }
    const ctx = new Map<string, PlayerCtx>()
    for (const team of league.teams) {
      for (const r of team.roster) {
        if (!ctx.has(r.playerId)) {
          ctx.set(r.playerId, {
            ownerHandle: team.ownerHandle,
            slot: r.slot,
            fullName: r.fullName,
            position: r.position,
            teamAbbr: r.teamAbbr,
          })
        }
      }
    }

    const playerIds = Array.from(ctx.keys()).filter(pid => !pid.startsWith('dst-'))
    if (playerIds.length === 0) {
      const empty: CachedFeed = { at: Date.now(), week: nflWeek.week, items: [] }
      CACHE.set(id, empty)
      return res.status(200).json({ items: [], nflWeek: nflWeek.week, reason: 'no rosters yet' })
    }

    // Batch 10-wide to stay friendly with ESPN
    const items: FeedItem[] = []
    const BATCH = 10
    for (let i = 0; i < playerIds.length; i += BATCH) {
      const slice = playerIds.slice(i, i + BATCH)
      const results = await Promise.all(
        slice.map(async pid => {
          const gl = await fetchAthleteGamelog(pid)
          const entry = gl.find(g => g.week === nflWeek.week)
          if (!entry || !entry.stats || Object.keys(entry.stats).length === 0) return null
          const stats = entry.stats as FantasyPlayerStats
          const pts = computeFantasyPoints(stats)
          if (pts === 0) return null
          const c = ctx.get(pid)!
          return {
            playerId: pid,
            fullName: c.fullName,
            position: c.position,
            teamAbbr: c.teamAbbr,
            ownerHandle: c.ownerHandle,
            slot: c.slot,
            week: nflWeek.week,
            points: pts,
            summary: `${pts.toFixed(1)} pts · ${summarize(stats) || '—'}`,
          } as FeedItem
        })
      )
      for (const item of results) if (item) items.push(item)
    }

    items.sort((a, b) => b.points - a.points)
    const top = items.slice(0, 30)

    CACHE.set(id, { at: Date.now(), week: nflWeek.week, items: top })
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json({ items: top, nflWeek: nflWeek.week })
  } catch (err: any) {
    console.error('[live-feed] error:', err)
    return res.status(500).json({ error: err?.message || 'internal error' })
  }
}
