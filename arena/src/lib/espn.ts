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

// ─── Player headshots + stat leaders ──────────────────────────────────────

export interface EspnAthleteRef {
  id: string
  fullName: string
  shortName?: string
  jersey?: string
  position?: string                 // "PG" / "C" / "1B" / "QB"
  headshotUrl?: string              // ESPN CDN
  team?: { id: string; abbr: string; logo?: string; color?: string }
}

export interface EspnLeaderCategory {
  name: string                      // "points" | "rebounds" | ...
  displayName: string               // "Points" | "Rebounds Per Game"
  abbreviation: string              // "PTS" | "REB"
  leaders: { athlete: EspnAthleteRef; value: number; displayValue: string }[]
}

/** Stable CDN pattern. Works across all major leagues ESPN covers. */
export function headshotUrl(league: SportKey | string, athleteId: string | number): string {
  const slug = LEAGUE_HEADSHOT_SLUG[league as SportKey] ?? String(league)
  return `https://a.espncdn.com/i/headshots/${slug}/players/full/${athleteId}.png`
}

const LEAGUE_HEADSHOT_SLUG: Partial<Record<SportKey, string>> = {
  nba: 'nba',
  wnba: 'wnba',
  nhl: 'nhl',
  mlb: 'mlb',
  nfl: 'nfl',
  ncaaMens: 'mens-college-basketball',
  ncaaFootball: 'college-football',
  mma: 'mma',
  soccerEpl: 'soccer',
  soccerMls: 'soccer',
}

/** Per-sport stat leader categories we render. Order = render order. */
export const SPORT_LEADER_CATEGORIES: Partial<Record<SportKey, string[]>> = {
  nba: ['points', 'rebounds', 'assists'],
  wnba: ['points', 'rebounds', 'assists'],
  nhl: ['points', 'goals', 'assists'],
  mlb: ['battingAverage', 'homeRuns', 'RBIs'],
  nfl: ['passingYards', 'rushingYards', 'receivingYards'],
}

/** Season leaders. Returns the categories listed in SPORT_LEADER_CATEGORIES,
 *  in that order. Each category gets up to `topN` athletes (default 5). */
export async function fetchLeaders(
  sport: SportKey,
  opts: { topN?: number; seasonType?: 1 | 2 | 3 } = {}
): Promise<EspnLeaderCategory[]> {
  const wanted = new Set(SPORT_LEADER_CATEGORIES[sport] ?? [])
  if (wanted.size === 0) return []

  const params = new URLSearchParams()
  if (opts.seasonType) params.set('seasontype', String(opts.seasonType))
  const qs = params.toString() ? `?${params.toString()}` : ''
  const url = `${ESPN_BASE}/${SPORT_PATHS[sport]}/leaders${qs}`

  const res = await fetch(url, { next: { revalidate: 600 } as any })
  if (!res.ok) throw new Error(`ESPN ${sport} leaders ${res.status}`)
  const data = await res.json()

  // ESPN nests cats under `leaders` (top-level) or under `categories`.
  const rawCats: any[] = Array.isArray(data?.leaders)
    ? data.leaders
    : Array.isArray(data?.categories)
      ? data.categories
      : []

  const topN = opts.topN ?? 5
  const orderedNames = SPORT_LEADER_CATEGORIES[sport] ?? []

  const byName = new Map<string, any>()
  for (const c of rawCats) {
    const key = c?.name ?? c?.shortDisplayName ?? c?.abbreviation
    if (key) byName.set(key, c)
  }

  return orderedNames
    .map((name) => byName.get(name))
    .filter(Boolean)
    .map((c: any): EspnLeaderCategory => {
      const leaders = (c.leaders ?? []).slice(0, topN).map((l: any) => {
        const a = l.athlete ?? l.Athlete ?? {}
        const team = a.team ?? l.team
        const athleteId = String(a.id ?? '')
        return {
          athlete: {
            id: athleteId,
            fullName: a.fullName ?? a.displayName ?? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(),
            shortName: a.shortName,
            jersey: a.jersey,
            position: a.position?.abbreviation ?? a.position,
            headshotUrl: athleteId ? headshotUrl(sport, athleteId) : undefined,
            team: team
              ? {
                  id: String(team.id ?? ''),
                  abbr: team.abbreviation ?? '',
                  logo: team.logos?.[0]?.href ?? team.logo,
                  color: team.color,
                }
              : undefined,
          },
          value: typeof l.value === 'number' ? l.value : Number(l.value) || 0,
          displayValue: l.displayValue ?? String(l.value ?? ''),
        }
      })
      return {
        name: c.name ?? c.shortDisplayName ?? '',
        displayName: c.displayName ?? c.shortDisplayName ?? c.name ?? '',
        abbreviation: c.abbreviation ?? c.shortDisplayName ?? c.name ?? '',
        leaders,
      }
    })
}

// ─── Per-game summary (box score, leaders, plays, recap) ─────────────────

export interface EspnTeamStat {
  label: string                     // "FG" / "REB" / "AST"
  displayName: string               // "Field Goals"
  displayValue: string              // "37-89"
}

export interface EspnBoxscoreTeam {
  team: { id: string; abbr: string; displayName: string; logo?: string; color?: string }
  homeAway: 'home' | 'away'
  stats: EspnTeamStat[]
}

export interface EspnLineScore {
  period: number                    // 1, 2, 3, 4 (or inning #)
  label: string                     // "Q1" / "1st" / "1"
  away: string
  home: string
}

export interface EspnGameLeaderRow {
  category: string                  // "points"
  categoryDisplay: string           // "Points"
  abbr: string                      // "PTS"
  away?: { athlete: EspnAthleteRef; value: number; displayValue: string }
  home?: { athlete: EspnAthleteRef; value: number; displayValue: string }
}

export interface EspnScoringPlay {
  id: string
  text: string
  period: number
  clock?: string
  teamAbbr?: string
  teamColor?: string
  scoreValue?: number
  awayScore?: number
  homeScore?: number
}

export interface EspnBoxscorePlayer {
  athlete: EspnAthleteRef
  starter: boolean
  didNotPlay: boolean
  reason?: string
  stats: string[]                   // parallel to category labels
}

export interface EspnBoxscoreCategory {
  name: string                      // "team" / "passing" / "rushing" / "batting" / "pitching"
  displayName: string
  labels: string[]                  // ["MIN","PTS","REB",...] — column headers
  awayTeam: { abbr: string; displayName: string; logo?: string; color?: string }
  homeTeam: { abbr: string; displayName: string; logo?: string; color?: string }
  awayPlayers: EspnBoxscorePlayer[]
  homePlayers: EspnBoxscorePlayer[]
}

export interface EspnGameSummary {
  game: EspnGame
  linescores: EspnLineScore[]
  boxscoreTeams: EspnBoxscoreTeam[]
  boxscorePlayers: EspnBoxscoreCategory[]
  leaders: EspnGameLeaderRow[]
  scoringPlays: EspnScoringPlay[]
  article?: { headline: string; description: string }
}

function periodLabel(sport: SportKey, n: number): string {
  if (sport === 'mlb') return `${n}`
  if (sport === 'nhl') return `P${n}`
  if (sport === 'nfl' || sport === 'ncaaFootball') return `Q${n}`
  return `Q${n}`
}

/** Per-game summary: boxscore + leaders + scoring plays + recap.
 *  No API key required. Refreshes ESPN's `summary` endpoint. */
export async function fetchGameSummary(sport: SportKey, eventId: string): Promise<EspnGameSummary> {
  const url = `${ESPN_BASE}/${SPORT_PATHS[sport]}/summary?event=${encodeURIComponent(eventId)}`
  const res = await fetch(url, { next: { revalidate: 30 } as any })
  if (!res.ok) throw new Error(`ESPN ${sport} summary ${res.status}`)
  const data = await res.json()

  // ── Header → game ──
  const header = data?.header ?? {}
  const comp = header.competitions?.[0] ?? {}
  const competitors = (comp.competitors ?? []).map((c: any) => ({
    id: String(c.id ?? c.team?.id ?? ''),
    abbr: c.team?.abbreviation ?? '',
    displayName: c.team?.displayName ?? c.team?.name ?? '',
    shortDisplayName: c.team?.shortDisplayName,
    logo: c.team?.logos?.[0]?.href ?? c.team?.logo,
    score: c.score ?? '0',
    homeAway: c.homeAway === 'home' ? 'home' : 'away',
    record: c.records?.[0]?.summary,
    color: c.team?.color,
  }))

  const game: EspnGame = {
    id: String(header.id ?? eventId),
    date: comp.date ?? header.timeStamp ?? '',
    shortName: header.shortName ?? '',
    status: {
      state: (comp.status?.type?.state ?? 'pre') as EspnGameStatusState,
      completed: !!comp.status?.type?.completed,
      description: comp.status?.type?.detail ?? comp.status?.type?.description ?? '',
      period: comp.status?.period,
      clock: comp.status?.displayClock,
      detail: comp.status?.type?.shortDetail,
    },
    competitors,
    venue: comp.venue?.fullName,
    broadcasts: (comp.broadcasts ?? []).flatMap((b: any) => b.names ?? b.media?.shortName ?? []),
    seriesSummary: comp.series?.summary,
  }

  const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away')
  const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home')

  // ── Linescores (Q1/Q2/Q3/Q4 or innings) ──
  const linescores: EspnLineScore[] = []
  const awayLine = awayComp?.linescores ?? []
  const homeLine = homeComp?.linescores ?? []
  const periods = Math.max(awayLine.length, homeLine.length)
  for (let i = 0; i < periods; i++) {
    linescores.push({
      period: i + 1,
      label: awayLine[i]?.displayValue ? periodLabel(sport, i + 1) : periodLabel(sport, i + 1),
      away: String(awayLine[i]?.displayValue ?? awayLine[i]?.value ?? '-'),
      home: String(homeLine[i]?.displayValue ?? homeLine[i]?.value ?? '-'),
    })
  }

  // ── Boxscore teams ──
  const boxscoreTeams: EspnBoxscoreTeam[] = (data?.boxscore?.teams ?? []).map((bt: any): EspnBoxscoreTeam => {
    const stats: EspnTeamStat[] = (bt.statistics ?? []).map((s: any) => ({
      label: s.label ?? s.abbreviation ?? s.name ?? '',
      displayName: s.displayName ?? s.label ?? s.name ?? '',
      displayValue: s.displayValue ?? String(s.value ?? ''),
    }))
    return {
      team: {
        id: String(bt.team?.id ?? ''),
        abbr: bt.team?.abbreviation ?? '',
        displayName: bt.team?.displayName ?? bt.team?.name ?? '',
        logo: bt.team?.logos?.[0]?.href ?? bt.team?.logo,
        color: bt.team?.color,
      },
      homeAway: bt.homeAway === 'home' ? 'home' : 'away',
      stats,
    }
  })

  // ── Boxscore players (player-by-player stats, per category) ──
  const awayTeamId = String(awayComp?.team?.id ?? awayComp?.id ?? '')
  const homeTeamId = String(homeComp?.team?.id ?? homeComp?.id ?? '')
  const awayTeamMeta = {
    abbr: awayComp?.team?.abbreviation ?? '',
    displayName: awayComp?.team?.displayName ?? awayComp?.team?.name ?? '',
    logo: awayComp?.team?.logos?.[0]?.href ?? awayComp?.team?.logo,
    color: awayComp?.team?.color,
  }
  const homeTeamMeta = {
    abbr: homeComp?.team?.abbreviation ?? '',
    displayName: homeComp?.team?.displayName ?? homeComp?.team?.name ?? '',
    logo: homeComp?.team?.logos?.[0]?.href ?? homeComp?.team?.logo,
    color: homeComp?.team?.color,
  }

  const playerBlocks: any[] = Array.isArray(data?.boxscore?.players) ? data.boxscore.players : []
  const catMap = new Map<string, EspnBoxscoreCategory>()
  for (const block of playerBlocks) {
    const teamId = String(block.team?.id ?? '')
    const side: 'home' | 'away' | null = teamId === homeTeamId ? 'home' : teamId === awayTeamId ? 'away' : null
    if (!side) continue
    const blockCats: any[] = Array.isArray(block.statistics) ? block.statistics : []
    for (const cat of blockCats) {
      const catName = cat.name ?? cat.type ?? cat.displayName ?? 'stats'
      let entry = catMap.get(catName)
      if (!entry) {
        entry = {
          name: catName,
          displayName: cat.text ?? cat.displayName ?? catName,
          labels: Array.isArray(cat.labels) && cat.labels.length > 0
            ? cat.labels.map(String)
            : Array.isArray(cat.keys) ? cat.keys.map(String) : [],
          awayTeam: awayTeamMeta,
          homeTeam: homeTeamMeta,
          awayPlayers: [],
          homePlayers: [],
        }
        catMap.set(catName, entry)
      }
      const players: EspnBoxscorePlayer[] = (cat.athletes ?? []).map((row: any): EspnBoxscorePlayer => {
        const a = row.athlete ?? {}
        const athleteId = String(a.id ?? '')
        return {
          athlete: {
            id: athleteId,
            fullName: a.displayName ?? a.fullName ?? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(),
            shortName: a.shortName,
            jersey: a.jersey,
            position: a.position?.abbreviation ?? a.position,
            headshotUrl: a.headshot?.href ?? (athleteId ? headshotUrl(sport, athleteId) : undefined),
          },
          starter: !!row.starter,
          didNotPlay: !!row.didNotPlay,
          reason: row.reason,
          stats: Array.isArray(row.stats) ? row.stats.map((s: any) => s == null ? '' : String(s)) : [],
        }
      })
      if (side === 'home') entry.homePlayers = players
      else entry.awayPlayers = players
    }
  }
  const boxscorePlayers = Array.from(catMap.values())

  // ── Leaders (per-game, per-category, home + away side-by-side) ──
  const rawLeaderTeamBlocks: any[] = Array.isArray(data?.leaders) ? data.leaders : []
  const leaderMap = new Map<string, EspnGameLeaderRow>()
  for (const block of rawLeaderTeamBlocks) {
    const homeAway: 'home' | 'away' = block.homeAway === 'home' ? 'home' : 'away'
    const cats: any[] = block.leaders ?? []
    for (const cat of cats) {
      const key = cat.name ?? cat.shortDisplayName ?? cat.displayName
      if (!key) continue
      const top = (cat.leaders ?? [])[0]
      if (!top) continue
      const a = top.athlete ?? {}
      const athleteId = String(a.id ?? '')
      const team = a.team ?? block.team
      const athleteRef: EspnAthleteRef = {
        id: athleteId,
        fullName: a.fullName ?? a.displayName ?? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(),
        shortName: a.shortName,
        jersey: a.jersey,
        position: a.position?.abbreviation ?? a.position,
        headshotUrl: athleteId ? headshotUrl(sport, athleteId) : undefined,
        team: team
          ? {
              id: String(team.id ?? ''),
              abbr: team.abbreviation ?? '',
              logo: team.logos?.[0]?.href ?? team.logo,
              color: team.color,
            }
          : undefined,
      }
      const entry: EspnGameLeaderRow = leaderMap.get(key) ?? {
        category: key,
        categoryDisplay: cat.displayName ?? cat.shortDisplayName ?? key,
        abbr: cat.abbreviation ?? cat.shortDisplayName ?? key,
      }
      entry[homeAway] = {
        athlete: athleteRef,
        value: typeof top.value === 'number' ? top.value : Number(top.value) || 0,
        displayValue: top.displayValue ?? String(top.value ?? ''),
      }
      leaderMap.set(key, entry)
    }
  }
  const leaders = Array.from(leaderMap.values()).filter((l) => l.away || l.home)

  // ── Scoring plays (last 12, newest first) ──
  const rawPlays: any[] = Array.isArray(data?.scoringPlays) ? data.scoringPlays : []
  const scoringPlays: EspnScoringPlay[] = rawPlays
    .slice(-12)
    .reverse()
    .map((p: any): EspnScoringPlay => ({
      id: String(p.id ?? Math.random()),
      text: p.text ?? p.shortText ?? '',
      period: p.period?.number ?? p.period ?? 0,
      clock: p.clock?.displayValue,
      teamAbbr: p.team?.abbreviation,
      teamColor: p.team?.color,
      scoreValue: p.scoreValue ?? p.scoringType?.value,
      awayScore: p.awayScore,
      homeScore: p.homeScore,
    }))

  // ── Recap ──
  const article = data?.article
    ? {
        headline: data.article.headline ?? '',
        description: data.article.description ?? '',
      }
    : undefined

  return { game, linescores, boxscoreTeams, boxscorePlayers, leaders, scoringPlays, article }
}
