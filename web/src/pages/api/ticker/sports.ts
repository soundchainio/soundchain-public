/**
 * GET /api/ticker/sports — live scores from MLB, NHL, NBA + NFL (draft or games)
 *
 * Uses ESPN's public scoreboard API (free, no key needed).
 * NFL falls back from draft picks (during draft week) → regular games.
 * Cached 60s server-side.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 60_000

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

async function fetchLeague(sport: string, league: string) {
  try {
    const res = await fetch(`${ESPN_BASE}/${sport}/${league}/scoreboard`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.events || []).map((e: any) => {
      const comp = e.competitions?.[0]
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
      // Extract top scorers per team (ESPN provides leaders array)
      // Combine points + rebounds + assists leaders (ESPN returns 1 per category)
      // This gives us up to 3 unique players per team with their key stat
      const extractLeaders = (team: any) => {
        const seen = new Set<string>()
        const leaders: any[] = []
        for (const cat of ['points', 'rebounds', 'assists']) {
          const catLeaders = team?.leaders?.find((l: any) => l.name === cat)?.leaders || []
          for (const p of catLeaders) {
            const name = p.athlete?.shortName || p.athlete?.displayName
            if (name && !seen.has(name)) {
              seen.add(name)
              const statLabel = cat === 'points' ? 'pts' : cat === 'rebounds' ? 'reb' : 'ast'
              leaders.push({ name, points: `${p.displayValue || p.value} ${statLabel}` })
            }
            if (leaders.length >= 3) break
          }
          if (leaders.length >= 3) break
        }
        return leaders
      }
      const homeLeaders = extractLeaders(home)
      const awayLeaders = extractLeaders(away)

      // Series info (playoffs)
      const series = comp?.series?.summary || ''
      const seriesNote = comp?.notes?.[0]?.headline || ''

      return {
        id: e.id,
        name: e.shortName || e.name,
        league,
        series,
        seriesNote,
        status: comp?.status?.type?.shortDetail || comp?.status?.type?.description || 'Scheduled',
        state: comp?.status?.type?.state || 'pre', // pre, in, post
        home: {
          team: home?.team?.abbreviation || home?.team?.shortDisplayName || '?',
          score: home?.score || '0',
          logo: home?.team?.logo,
          topScorers: homeLeaders,
        },
        away: {
          team: away?.team?.abbreviation || away?.team?.shortDisplayName || '?',
          score: away?.score || '0',
          logo: away?.team?.logo,
          topScorers: awayLeaders,
        },
      }
    })
  } catch { return [] }
}

async function fetchNFLDraft() {
  // Try ESPN's draft endpoint first — returns picks during/after draft.
  // Shape varies; defensive parse across common payloads.
  try {
    const res = await fetch(`${ESPN_BASE}/football/nfl/draft`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const rawPicks: any[] =
      data.picks ||
      data.draft?.picks ||
      (Array.isArray(data.rounds) ? data.rounds.flatMap((r: any) => r.picks || []) : []) ||
      []

    return rawPicks
      .filter((p: any) => p && (p.athlete || p.player || p.overall || p.pick))
      .slice(0, 64)
      .map((p: any, i: number) => {
        const overall = p.overall || p.pick || p.selection || i + 1
        const round = p.round || p.roundNumber || Math.ceil(overall / 32)
        const team = p.team?.abbreviation || p.team?.displayName || p.team?.name || '?'
        const player = p.athlete?.displayName || p.athlete?.fullName || p.player?.displayName || p.player?.name || 'TBD'
        const position = p.athlete?.position?.abbreviation || p.position?.abbreviation || p.position || ''
        const college = p.athlete?.college?.name || p.athlete?.school?.name || p.college?.name || p.college || ''
        const complete = p.status?.type === 'complete' || p.status === 'complete' || !!player && player !== 'TBD'
        return {
          id: String(p.id || `pick-${overall}`),
          kind: 'pick' as const,
          pickNumber: overall,
          round,
          team,
          player,
          position,
          college,
          state: complete ? 'post' : 'pre',
        }
      })
  } catch { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  const [mlb, nhl, nba, nflDraft, nflGames] = await Promise.all([
    fetchLeague('baseball', 'mlb'),
    fetchLeague('hockey', 'nhl'),
    fetchLeague('basketball', 'nba'),
    fetchNFLDraft(),
    fetchLeague('football', 'nfl'),
  ])

  // NFL row prefers draft picks (draft week) → regular games (season).
  const nfl = nflDraft.length > 0 ? nflDraft : nflGames
  const nflMode = nflDraft.length > 0 ? 'draft' : 'games'

  const result = { mlb, nhl, nba, nfl, nflMode, fetchedAt: new Date().toISOString() }
  cache = { data: result, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  return res.status(200).json(result)
}
