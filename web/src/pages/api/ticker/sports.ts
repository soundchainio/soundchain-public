/**
 * GET /api/ticker/sports — live scores from MLB, NHL, NBA
 *
 * Uses ESPN's public scoreboard API (free, no key needed).
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  const [mlb, nhl, nba] = await Promise.all([
    fetchLeague('baseball', 'mlb'),
    fetchLeague('hockey', 'nhl'),
    fetchLeague('basketball', 'nba'),
  ])

  const result = { mlb, nhl, nba, fetchedAt: new Date().toISOString() }
  cache = { data: result, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  return res.status(200).json(result)
}
