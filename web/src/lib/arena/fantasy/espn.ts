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
 * Aggregate players across major fantasy positions in a single call.
 * Used by the draft board — all relevant players for drafting.
 */
export async function fetchFantasyRelevantPlayers(): Promise<EspnPlayer[]> {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K']
  const results = await Promise.all(positions.map(p => fetchNFLPlayersByPosition(p, 100)))
  return results.flat()
}
