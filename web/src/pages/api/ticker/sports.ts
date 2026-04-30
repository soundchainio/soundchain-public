/**
 * GET /api/ticker/sports — live scores from MLB, NHL, NBA + ESPN cross-sport news
 *
 * Uses ESPN's public scoreboard + news APIs (free, no key needed).
 * 4 rows: MLB, NHL, NBA, ESPN.
 * - MLB/NHL/NBA rows show live game scores from their respective scoreboard endpoints.
 * - ESPN row pulls cross-league news (NFL/NBA/MLB/NHL/college/etc.) so it stays
 *   populated year-round regardless of any single league's seasonal cycle.
 * Cached 60s server-side.
 *
 * History: NFL row was originally draft-picks (in draft week) → games (in-season).
 * Apr 30, 2026: draft-picks retired post-draft, replaced w/ NFL-only news.
 * Apr 30, 2026 (later): replaced NFL row entirely with cross-sport ESPN news —
 * NFL articles still appear in the mix when NFL is in-season, but the row no longer
 * sits empty during the ~4-month NFL offseason.
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

// Friendly labels for the per-item league pill rendered before team logos.
// Keys are the URL slugs ESPN uses in clubhouse links (matches LEAGUE_REGEX below).
const LEAGUE_LABELS: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  mlb: 'MLB',
  nhl: 'NHL',
  wnba: 'WNBA',
  'college-football': 'NCAAF',
  'mens-college-basketball': 'NCAAM',
  'womens-college-basketball': 'NCAAW',
  mma: 'MMA',
  boxing: 'BOX',
  f1: 'F1',
  nascar: 'NASCAR',
  golf: 'GOLF',
  tennis: 'TENNIS',
}

// ESPN clubhouse URLs follow a stable shape: .../{league-slug}/team/_/name/{abbr}/{...}
// We extract league + abbr in one pass so we can build the logo URL without per-league
// hardcoded id maps. Logo URL pattern: a.espncdn.com/i/teamlogos/{league}/500/{abbr}.png
const LEAGUE_REGEX = /\/(nfl|nba|mlb|nhl|wnba|college-football|mens-college-basketball|womens-college-basketball)\/team\/_\/name\/([a-z0-9]+)/i

function extractTeamFromHref(href: string): { league: string; abbr: string } | null {
  const m = href?.match(LEAGUE_REGEX)
  if (!m) return null
  return { league: m[1].toLowerCase(), abbr: m[2].toLowerCase() }
}

async function fetchEspnNews() {
  // ESPN's cross-sport news endpoint — returns mixed-league articles (NFL, NBA, MLB,
  // NHL, college, etc.). Free, no key. Replaces the NFL-only branch so the row never
  // blanks during one league's offseason.
  //
  // Team-logo extraction strategy: parse `categories[].team.links[].href` for the
  // clubhouse URL pattern and pull league + abbr in one shot. Avoids maintaining
  // per-league team-id maps (would be ~120 entries across NFL/NBA/MLB/NHL).
  try {
    const res = await fetch(`${ESPN_BASE}/news?limit=50`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const articles: any[] = data.articles || []

    return articles
      .map((a: any, i: number) => {
        const headline: string = (a.headline || a.title || '').trim()
        if (!headline) return null

        // Walk every category for team references — both direct ({type:'team'})
        // AND nested ({type:'athlete', athlete: {team: {...}}}). Dedupe by
        // league:abbr key since same team often appears across multiple categories.
        const seen = new Set<string>()
        const teams: { league: string; abbr: string; logo: string }[] = []
        let primaryLeague = ''

        for (const cat of a.categories || []) {
          const candidateLinks: any[] = [
            ...(cat?.team?.links || []),
            ...(cat?.athlete?.team?.links || []),
            ...(cat?.links || []),
          ]
          let extracted: { league: string; abbr: string } | null = null
          for (const link of candidateLinks) {
            extracted = extractTeamFromHref(link?.href || '')
            if (extracted) break
          }
          if (!extracted) continue

          const key = `${extracted.league}:${extracted.abbr}`
          if (seen.has(key)) continue
          seen.add(key)
          teams.push({
            league: extracted.league,
            abbr: extracted.abbr.toUpperCase(),
            logo: `https://a.espncdn.com/i/teamlogos/${extracted.league}/500/${extracted.abbr}.png`,
          })
          if (!primaryLeague) primaryLeague = extracted.league
          if (teams.length >= 4) break // Cap at 4 logos/item — ticker space
        }

        // Article might still have a league label even when no specific team
        // could be extracted (e.g. league-wide story). Try the article's own
        // `links.web.href` as a last resort — same /{league}/ slug appears.
        if (!primaryLeague) {
          const articleHref: string = a.links?.web?.href || a.links?.mobile?.href || ''
          const m = articleHref.match(/espn\.com\/(nfl|nba|mlb|nhl|wnba|college-football|mens-college-basketball|womens-college-basketball|mma|boxing|f1|nascar|golf|tennis)\b/i)
          if (m) primaryLeague = m[1].toLowerCase()
        }

        return {
          id: String(a.id || a.dataSourceIdentifier || `news-${i}`),
          kind: 'news' as const,
          headline,
          league: primaryLeague,
          leagueLabel: primaryLeague ? (LEAGUE_LABELS[primaryLeague] || primaryLeague.toUpperCase()) : '',
          teams,
          ago: relativeAgo(a.published || a.lastModified),
          state: 'post' as const,
        }
      })
      .filter((n): n is NonNullable<typeof n> => n !== null)
      .slice(0, 30)
  } catch { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  const [mlb, nhl, nba, espn] = await Promise.all([
    fetchLeague('baseball', 'mlb'),
    fetchLeague('hockey', 'nhl'),
    fetchLeague('basketball', 'nba'),
    fetchEspnNews(),
  ])

  const result = { mlb, nhl, nba, espn, fetchedAt: new Date().toISOString() }
  cache = { data: result, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  return res.status(200).json(result)
}
