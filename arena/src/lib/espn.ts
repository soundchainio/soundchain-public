/**
 * ESPN public scoreboard + standings client.
 *
 * No API key required. Endpoints are the same site.api.espn.com routes that
 * power espn.com itself. Free, but undocumented — schemas can shift without
 * notice. Defensive parsing throughout.
 */

export type EspnGameStatusState = 'pre' | 'in' | 'post'

export interface EspnGame {
  id: string
  date: string                   // ISO datetime of scheduled start
  shortName: string              // "BOS @ NYK"
  status: {
    state: EspnGameStatusState
    completed: boolean
    description: string          // "Q3 6:42" / "Final" / "Scheduled"
    period?: number
    clock?: string
    detail?: string
  }
  competitors: {
    id: string
    abbr: string                 // "BOS"
    displayName: string          // "Boston Celtics"
    shortDisplayName?: string    // "Celtics"
    logo?: string
    score: string                // ESPN returns string scores
    homeAway: 'home' | 'away'
    record?: string              // "52-30"
    color?: string               // hex w/o #
  }[]
  venue?: string
  broadcasts?: string[]          // ["ABC", "ESPN"]
  seriesSummary?: string         // playoff series state e.g. "Series tied 2-2"
}

export interface EspnStandingEntry {
  team: {
    id: string
    abbr: string
    displayName: string
    logo?: string
    color?: string
  }
  wins: number
  losses: number
  otLosses?: number              // NHL OT losses
  winPct: number
  gamesBack?: string
  conferenceRank?: number
  divisionRank?: number
  streak?: string
}

export interface EspnStandingsGroup {
  name: string                   // "Eastern Conference"
  entries: EspnStandingEntry[]
}

const SPORT_PATHS = {
  nba: 'basketball/nba',
  wnba: 'basketball/wnba',
  ncaaMens: 'basketball/mens-college-basketball',
  nhl: 'hockey/nhl',
  mlb: 'baseball/mlb',
  nfl: 'football/nfl',
  ncaaFootball: 'football/college-football',
  mma: 'mma/ufc',
  soccerEpl: 'soccer/eng.1',
  soccerMls: 'soccer/usa.1',
} as const

export type SportKey = keyof typeof SPORT_PATHS

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

function statValue(stats: any[] | undefined, name: string): number {
  const s = stats?.find((x) => x.name === name || x.type === name)
  if (!s) return 0
  const v = typeof s.value === 'number' ? s.value : Number(s.value)
  return isFinite(v) ? v : 0
}

function statString(stats: any[] | undefined, name: string): string {
  const s = stats?.find((x) => x.name === name || x.type === name)
  if (!s) return ''
  return s.displayValue ?? String(s.value ?? '')
}

/** Today's scoreboard (or a specific date YYYYMMDD).
 *  seasontype: 1=preseason, 2=regular, 3=playoffs */
export async function fetchScoreboard(
  sport: SportKey,
  opts: { date?: string; seasonType?: 1 | 2 | 3 } = {}
): Promise<EspnGame[]> {
  const params = new URLSearchParams()
  if (opts.date) params.set('dates', opts.date)
  if (opts.seasonType) params.set('seasontype', String(opts.seasonType))

  const url = `${ESPN_BASE}/${SPORT_PATHS[sport]}/scoreboard${
    params.toString() ? `?${params.toString()}` : ''
  }`

  const res = await fetch(url, { next: { revalidate: 60 } as any })
  if (!res.ok) throw new Error(`ESPN ${sport} scoreboard ${res.status}`)
  const data = await res.json()
  const events = Array.isArray(data?.events) ? data.events : []

  return events.map((ev: any): EspnGame => {
    const comp = ev.competitions?.[0] ?? {}
    const competitors = (comp.competitors ?? []).map((c: any) => ({
      id: c.id,
      abbr: c.team?.abbreviation ?? '',
      displayName: c.team?.displayName ?? '',
      shortDisplayName: c.team?.shortDisplayName,
      logo: c.team?.logo,
      score: c.score ?? '0',
      homeAway: c.homeAway === 'home' ? 'home' : 'away',
      record: c.records?.[0]?.summary,
      color: c.team?.color,
    }))

    return {
      id: ev.id,
      date: ev.date,
      shortName: ev.shortName ?? '',
      status: {
        state: (ev.status?.type?.state ?? 'pre') as EspnGameStatusState,
        completed: !!ev.status?.type?.completed,
        description: ev.status?.type?.detail ?? ev.status?.type?.description ?? '',
        period: ev.status?.period,
        clock: ev.status?.displayClock,
        detail: ev.status?.type?.shortDetail,
      },
      competitors,
      venue: comp.venue?.fullName,
      broadcasts: (comp.broadcasts ?? []).flatMap((b: any) => b.names ?? []),
      seriesSummary: comp.series?.summary,
    }
  })
}

export async function fetchStandings(sport: SportKey): Promise<EspnStandingsGroup[]> {
  // Try the v3 endpoint first (richer); fall back to v2 if it 404s
  const v3url = `https://site.web.api.espn.com/apis/v2/sports/${SPORT_PATHS[sport]}/standings`
  let data: any
  try {
    const r = await fetch(v3url, { next: { revalidate: 300 } as any })
    if (r.ok) data = await r.json()
  } catch (_) { /* fallthrough */ }

  if (!data) {
    const v2url = `${ESPN_BASE}/${SPORT_PATHS[sport]}/standings`
    const r = await fetch(v2url, { next: { revalidate: 300 } as any })
    if (!r.ok) throw new Error(`ESPN ${sport} standings ${r.status}`)
    data = await r.json()
  }

  // Shapes vary across sports — coalesce
  const children = Array.isArray(data?.children)
    ? data.children
    : data?.standings
      ? [{ name: 'Standings', standings: data.standings }]
      : []

  return children.map((group: any): EspnStandingsGroup => {
    const entries = group?.standings?.entries ?? []
    return {
      name: group?.name ?? group?.shortName ?? 'Standings',
      entries: entries.map((e: any): EspnStandingEntry => {
        const stats = e.stats
        return {
          team: {
            id: e.team?.id ?? '',
            abbr: e.team?.abbreviation ?? '',
            displayName: e.team?.displayName ?? e.team?.name ?? '',
            logo: e.team?.logos?.[0]?.href ?? e.team?.logo,
            color: e.team?.color,
          },
          wins: statValue(stats, 'wins'),
          losses: statValue(stats, 'losses'),
          otLosses: statValue(stats, 'otlosses') || statValue(stats, 'otLosses') || undefined,
          winPct: statValue(stats, 'winPercent') || statValue(stats, 'winpercent'),
          gamesBack: statString(stats, 'gamesBehind') || statString(stats, 'gb') || undefined,
          conferenceRank: statValue(stats, 'playoffSeed') || undefined,
          streak: statString(stats, 'streak') || undefined,
        }
      }),
    }
  })
}

/** YYYYMMDD for today in user's local time (good enough — ESPN buckets by date) */
export function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
