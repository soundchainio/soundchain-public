/**
 * ESPN gameId ↔ stats.nba.com gameId mapper.
 *
 * ESPN uses 9-digit numeric IDs (e.g. "401705678"). stats.nba.com uses
 * 10-digit string IDs (e.g. "0022400123"). They're not derivable from each
 * other — we resolve by hitting nba.com Scoreboard for the game's date and
 * matching on home+away tricode pair.
 *
 * Mapping is permanent once resolved (game IDs don't change), so we cache it
 * in Mongo `arena_nba_gameid_map` with no TTL — re-resolving is just a network
 * round-trip waste.
 */
import { Collection } from 'mongodb'
import { arenaDb } from '@/lib/mongo'
import { fetchScoreboardByDate } from '@/lib/nbaStats'

interface MapDoc {
  espnGameId: string
  nbaGameId: string
  gameDate: string         // YYYYMMDD — kept for debug + future bulk re-resolve
  awayTricode: string
  homeTricode: string
  resolvedAt: Date
}

let indexEnsured = false
async function ensureIndex(col: Collection<MapDoc>) {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await col.createIndex({ espnGameId: 1 }, { unique: true })
  } catch {
    indexEnsured = false
  }
}

// ESPN sometimes uses 2-char team abbrs ("GS", "NY") while stats.nba.com always
// uses 3-char tricodes ("GSW", "NYK"). Normalize to nba.com form for matching.
// Anything not in the alias map gets uppercased and used as-is.
const ESPN_TO_NBA_TRICODE: Record<string, string> = {
  GS: 'GSW',
  BK: 'BKN',
  NO: 'NOP',
  NY: 'NYK',
  SA: 'SAS',
  PHO: 'PHX',
  WSH: 'WAS',
  UTAH: 'UTA',
}

export function normalizeTricode(espnAbbr: string): string {
  const up = String(espnAbbr ?? '').toUpperCase()
  return ESPN_TO_NBA_TRICODE[up] ?? up
}

/** YYYYMMDD from an ISO datetime, in UTC. NBA games tip off in PT/ET — using
 *  UTC is safe because nba.com's GameDate index is also UTC-aligned. */
export function yyyymmddFromIso(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export async function resolveNbaGameId(input: {
  espnGameId: string
  gameDateIso: string         // ESPN game.date — ISO datetime
  awayTricode: string         // ESPN team.abbr
  homeTricode: string
}): Promise<string | null> {
  const { espnGameId, gameDateIso } = input
  const awayTri = normalizeTricode(input.awayTricode)
  const homeTri = normalizeTricode(input.homeTricode)

  const db = await arenaDb()
  const col = db.collection<MapDoc>('arena_nba_gameid_map')
  ensureIndex(col).catch(() => undefined)

  // Cache hit — return immediately
  const cached = await col.findOne({ espnGameId })
  if (cached?.nbaGameId) return cached.nbaGameId

  // Cache miss — resolve via scoreboard
  const yyyymmdd = yyyymmddFromIso(gameDateIso)
  if (!yyyymmdd) return null

  // NBA games at midnight ET overflow to the next UTC day. Try the date as-is,
  // then ±1 day if no match. Cheap, only happens on first resolve per game.
  const candidateDates = [yyyymmdd, addDays(yyyymmdd, -1), addDays(yyyymmdd, 1)]
  for (const date of candidateDates) {
    let games
    try {
      games = await fetchScoreboardByDate(date)
    } catch {
      continue
    }
    const match = games.find(
      (g) =>
        g.homeTricode.toUpperCase() === homeTri &&
        g.awayTricode.toUpperCase() === awayTri,
    )
    if (match?.gameId) {
      const doc: MapDoc = {
        espnGameId,
        nbaGameId: match.gameId,
        gameDate: date,
        awayTricode: awayTri,
        homeTricode: homeTri,
        resolvedAt: new Date(),
      }
      // Upsert (don't error on race) — two parallel modal opens for the same
      // game on a cold cache could both reach this point.
      await col
        .updateOne({ espnGameId }, { $setOnInsert: doc }, { upsert: true })
        .catch(() => undefined)
      return match.gameId
    }
  }

  return null
}

function addDays(yyyymmdd: string, delta: number): string {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  const date = new Date(Date.UTC(y, m, d))
  date.setUTCDate(date.getUTCDate() + delta)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}
