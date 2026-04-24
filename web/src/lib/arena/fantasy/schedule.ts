/**
 * Round-robin schedule generator (circle method) + playoff bracket generator.
 *
 * For N teams: generates N-1 unique rounds where every team plays every
 * other team exactly once. Odd team counts get a "BYE" slot (home === away).
 * Repeats rounds to fill the desired weeks (default NFL reg season: 14).
 *
 * Playoff bracket: top-4 single-elim, weeks 15-16. #1v#4 + #2v#3 in semis,
 * winners meet in finals week 16, losers play the consolation game.
 */

import { Matchup, FantasyTeam, PlayoffRound, PlayoffMatchup } from './types'

export function generateRoundRobin(teamHandles: string[], weeks = 14): Matchup[] {
  const teams = [...teamHandles]
  if (teams.length < 2) return []

  // Pad with BYE if odd.
  const hasBye = teams.length % 2 === 1
  if (hasBye) teams.push('__BYE__')

  const n = teams.length
  const roundsPerCycle = n - 1
  const halfSize = n / 2

  const schedule: Matchup[] = []
  let rotation = teams.slice(1)  // first team is fixed, rest rotate

  for (let week = 1; week <= weeks; week++) {
    const roundIdx = (week - 1) % roundsPerCycle
    // Build round teamList: [fixed, ...rotated]
    const rotated = [...rotation.slice(-roundIdx), ...rotation.slice(0, rotation.length - roundIdx)]
    const roundTeams = [teams[0], ...rotated]

    for (let i = 0; i < halfSize; i++) {
      const home = roundTeams[i]
      const away = roundTeams[n - 1 - i]
      if (home === '__BYE__' || away === '__BYE__') continue
      schedule.push({ week, home, away })
    }
  }

  return schedule
}

/**
 * Seed teams by W-L (desc), then totalPoints (desc).
 * Returns ownerHandles in seed order (best → worst).
 */
export function seedTeams(teams: FantasyTeam[]): string[] {
  return [...teams]
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return (b.totalPoints || 0) - (a.totalPoints || 0)
    })
    .map(t => t.ownerHandle)
}

/**
 * Generate top-4 single-elim playoff bracket.
 * Semifinals: week 15 — #1v#4, #2v#3
 * Finals: week 16 — winner of semi1 vs winner of semi2
 * Consolation (3rd place): week 16 — loser of semi1 vs loser of semi2
 *
 * Output lives on FantasyLeague.playoffBracket and progresses as results
 * come in from the live scoring engine.
 */
export function generatePlayoffBracket(teams: FantasyTeam[], startWeek = 15): PlayoffRound[] {
  const seeds = seedTeams(teams).slice(0, 4)
  if (seeds.length < 4) return []  // need exactly 4 for this format

  const semi1: PlayoffMatchup = {
    id: 'semi-1',
    week: startWeek,
    bracket: 'winners',
    round: 'semifinal',
    homeSeed: 1,
    awaySeed: 4,
    home: seeds[0],
    away: seeds[3],
  }
  const semi2: PlayoffMatchup = {
    id: 'semi-2',
    week: startWeek,
    bracket: 'winners',
    round: 'semifinal',
    homeSeed: 2,
    awaySeed: 3,
    home: seeds[1],
    away: seeds[2],
  }
  const final: PlayoffMatchup = {
    id: 'final',
    week: startWeek + 1,
    bracket: 'winners',
    round: 'final',
    feedsFromHome: 'semi-1',
    feedsFromAway: 'semi-2',
  }
  const consolation: PlayoffMatchup = {
    id: 'consolation',
    week: startWeek + 1,
    bracket: 'consolation',
    round: 'final',
    feedsFromHome: 'semi-1',
    feedsFromAway: 'semi-2',
  }

  return [
    { week: startWeek, matchups: [semi1, semi2] },
    { week: startWeek + 1, matchups: [final, consolation] },
  ]
}

/**
 * Walk the bracket and fill in home/away for final/consolation once
 * the feeder matchups have winners. Returns a new bracket (immutable).
 */
export function advancePlayoffBracket(bracket: PlayoffRound[]): PlayoffRound[] {
  const winnerOf = new Map<string, string>()
  const loserOf = new Map<string, string>()
  for (const round of bracket) {
    for (const m of round.matchups) {
      if (m.winner && m.home && m.away) {
        winnerOf.set(m.id, m.winner)
        loserOf.set(m.id, m.winner === m.home ? m.away : m.home)
      }
    }
  }
  return bracket.map(round => ({
    ...round,
    matchups: round.matchups.map(m => {
      if (m.home && m.away) return m
      const feederHome = m.feedsFromHome
      const feederAway = m.feedsFromAway
      if (!feederHome || !feederAway) return m
      const isConsolation = m.bracket === 'consolation'
      const home = isConsolation ? loserOf.get(feederHome) : winnerOf.get(feederHome)
      const away = isConsolation ? loserOf.get(feederAway) : winnerOf.get(feederAway)
      return { ...m, home: home || m.home, away: away || m.away }
    }),
  }))
}
