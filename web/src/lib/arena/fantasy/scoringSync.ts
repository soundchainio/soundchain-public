/**
 * Fantasy scoring sync — pulls per-week player stats from ESPN, applies PPR
 * scoring, updates each live league's team.weeklyScores[week] + totalPoints,
 * and flips matchup W/L after a week has completed.
 *
 * Entry points:
 *   - syncAllLiveLeagues() — cron-scope: iterate every live league, sync current week
 *   - syncLeagueScores(leagueId, week) — per-league, idempotent (safe to re-run)
 */
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { FantasyLeague, FantasyTeam, Matchup } from './types'
import { computeFantasyPoints, FantasyPlayerStats } from './scoring'
import { fetchAthleteGamelog, fetchCurrentNFLWeek, NFLWeekState } from './espn'

/**
 * Pulls ESPN gamelog once per player per sync, caches in-memory per invocation
 * so the same roster-shared player across leagues (Mahomes in 8 leagues)
 * doesn't fetch 8 times.
 */
type PlayerWeekPoints = Record<string /* playerId */, number>

async function buildPlayerWeekPoints(
  playerIds: string[],
  week: number
): Promise<PlayerWeekPoints> {
  const out: PlayerWeekPoints = {}
  // Concurrent fetch, but cap to 10 in-flight to stay under ESPN informal rate limits
  const BATCH = 10
  for (let i = 0; i < playerIds.length; i += BATCH) {
    const slice = playerIds.slice(i, i + BATCH)
    const results = await Promise.all(
      slice.map(async (pid) => {
        // DST entries are synthesized as `dst-{teamId}` — no gamelog, skip for now.
        // (Team defense scoring via game boxscore is a follow-up.)
        if (pid.startsWith('dst-')) return [pid, 0] as const
        const gamelog = await fetchAthleteGamelog(pid)
        const weekEntry = gamelog.find(g => g.week === week)
        if (!weekEntry) return [pid, 0] as const
        const stats = weekEntry.stats as FantasyPlayerStats
        return [pid, computeFantasyPoints(stats)] as const
      })
    )
    for (const [pid, pts] of results) out[pid] = pts
  }
  return out
}

function recomputeTotalPoints(team: FantasyTeam): number {
  return Object.values(team.weeklyScores || {}).reduce((a, b) => a + (b || 0), 0)
}

function applyMatchupResults(
  schedule: Matchup[],
  teams: FantasyTeam[],
  completedThroughWeek: number
): { schedule: Matchup[]; teamsWithRecords: FantasyTeam[] } {
  const byHandle = new Map(teams.map(t => [t.ownerHandle, { ...t, wins: 0, losses: 0 }]))

  const nextSchedule = schedule.map(m => {
    if (m.week > completedThroughWeek) return m
    const home = byHandle.get(m.home)
    const away = byHandle.get(m.away)
    if (!home || !away) return m
    const homeScore = home.weeklyScores?.[m.week] ?? 0
    const awayScore = away.weeklyScores?.[m.week] ?? 0
    let winner: string | undefined
    if (homeScore > awayScore) { winner = m.home; home.wins++; away.losses++ }
    else if (awayScore > homeScore) { winner = m.away; away.wins++; home.losses++ }
    else { winner = 'tie' }
    return { ...m, homeScore, awayScore, winner }
  })

  // Recompute totalPoints for every team from weeklyScores
  const finalTeams = Array.from(byHandle.values())
  finalTeams.forEach(t => { t.totalPoints = recomputeTotalPoints(t) })

  return {
    schedule: nextSchedule,
    teamsWithRecords: finalTeams,
  }
}

export interface SyncResult {
  leagueId: string
  week: number
  playersSynced: number
  teamsUpdated: number
  status: 'ok' | 'skipped' | 'error'
  reason?: string
}

export async function syncLeagueScores(
  leagueId: string,
  weekOverride?: number
): Promise<SyncResult> {
  const client = await clientPromise
  const db = client.db('soundchain')
  const leagues = db.collection<FantasyLeague>('fantasy_leagues')

  if (!ObjectId.isValid(leagueId)) {
    return { leagueId, week: 0, playersSynced: 0, teamsUpdated: 0, status: 'error', reason: 'invalid id' }
  }

  const league = await leagues.findOne({ _id: new ObjectId(leagueId) as any })
  if (!league) {
    return { leagueId, week: 0, playersSynced: 0, teamsUpdated: 0, status: 'error', reason: 'not found' }
  }
  if (league.status !== 'live') {
    return { leagueId, week: 0, playersSynced: 0, teamsUpdated: 0, status: 'skipped', reason: `status=${league.status}` }
  }

  let week = weekOverride
  if (!week) {
    const state = await fetchCurrentNFLWeek()
    week = state.week
  }
  if (!week || week < 1 || week > 18) {
    return { leagueId, week: week || 0, playersSynced: 0, teamsUpdated: 0, status: 'skipped', reason: 'offseason' }
  }

  const allPlayerIds = Array.from(
    new Set(league.teams.flatMap(t => t.roster.map(r => r.playerId)))
  )
  if (allPlayerIds.length === 0) {
    return { leagueId, week, playersSynced: 0, teamsUpdated: 0, status: 'skipped', reason: 'empty rosters' }
  }

  const weekPoints = await buildPlayerWeekPoints(allPlayerIds, week)

  // Score each team's STARTERS for this week (bench doesn't count)
  const updatedTeams = league.teams.map(team => {
    const starters = team.roster.filter(r => r.slot !== 'BENCH')
    const weekTotal = starters.reduce((sum, r) => sum + (weekPoints[r.playerId] || 0), 0)
    const newWeekly = { ...(team.weeklyScores || {}), [week!]: Math.round(weekTotal * 100) / 100 }
    return { ...team, weeklyScores: newWeekly }
  })

  const { schedule: nextSchedule, teamsWithRecords } = applyMatchupResults(
    league.schedule || [],
    updatedTeams,
    week
  )

  // Merge this week's per-player scores into league.weekPlayerScores[week]
  const existingWeekPlayerScores = (league as any).weekPlayerScores || {}
  const mergedWeekPlayerScores = {
    ...existingWeekPlayerScores,
    [week]: weekPoints,
  }

  await leagues.updateOne(
    { _id: new ObjectId(leagueId) as any },
    {
      $set: {
        teams: teamsWithRecords,
        schedule: nextSchedule,
        weekPlayerScores: mergedWeekPlayerScores,
        lastScoringSyncAt: new Date().toISOString(),
        lastScoringSyncWeek: week,
        updatedAt: new Date().toISOString(),
      } as any,
    }
  )

  return {
    leagueId,
    week,
    playersSynced: allPlayerIds.length,
    teamsUpdated: teamsWithRecords.length,
    status: 'ok',
  }
}

export async function syncAllLiveLeagues(): Promise<{
  nflWeek: NFLWeekState
  results: SyncResult[]
}> {
  const nflWeek = await fetchCurrentNFLWeek()
  const client = await clientPromise
  const db = client.db('soundchain')
  const leagues = db.collection<FantasyLeague>('fantasy_leagues')
  const live = await leagues.find({ status: 'live' }).project({ _id: 1 }).toArray()
  const ids = live.map(l => (l._id as any).toString())

  const results: SyncResult[] = []
  for (const id of ids) {
    try {
      const r = await syncLeagueScores(id, nflWeek.week || undefined)
      results.push(r)
    } catch (err: any) {
      results.push({
        leagueId: id, week: 0, playersSynced: 0, teamsUpdated: 0,
        status: 'error', reason: err?.message || 'unknown',
      })
    }
  }
  return { nflWeek, results }
}
