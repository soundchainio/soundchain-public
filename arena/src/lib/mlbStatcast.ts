/**
 * MLB Statcast extraction via statsapi.mlb.com /api/v1/game/{gamePk}/playByPlay.
 * Pulls hitData (launchSpeed, launchAngle, totalDistance, sprayed location) +
 * pitchData (startSpeed, end speed, pitch type via playEvents) per play, then
 * derives the "Statcast leaders" panel inputs:
 *   - Top 3 hardest-hit balls (by exit velo / launchSpeed)
 *   - Top 3 longest hits (by totalDistance)
 *   - Fastest pitch (by startSpeed across pitches in playEvents)
 *
 * Spray chart inputs: each in-play hit becomes a {x, y, trajectory, isHR}
 * point. statsapi coordinates use a 250x250 grid centered at home plate
 * (~(125,200)) with the field stretching upward — we leave coordinates raw
 * and the SVG renders at native resolution.
 */

const STATSAPI = 'https://statsapi.mlb.com/api/v1'

export interface StatcastHit {
  batterId: number
  batterName: string
  team: 'away' | 'home'
  inning: number
  result: string                 // "Single" / "Home Run" / etc
  launchSpeed?: number           // mph
  launchAngle?: number           // degrees
  totalDistance?: number         // feet
  trajectory?: string            // ground_ball / line_drive / fly_ball / popup
  hardness?: string              // soft / medium / hard
  coordX?: number                // statsapi sprayed coords (250-grid)
  coordY?: number
  isHomeRun: boolean
}

export interface StatcastPitch {
  pitcherId: number
  pitcherName: string
  team: 'away' | 'home'
  inning: number
  startSpeed?: number            // mph release
  endSpeed?: number              // mph crossing plate
  pitchType?: string             // FF/SL/CU/CH/SI/FC/etc
  pitchName?: string             // "Four-Seam Fastball"
  description?: string           // "Called Strike" / "Foul" / "Ball"
}

export interface MlbStatcastSnapshot {
  hardestHits: StatcastHit[]     // top 3 by launchSpeed desc
  longestHits: StatcastHit[]     // top 3 by totalDistance desc
  fastestPitches: StatcastPitch[] // top 3 by startSpeed desc
  allHits: StatcastHit[]         // for spray chart
  hitCount: number
  pitchCount: number
  // Pitch-arsenal aggregation: per pitcher, count by pitchType + avg startSpeed
  pitcherArsenals: Array<{
    pitcherId: number
    pitcherName: string
    team: 'away' | 'home'
    pitches: Array<{ pitchType: string; pitchName: string; count: number; avgSpeed: number }>
  }>
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

/** Build a Statcast snapshot for a single MLB game by gamePk.
 *  Pulls playByPlay (which includes per-pitch + per-hit Statcast metrics)
 *  + boxscore (for batter→team mapping since playByPlay uses ID-only).
 */
export async function fetchMlbStatcast(gamePk: number): Promise<MlbStatcastSnapshot | null> {
  const [pbpData, boxData] = await Promise.all([
    fetchJSON<any>(`${STATSAPI}/game/${gamePk}/playByPlay`),
    fetchJSON<any>(`${STATSAPI}/game/${gamePk}/boxscore`),
  ])
  if (!pbpData || !boxData) return null

  // Build batter→team + pitcher→team maps from boxscore
  const teamOf = new Map<number, 'away' | 'home'>()
  const awayPlayers = boxData?.teams?.away?.players ?? {}
  const homePlayers = boxData?.teams?.home?.players ?? {}
  for (const k of Object.keys(awayPlayers)) {
    const id = awayPlayers[k]?.person?.id
    if (id) teamOf.set(id, 'away')
  }
  for (const k of Object.keys(homePlayers)) {
    const id = homePlayers[k]?.person?.id
    if (id) teamOf.set(id, 'home')
  }

  const allHits: StatcastHit[] = []
  const allPitches: StatcastPitch[] = []
  const arsenalMap = new Map<number, {
    pitcherId: number
    pitcherName: string
    team: 'away' | 'home'
    types: Map<string, { name: string; count: number; speedSum: number }>
  }>()

  const plays = pbpData?.allPlays ?? []
  for (const play of plays) {
    const inning = play?.about?.inning ?? 0
    const batter = play?.matchup?.batter
    const pitcher = play?.matchup?.pitcher
    const result = play?.result?.event ?? ''
    const events = play?.playEvents ?? []

    for (const ev of events) {
      const hd = ev?.hitData
      const pd = ev?.pitchData
      const det = ev?.details

      if (hd && batter?.id) {
        const isHR = result === 'Home Run'
        allHits.push({
          batterId: batter.id,
          batterName: batter.fullName ?? '',
          team: teamOf.get(batter.id) ?? 'away',
          inning,
          result,
          launchSpeed: typeof hd.launchSpeed === 'number' ? hd.launchSpeed : undefined,
          launchAngle: typeof hd.launchAngle === 'number' ? hd.launchAngle : undefined,
          totalDistance: typeof hd.totalDistance === 'number' ? hd.totalDistance : undefined,
          trajectory: hd.trajectory,
          hardness: hd.hardness,
          coordX: hd?.coordinates?.coordX,
          coordY: hd?.coordinates?.coordY,
          isHomeRun: isHR,
        })
      }

      if (pd && pitcher?.id && typeof pd.startSpeed === 'number') {
        const pitchType = det?.type?.code ?? 'UN'
        const pitchName = det?.type?.description ?? 'Unknown'
        allPitches.push({
          pitcherId: pitcher.id,
          pitcherName: pitcher.fullName ?? '',
          team: teamOf.get(pitcher.id) ?? 'away',
          inning,
          startSpeed: pd.startSpeed,
          endSpeed: typeof pd.endSpeed === 'number' ? pd.endSpeed : undefined,
          pitchType,
          pitchName,
          description: det?.description ?? '',
        })

        if (!arsenalMap.has(pitcher.id)) {
          arsenalMap.set(pitcher.id, {
            pitcherId: pitcher.id,
            pitcherName: pitcher.fullName ?? '',
            team: teamOf.get(pitcher.id) ?? 'away',
            types: new Map(),
          })
        }
        const ar = arsenalMap.get(pitcher.id)!
        if (!ar.types.has(pitchType)) ar.types.set(pitchType, { name: pitchName, count: 0, speedSum: 0 })
        const t = ar.types.get(pitchType)!
        t.count++
        t.speedSum += pd.startSpeed
      }
    }
  }

  const hardestHits = [...allHits]
    .filter((h) => typeof h.launchSpeed === 'number')
    .sort((a, b) => (b.launchSpeed ?? 0) - (a.launchSpeed ?? 0))
    .slice(0, 3)

  const longestHits = [...allHits]
    .filter((h) => typeof h.totalDistance === 'number' && (h.totalDistance ?? 0) > 0)
    .sort((a, b) => (b.totalDistance ?? 0) - (a.totalDistance ?? 0))
    .slice(0, 3)

  const fastestPitches = [...allPitches]
    .filter((p) => typeof p.startSpeed === 'number')
    .sort((a, b) => (b.startSpeed ?? 0) - (a.startSpeed ?? 0))
    .slice(0, 3)

  const pitcherArsenals = [...arsenalMap.values()].map((a) => ({
    pitcherId: a.pitcherId,
    pitcherName: a.pitcherName,
    team: a.team,
    pitches: [...a.types.entries()]
      .map(([type, t]) => ({
        pitchType: type,
        pitchName: t.name,
        count: t.count,
        avgSpeed: t.speedSum / t.count,
      }))
      .sort((a, b) => b.count - a.count),
  }))

  return {
    hardestHits,
    longestHits,
    fastestPitches,
    allHits,
    hitCount: allHits.length,
    pitchCount: allPitches.length,
    pitcherArsenals,
  }
}
