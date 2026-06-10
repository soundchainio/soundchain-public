/**
 * NBA Finals data layer — the live 2026 Finals (New York vs San Antonio).
 *
 * Wraps ESPN's CORS-open basketball/nba endpoints into the shapes the Finals
 * landing page renders: the live Game-4 state, both teams' identity/colors,
 * star-player headshot cutouts, and the series bracket. Client-callable; the
 * page auto-refreshes during the game.
 */

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

export interface FinalsTeam {
  id: string
  name: string
  short: string
  abbr: string
  color: string // primary, no '#'
  alt: string // secondary
  logo: string
}

export interface FinalsSide {
  teamId: string
  score: string
  winner: boolean
  homeAway: 'home' | 'away'
}

export interface FinalsGame {
  id: string
  date: string
  state: 'pre' | 'in' | 'post'
  completed: boolean
  statusDetail: string
  shortDetail: string
  clock?: string
  period?: number
  broadcasts: string[]
  home: FinalsSide
  away: FinalsSide
  seriesSummary?: string
  note?: string // "NBA Finals - Game 4"
}

export interface FinalsPlayer {
  id: string
  name: string
  jersey?: string
  pos?: string
  headshot: string
  teamId: string
}

export interface SeriesGame {
  game: number
  id?: string
  date?: string
  homeAbbr?: string
  awayAbbr?: string
  homeScore?: string
  awayScore?: string
  state: 'pre' | 'in' | 'post'
  winnerAbbr?: string
}

export interface FinalsData {
  game: FinalsGame
  home: FinalsTeam
  away: FinalsTeam
}

function teamFrom(c: any): FinalsTeam {
  const t = c.team ?? {}
  return {
    id: String(t.id ?? ''),
    name: t.displayName ?? t.name ?? '',
    short: t.shortDisplayName ?? t.name ?? '',
    abbr: t.abbreviation ?? '',
    color: t.color ?? '1d428a',
    alt: t.alternateColor ?? 'c4ced4',
    logo: t.logo ?? `https://a.espncdn.com/i/teamlogos/nba/500/${(t.abbreviation || '').toLowerCase()}.png`,
  }
}

function sideFrom(c: any): FinalsSide {
  return {
    teamId: String(c.team?.id ?? c.id ?? ''),
    score: c.score ?? '0',
    winner: !!c.winner,
    homeAway: c.homeAway === 'home' ? 'home' : 'away',
  }
}

/** The live Finals game + both teams. Finds the NBA Finals game on today's
 *  board; falls back to the first game if the note isn't present yet. */
export async function fetchFinals(): Promise<FinalsData | null> {
  const res = await fetch(`${SITE}/scoreboard`)
  if (!res.ok) return null
  const data = await res.json()
  const events: any[] = Array.isArray(data?.events) ? data.events : []
  if (events.length === 0) return null

  // Prefer the event whose competition note mentions the Finals.
  const ev =
    events.find((e) => {
      const notes = e.competitions?.[0]?.notes ?? []
      return notes.some((n: any) => /final/i.test(n.headline || ''))
    }) ?? events[0]

  const comp = ev.competitions?.[0] ?? {}
  const competitors: any[] = comp.competitors ?? []
  const homeC = competitors.find((c) => c.homeAway === 'home') ?? competitors[0]
  const awayC = competitors.find((c) => c.homeAway === 'away') ?? competitors[1]
  if (!homeC || !awayC) return null

  const game: FinalsGame = {
    id: String(ev.id),
    date: ev.date,
    state: (ev.status?.type?.state ?? 'pre') as FinalsGame['state'],
    completed: !!ev.status?.type?.completed,
    statusDetail: ev.status?.type?.detail ?? '',
    shortDetail: ev.status?.type?.shortDetail ?? '',
    clock: ev.status?.displayClock,
    period: ev.status?.period,
    broadcasts: (comp.broadcasts ?? []).flatMap((b: any) => b.names ?? []),
    home: sideFrom(homeC),
    away: sideFrom(awayC),
    seriesSummary: comp.series?.summary,
    note: comp.notes?.[0]?.headline,
  }

  return { game, home: teamFrom(homeC), away: teamFrom(awayC) }
}

/** Star-player headshot cutouts for both teams (transparent PNGs). Returns up
 *  to `perTeam` players that actually have a headshot. */
export async function fetchFinalsRosters(homeId: string, awayId: string, perTeam = 6): Promise<{ home: FinalsPlayer[]; away: FinalsPlayer[] }> {
  const load = async (teamId: string): Promise<FinalsPlayer[]> => {
    try {
      const r = await fetch(`${SITE}/teams/${teamId}/roster`)
      if (!r.ok) return []
      const d = await r.json()
      const athletes: any[] = d.athletes ?? []
      return athletes
        .map((a: any): FinalsPlayer => ({
          id: String(a.id ?? ''),
          name: a.fullName ?? a.displayName ?? '',
          jersey: a.jersey,
          pos: a.position?.abbreviation,
          headshot: a.headshot?.href ?? `https://a.espncdn.com/i/headshots/nba/players/full/${a.id}.png`,
          teamId,
        }))
        .filter((p) => p.id && p.headshot)
        .slice(0, perTeam)
    } catch {
      return []
    }
  }
  const [home, away] = await Promise.all([load(homeId), load(awayId)])
  return { home, away }
}

/** Series bracket — every game of the Finals so far + tonight. From the game
 *  summary's seasonseries. */
export async function fetchSeries(gameId: string): Promise<SeriesGame[]> {
  try {
    const r = await fetch(`${SITE}/summary?event=${encodeURIComponent(gameId)}`)
    if (!r.ok) return []
    const d = await r.json()
    const series = d.seasonseries?.[0]?.events ?? d.series?.[0]?.competitions ?? []
    return series.map((e: any, i: number): SeriesGame => {
      const comp = e.competitions?.[0] ?? e
      const comps: any[] = comp.competitors ?? e.competitors ?? []
      const home = comps.find((c) => c.homeAway === 'home') ?? comps[0] ?? {}
      const away = comps.find((c) => c.homeAway === 'away') ?? comps[1] ?? {}
      const state = (e.status?.type?.state ?? comp.status?.type?.state ?? 'pre') as SeriesGame['state']
      const winner = comps.find((c) => c.winner)
      return {
        game: i + 1,
        id: String(e.id ?? comp.id ?? ''),
        date: e.date ?? comp.date,
        homeAbbr: home.team?.abbreviation,
        awayAbbr: away.team?.abbreviation,
        homeScore: home.score?.displayValue ?? home.score,
        awayScore: away.score?.displayValue ?? away.score,
        state,
        winnerAbbr: winner?.team?.abbreviation,
      }
    })
  } catch {
    return []
  }
}

/** YYYY format the ESPN headshot cutout url for any nba athlete id. */
export function nbaHeadshot(id: string | number): string {
  return `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`
}

export interface PlayerStatLine {
  season: string
  headline: { pts: string; reb: string; ast: string }
  line: { label: string; value: string }[]
}

/** Current-season averages for a player (PPG/RPG/APG + splits), mapped by label
 *  so it survives ESPN reordering. Returns null if unavailable. */
export async function fetchPlayerStats(id: string): Promise<PlayerStatLine | null> {
  try {
    const r = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/stats`)
    if (!r.ok) return null
    const d = await r.json()
    const cat = (d.categories || []).find((c: any) => c.name === 'averages')
    const labels: string[] = cat?.labels || []
    const entries: any[] = cat?.statistics || []
    if (!labels.length || !entries.length) return null
    const latest = entries.reduce((a: any, b: any) => ((b.season?.year ?? 0) >= (a.season?.year ?? 0) ? b : a), entries[entries.length - 1])
    const stats: string[] = latest.stats || []
    const get = (lbl: string) => { const i = labels.indexOf(lbl); return i >= 0 ? String(stats[i] ?? '') : '' }
    const want = ['PTS', 'REB', 'AST', 'MIN', 'FG%', '3P%', 'FT%', 'STL', 'BLK', 'GP']
    const line = want.map((l) => ({ label: l, value: get(l) })).filter((s) => s.value && s.value !== '0.0')
    return { season: latest.season?.displayName || '', headline: { pts: get('PTS') || '—', reb: get('REB') || '—', ast: get('AST') || '—' }, line }
  } catch {
    return null
  }
}
