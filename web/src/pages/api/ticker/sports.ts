/**
 * GET /api/ticker/sports — live scores from MLB, NHL, NBA + NFL (games or news)
 *
 * Uses ESPN's public scoreboard + news APIs (free, no key needed).
 * NFL row: in-season games preferred, falls back to league news during offseason
 * (was draft picks during draft week — retired Apr 30 once draft concluded).
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

// ESPN team ID → abbreviation map (NFL, 32 teams). IDs are stable across ESPN's API surface.
// Used to derive logo URLs from news-article `categories[].team.id` references — the
// /news endpoint gives us team IDs but not abbreviations or logo URLs directly.
// Logo URL pattern: https://a.espncdn.com/i/teamlogos/nfl/500/{abbr.toLowerCase()}.png
const NFL_TEAM_BY_ID: Record<string, string> = {
  '1': 'ATL', '2': 'BUF', '3': 'CHI', '4': 'CIN', '5': 'CLE', '6': 'DAL',
  '7': 'DEN', '8': 'DET', '9': 'GB', '10': 'TEN', '11': 'IND', '12': 'KC',
  '13': 'LV', '14': 'LAR', '15': 'MIA', '16': 'MIN', '17': 'NE', '18': 'NO',
  '19': 'NYG', '20': 'NYJ', '21': 'PHI', '22': 'ARI', '23': 'PIT', '24': 'LAC',
  '25': 'SF', '26': 'SEA', '27': 'TB', '28': 'WSH', '29': 'CAR', '30': 'JAX',
  '33': 'BAL', '34': 'HOU',
}

function relativeAgo(publishedIso?: string): string {
  if (!publishedIso) return ''
  const ts = Date.parse(publishedIso)
  if (!ts) return ''
  const ageMin = Math.max(0, Math.floor((Date.now() - ts) / 60_000))
  if (ageMin < 1) return 'just now'
  if (ageMin < 60) return `${ageMin}m`
  if (ageMin < 1440) return `${Math.floor(ageMin / 60)}h`
  return `${Math.floor(ageMin / 1440)}d`
}

async function fetchNFLNews() {
  // ESPN's NFL news API — free, no key. Returns recent league-wide articles.
  // We surface headlines + the teams referenced in each article so the ticker can
  // render team logos inline (Frank's request: "make sure team logos render if
  // teams are written about in the ticker").
  try {
    const res = await fetch(`${ESPN_BASE}/football/nfl/news?limit=30`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const articles: any[] = data.articles || []

    return articles
      .map((a: any, i: number) => {
        const headline: string = (a.headline || a.title || '').trim()
        if (!headline) return null

        // Pull team references out of categories. ESPN's shape: categories is an
        // array of mixed types ({ type: 'team', team: {...} } | { type: 'athlete', ... }
        // | { type: 'league', ... }). Dedupe by abbr — same team can appear twice
        // when an article touches both the team and its athletes.
        const seen = new Set<string>()
        const teams: { abbr: string; logo: string }[] = []
        for (const cat of a.categories || []) {
          // Direct team category
          let abbr: string | undefined
          if (cat?.type === 'team' && cat?.team?.id) {
            abbr = NFL_TEAM_BY_ID[String(cat.team.id)]
          }
          // Athlete category often nests team info
          if (!abbr && cat?.type === 'athlete' && cat?.athlete?.team?.id) {
            abbr = NFL_TEAM_BY_ID[String(cat.athlete.team.id)]
          }
          if (abbr && !seen.has(abbr)) {
            seen.add(abbr)
            teams.push({
              abbr,
              logo: `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`,
            })
          }
          if (teams.length >= 4) break // Cap at 4 logos per item — ticker space
        }

        return {
          id: String(a.id || a.dataSourceIdentifier || `news-${i}`),
          kind: 'news' as const,
          headline,
          teams,
          ago: relativeAgo(a.published || a.lastModified),
          state: 'post' as const,
        }
      })
      .filter((n): n is NonNullable<typeof n> => n !== null)
      .slice(0, 24)
  } catch { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  const [mlb, nhl, nba, nflGames, nflNews] = await Promise.all([
    fetchLeague('baseball', 'mlb'),
    fetchLeague('hockey', 'nhl'),
    fetchLeague('basketball', 'nba'),
    fetchLeague('football', 'nfl'),
    fetchNFLNews(),
  ])

  // NFL row prefers in-season games → falls back to league news (offseason / quiet days).
  // Draft-picks branch retired Apr 30, 2026 once the draft concluded.
  const nfl = nflGames.length > 0 ? nflGames : nflNews
  const nflMode = nflGames.length > 0 ? 'games' : 'news'

  const result = { mlb, nhl, nba, nfl, nflMode, fetchedAt: new Date().toISOString() }
  cache = { data: result, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  return res.status(200).json(result)
}
