/**
 * ESPN public data fetchers — no API key required.
 *
 * ESPN exposes two endpoints we use:
 *   - site.api.espn.com/apis/site/v2/sports/football/nfl/athletes — player roster
 *   - site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{id}/stats — weekly stats
 *
 * Same surface the sports ticker uses. No auth.
 */

const ESPN_SITE = 'https://site.api.espn.com/apis'

export interface EspnPlayer {
  id: string
  fullName: string
  displayName: string
  position: string
  teamAbbr: string
  teamId: string
  jersey?: string
  headshot?: string
  active: boolean
}

/**
 * Fetch NFL players by position. ESPN paginates — default limit 1000 is enough
 * to cover starters + backups across the league.
 */
export async function fetchNFLPlayersByPosition(position: string, limit = 200): Promise<EspnPlayer[]> {
  try {
    const url = `${ESPN_SITE}/site/v2/sports/football/nfl/athletes?limit=${limit}&active=true&position=${encodeURIComponent(position)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    const items: any[] = data.items || data.athletes || []
    return items
      .filter(p => p && (p.id || p.uid))
      .map(p => ({
        id: String(p.id ?? p.uid),
        fullName: p.fullName || p.displayName || 'Unknown',
        displayName: p.displayName || p.fullName || 'Unknown',
        position: p.position?.abbreviation || position,
        teamAbbr: p.team?.abbreviation || p.teamAbbr || '',
        teamId: String(p.team?.id ?? p.teamId ?? ''),
        jersey: p.jersey,
        headshot: p.headshot?.href,
        active: p.active !== false,
      }))
  } catch {
    return []
  }
}

/**
 * Fetch NFL team metadata — abbreviation, display name, primary color, logo.
 * Used by DST draft entries and by the graphics pass (team-colored matchup cards).
 */
export interface EspnTeam {
  id: string
  abbreviation: string
  displayName: string
  name: string
  color: string        // hex without leading '#'
  alternateColor?: string
  logo?: string
}

export async function fetchNFLTeams(): Promise<EspnTeam[]> {
  try {
    const url = `${ESPN_SITE}/site/v2/sports/football/nfl/teams?limit=32`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    const teams: any[] = data?.sports?.[0]?.leagues?.[0]?.teams || []
    return teams
      .map(wrapper => wrapper?.team)
      .filter(t => t && t.id)
      .map(t => ({
        id: String(t.id),
        abbreviation: t.abbreviation || '',
        displayName: t.displayName || t.name || '',
        name: t.name || '',
        color: t.color || '555555',
        alternateColor: t.alternateColor,
        logo: t.logos?.[0]?.href,
      }))
  } catch {
    return []
  }
}

/**
 * Fetch current NFL season/week state from ESPN scoreboard.
 * Returns week=0 during offseason / preseason gap.
 */
export interface NFLWeekState {
  year: number
  seasonType: number   // 1=preseason, 2=regular, 3=postseason
  week: number         // 0 if offseason
}

export async function fetchCurrentNFLWeek(): Promise<NFLWeekState> {
  try {
    const url = `${ESPN_SITE}/site/v2/sports/football/nfl/scoreboard`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return { year: 0, seasonType: 0, week: 0 }
    const data = await res.json()
    return {
      year: Number(data?.season?.year ?? 0),
      seasonType: Number(data?.season?.type ?? 0),
      week: Number(data?.week?.number ?? 0),
    }
  } catch {
    return { year: 0, seasonType: 0, week: 0 }
  }
}

/**
 * Fetch a single NFL athlete's gamelog — per-game stats across the season.
 * Used by the scoring engine to map weekly performance into fantasy points.
 * Returns null if the endpoint shape drifts or the athlete has no games.
 */
export interface EspnGameStat {
  eventId: string
  week: number
  stats: Record<string, number>   // normalized keys: passYards, rushTDs, etc.
}

const STAT_LABEL_MAP: Record<string, string> = {
  'passingYards': 'passYards',
  'passingTouchdowns': 'passTDs',
  'interceptions': 'passInts',
  'rushingYards': 'rushYards',
  'rushingTouchdowns': 'rushTDs',
  'receptions': 'receptions',
  'receivingYards': 'recYards',
  'receivingTouchdowns': 'recTDs',
  'fumblesLost': 'fumblesLost',
  'fieldGoalsMade': 'fieldGoalsMade',
  'extraPointsMade': 'extraPointsMade',
  'defensiveTouchdowns': 'defTDs',
  'sacks': 'defSacks',
  'defensiveInterceptions': 'defInts',
  'fumblesRecovered': 'defFumbleRecoveries',
  'safeties': 'defSafeties',
  'pointsAllowed': 'defPointsAllowed',
}

export async function fetchAthleteGamelog(athleteId: string): Promise<EspnGameStat[]> {
  try {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${encodeURIComponent(athleteId)}/gamelog`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()

    const seasonTypes: any[] = data?.seasonTypes || []
    const reg = seasonTypes.find(s => s?.type === 2) || seasonTypes[0]
    const categories: any[] = reg?.categories || []
    const events: any[] = categories.flatMap(c => c?.events || [])
    const labels: string[] = reg?.labels || data?.labels || []

    return events.map(ev => {
      const rawStats: string[] = ev?.stats || []
      const stats: Record<string, number> = {}
      labels.forEach((label, i) => {
        const mapped = STAT_LABEL_MAP[label]
        if (!mapped) return
        const raw = rawStats[i]
        const num = Number(raw?.toString().replace(/[^0-9.-]/g, ''))
        if (!Number.isNaN(num)) stats[mapped] = num
      })
      return {
        eventId: String(ev?.eventId ?? ''),
        week: Number(ev?.week ?? 0),
        stats,
      }
    }).filter(g => g.week > 0)
  } catch {
    return []
  }
}

/**
 * Fetch NFL team defenses (DSTs) for fantasy draft.
 * ESPN exposes teams at /sports/football/nfl/teams — shape each as an EspnPlayer
 * with position='DST' so the draft board treats them uniformly.
 */
export async function fetchNFLDefenses(): Promise<EspnPlayer[]> {
  try {
    const url = `${ESPN_SITE}/site/v2/sports/football/nfl/teams?limit=32`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    const teams: any[] = data?.sports?.[0]?.leagues?.[0]?.teams || []
    return teams
      .map(wrapper => wrapper?.team)
      .filter(t => t && t.id)
      .map(t => ({
        id: `dst-${t.id}`,
        fullName: `${t.displayName || t.name} D/ST`,
        displayName: `${t.abbreviation || t.name} D/ST`,
        position: 'DST',
        teamAbbr: t.abbreviation || '',
        teamId: String(t.id),
        jersey: undefined,
        headshot: t.logos?.[0]?.href,
        active: true,
      }))
  } catch {
    return []
  }
}

/**
 * Aggregate players across major fantasy positions + team defenses in a single call.
 * Used by the draft board — all relevant picks for drafting including DST slot.
 */
export async function fetchFantasyRelevantPlayers(): Promise<EspnPlayer[]> {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K']
  const [players, defenses] = await Promise.all([
    Promise.all(positions.map(p => fetchNFLPlayersByPosition(p, 100))).then(r => r.flat()),
    fetchNFLDefenses(),
  ])
  return [...players, ...defenses]
}
