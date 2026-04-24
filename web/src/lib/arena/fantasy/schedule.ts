/**
 * Round-robin schedule generator (circle method).
 *
 * For N teams: generates N-1 unique rounds where every team plays every
 * other team exactly once. Odd team counts get a "BYE" slot (home === away).
 * Repeats rounds to fill the desired weeks (default NFL reg season: 14).
 */

import { Matchup } from './types'

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
