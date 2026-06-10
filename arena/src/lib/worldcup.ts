/**
 * FIFA World Cup 2026 tournament data layer.
 *
 * Wraps ESPN's CORS-open `soccer/fifa.world` endpoints (no API key) into
 * tournament-shaped models the dash renders: 12 groups (A–L) with soccer
 * standings (P/W/D/L/GF/GA/GD/Pts), the full 104-match schedule with round
 * detection, and the knockout bracket derived from that schedule.
 *
 * 2026 is the first 48-team World Cup: 12 groups of 4 → top 2 of each group +
 * the 8 best third-placed teams = 32 into a Round-of-32 knockout. Hosted across
 * the USA / Canada / Mexico, June 11 – July 19, 2026.
 *
 * All functions are client-callable (plain fetch) — the dash fetches in the
 * browser and auto-refreshes, same pattern as the team pages.
 */

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const WEB = 'https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world'

// ─── Types ────────────────────────────────────────────────────────────────

export interface WCTeamRef {
  id: string
  name: string
  abbr: string
  flag?: string
  color?: string
}

export interface WCStandingRow {
  rank: number
  team: WCTeamRef
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
  points: number
}

export interface WCGroup {
  letter: string // "A"
  name: string // "Group A"
  rows: WCStandingRow[]
}

export interface WCMatch {
  id: string
  date: string // ISO
  state: 'pre' | 'in' | 'post'
  completed: boolean
  statusDetail: string // "Final" / "45'" / "Thu, June 11th at 3:00 PM EDT"
  clock?: string
  home: WCMatchSide
  away: WCMatchSide
  venue?: string
  city?: string
  broadcasts: string[]
  round: WCRound
  roundOrder: number
}

export interface WCMatchSide {
  id: string
  name: string
  abbr: string
  flag?: string
  color?: string
  score?: string
  winner?: boolean
  isPlaceholder: boolean // true when ESPN has no real team yet (knockout TBD slot)
}

export type WCRound =
  | 'Group Stage'
  | 'Round of 32'
  | 'Round of 16'
  | 'Quarterfinal'
  | 'Semifinal'
  | 'Third Place'
  | 'Final'

// ─── Tournament calendar (2026) ─────────────────────────────────────────────

export const WC_KICKOFF_ISO = '2026-06-11T19:00Z' // first match: RSA @ MEX, 3pm EDT
export const WC_FINAL_ISO = '2026-07-19T19:00Z'

interface Phase {
  round: WCRound
  order: number
  start: string // YYYY-MM-DD inclusive
  end: string // YYYY-MM-DD inclusive
}

// Official 2026 phase windows. Round detection prefers an ESPN note headline
// when present (knockout matches carry one) and falls back to these date bands.
const PHASES: Phase[] = [
  { round: 'Group Stage', order: 0, start: '2026-06-11', end: '2026-06-27' },
  { round: 'Round of 32', order: 1, start: '2026-06-28', end: '2026-07-03' },
  { round: 'Round of 16', order: 2, start: '2026-07-04', end: '2026-07-07' },
  { round: 'Quarterfinal', order: 3, start: '2026-07-09', end: '2026-07-11' },
  { round: 'Semifinal', order: 4, start: '2026-07-14', end: '2026-07-15' },
  { round: 'Third Place', order: 5, start: '2026-07-18', end: '2026-07-18' },
  { round: 'Final', order: 6, start: '2026-07-19', end: '2026-07-19' },
]

export const WC_ROUND_ORDER: WCRound[] = [
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarterfinal',
  'Semifinal',
  'Third Place',
  'Final',
]

function roundFromNote(headline?: string): WCRound | null {
  if (!headline) return null
  const h = headline.toLowerCase()
  if (h.includes('round of 32')) return 'Round of 32'
  if (h.includes('round of 16')) return 'Round of 16'
  if (h.includes('quarter')) return 'Quarterfinal'
  if (h.includes('semi')) return 'Semifinal'
  if (h.includes('third') || h.includes('3rd')) return 'Third Place'
  if (h.includes('final')) return 'Final'
  if (h.includes('group')) return 'Group Stage'
  return null
}

function roundFromDate(iso: string): { round: WCRound; order: number } {
  const ymd = iso.slice(0, 10)
  for (const p of PHASES) {
    if (ymd >= p.start && ymd <= p.end) return { round: p.round, order: p.order }
  }
  // Anything before the windows = group stage; after = final.
  if (ymd < '2026-06-28') return { round: 'Group Stage', order: 0 }
  return { round: 'Final', order: 6 }
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────

function statN(stats: any[] | undefined, type: string): number {
  const s = stats?.find((x) => x.type === type || x.name === type)
  if (!s) return 0
  const v = typeof s.value === 'number' ? s.value : Number(s.value)
  return isFinite(v) ? v : 0
}

/** 12 groups (A–L), each with soccer standings sorted by rank. */
export async function fetchWorldCupGroups(): Promise<WCGroup[]> {
  const res = await fetch(`${WEB}/standings`)
  if (!res.ok) throw new Error(`WC standings ${res.status}`)
  const data = await res.json()
  const children: any[] = Array.isArray(data?.children) ? data.children : []

  return children.map((g: any): WCGroup => {
    const name: string = g?.name ?? g?.shortName ?? 'Group'
    const letter = name.replace(/group\s*/i, '').trim() || name
    const entries: any[] = g?.standings?.entries ?? []
    const rows = entries.map((e: any): WCStandingRow => {
      const stats = e.stats
      return {
        rank: statN(stats, 'rank') || 0,
        team: {
          id: String(e.team?.id ?? ''),
          name: e.team?.displayName ?? e.team?.name ?? '',
          abbr: e.team?.abbreviation ?? '',
          flag: e.team?.logos?.[0]?.href ?? e.team?.logo,
          color: e.team?.color,
        },
        played: statN(stats, 'gamesplayed'),
        wins: statN(stats, 'wins'),
        draws: statN(stats, 'ties'),
        losses: statN(stats, 'losses'),
        gf: statN(stats, 'pointsfor'),
        ga: statN(stats, 'pointsagainst'),
        gd: statN(stats, 'pointdifferential'),
        points: statN(stats, 'points'),
      }
    })
    rows.sort((a, b) => a.rank - b.rank || b.points - a.points || b.gd - a.gd)
    return { letter, name, rows }
  })
}

/** Every match in the tournament window, with round detection. */
export async function fetchWorldCupSchedule(): Promise<WCMatch[]> {
  const res = await fetch(`${SITE}/scoreboard?dates=20260611-20260720`)
  if (!res.ok) throw new Error(`WC scoreboard ${res.status}`)
  const data = await res.json()
  const events: any[] = Array.isArray(data?.events) ? data.events : []

  const matches = events.map((ev: any): WCMatch => {
    const comp = ev.competitions?.[0] ?? {}
    const note = comp.notes?.[0]?.headline as string | undefined
    const byNote = roundFromNote(note)
    const byDate = roundFromDate(ev.date ?? '')
    const round = byNote ?? byDate.round
    const roundOrder = byNote ? WC_ROUND_ORDER.indexOf(byNote) : byDate.order

    const side = (ha: 'home' | 'away'): WCMatchSide => {
      const c = (comp.competitors ?? []).find((x: any) => x.homeAway === ha) ?? {}
      const name = c.team?.displayName ?? c.team?.name ?? ''
      // ESPN seeds knockout slots with placeholder "teams" (e.g. "Winner Group A")
      // — no real id/flag. Mark them so the UI can show a TBD chip.
      const isPlaceholder = !c.team?.id || !c.team?.logos?.length
      return {
        id: String(c.team?.id ?? c.id ?? ''),
        name,
        abbr: c.team?.abbreviation ?? '',
        flag: c.team?.logos?.[0]?.href ?? c.team?.logo,
        color: c.team?.color,
        score: c.score,
        winner: !!c.winner,
        isPlaceholder,
      }
    }

    return {
      id: String(ev.id),
      date: ev.date ?? '',
      state: (ev.status?.type?.state ?? 'pre') as WCMatch['state'],
      completed: !!ev.status?.type?.completed,
      statusDetail: ev.status?.type?.detail ?? ev.status?.type?.shortDetail ?? ev.status?.type?.description ?? '',
      clock: ev.status?.displayClock,
      home: side('home'),
      away: side('away'),
      venue: comp.venue?.fullName,
      city: comp.venue?.address ? [comp.venue.address.city, comp.venue.address.country].filter(Boolean).join(', ') : undefined,
      broadcasts: (comp.broadcasts ?? []).flatMap((b: any) => b.names ?? []),
      round,
      roundOrder,
    }
  })

  matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return matches
}

/** Group matches by local calendar date (for the schedule tab). */
export function groupMatchesByDate(matches: WCMatch[]): { date: string; label: string; matches: WCMatch[] }[] {
  const map = new Map<string, WCMatch[]>()
  for (const m of matches) {
    const d = new Date(m.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ms]) => ({
      date,
      label: new Date(ms[0].date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      matches: ms,
    }))
}

// ─── Golden Boot (top scorers + assists) ─────────────────────────────────────

export interface WCScorer {
  rank: number
  athleteId: string
  name: string
  flag?: string // country flag
  headshot?: string
  position?: string
  teamId?: string // → /worldcup/team/[teamId]
  value: number // cumulative goals (or assists)
}

/** Golden Boot race — cumulative goals + assists across all stages. Resolved
 *  server-side via /api/worldcup/scorers (core API + ref resolution). Empty
 *  until the first goals are scored. */
export async function fetchWorldCupScorers(): Promise<{ goals: WCScorer[]; assists: WCScorer[] }> {
  try {
    const r = await fetch('/api/worldcup/scorers')
    if (!r.ok) return { goals: [], assists: [] }
    const d = await r.json()
    return { goals: d.goals ?? [], assists: d.assists ?? [] }
  } catch {
    return { goals: [], assists: [] }
  }
}

// ─── Host cities (static — the 16 venues of WC 2026) ────────────────────────

export interface WCHost {
  city: string
  country: 'USA' | 'Canada' | 'Mexico'
  venue: string
  flag: string
}

export const WC_HOSTS: WCHost[] = [
  { city: 'Atlanta', country: 'USA', venue: 'Mercedes-Benz Stadium', flag: '🇺🇸' },
  { city: 'Boston', country: 'USA', venue: 'Gillette Stadium', flag: '🇺🇸' },
  { city: 'Dallas', country: 'USA', venue: 'AT&T Stadium', flag: '🇺🇸' },
  { city: 'Houston', country: 'USA', venue: 'NRG Stadium', flag: '🇺🇸' },
  { city: 'Kansas City', country: 'USA', venue: 'Arrowhead Stadium', flag: '🇺🇸' },
  { city: 'Los Angeles', country: 'USA', venue: 'SoFi Stadium', flag: '🇺🇸' },
  { city: 'Miami', country: 'USA', venue: 'Hard Rock Stadium', flag: '🇺🇸' },
  { city: 'New York / NJ', country: 'USA', venue: 'MetLife Stadium', flag: '🇺🇸' },
  { city: 'Philadelphia', country: 'USA', venue: 'Lincoln Financial Field', flag: '🇺🇸' },
  { city: 'San Francisco', country: 'USA', venue: "Levi's Stadium", flag: '🇺🇸' },
  { city: 'Seattle', country: 'USA', venue: 'Lumen Field', flag: '🇺🇸' },
  { city: 'Toronto', country: 'Canada', venue: 'BMO Field', flag: '🇨🇦' },
  { city: 'Vancouver', country: 'Canada', venue: 'BC Place', flag: '🇨🇦' },
  { city: 'Guadalajara', country: 'Mexico', venue: 'Estadio Akron', flag: '🇲🇽' },
  { city: 'Mexico City', country: 'Mexico', venue: 'Estadio Azteca', flag: '🇲🇽' },
  { city: 'Monterrey', country: 'Mexico', venue: 'Estadio BBVA', flag: '🇲🇽' },
]
