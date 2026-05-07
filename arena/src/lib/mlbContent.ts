/**
 * MLB native highlights via statsapi.mlb.com — free, no key, direct mp4 URLs
 * (no HLS player dep needed). Pattern matches `lib/nbaStats.ts` posture: pure
 * HTTP fetcher, defensive parse, caller decides caching. The unified per-sport
 * proxy (`/api/mlb/highlights/[gameId]`) handles Mongo cache + ESPN gameId
 * resolution.
 *
 * Endpoint surface in scope:
 *   /api/v1/schedule?sportId=1&date=YYYY-MM-DD&hydrate=team
 *   /api/v1/game/{gamePk}/content
 *
 * Zero auth. CORS works browser-side too — the proxy exists for cache + CSP
 * + ESPN→gamePk mapping, not for CORS.
 */

const STATSAPI = 'https://statsapi.mlb.com/api/v1'

export interface MlbScheduleGame {
  gamePk: number
  date: string                   // YYYY-MM-DD (Eastern game date)
  awayName: string
  awayAbbr?: string
  homeName: string
  homeAbbr?: string
}

export interface MlbHighlight {
  id: string                     // statsapi id (string)
  title: string
  description: string
  duration: string               // "HH:MM:SS"
  date: string                   // ISO timestamp
  mp4Url?: string                // best mp4Avc playback (direct, browser-playable)
  thumbnail?: string             // largest cut from image.cuts
  durationSeconds: number        // parsed from duration
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

/** Resolve ESPN gameId → MLB gamePk by date + team-name match.
 *  Caller passes ESPN-extracted away/home full names (or abbrs) and the game date.
 *  Returns null if no match — the proxy then short-circuits to YouTube fallback.
 */
export async function resolveMlbGamePk(
  date: string,                  // YYYY-MM-DD
  awayName: string,
  homeName: string,
): Promise<MlbScheduleGame | null> {
  const data: any = await fetchJSON(
    `${STATSAPI}/schedule?sportId=1&date=${date}&hydrate=team`,
  )
  if (!data) return null
  const games: any[] = (data.dates ?? []).flatMap((d: any) => d.games ?? [])

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const aN = norm(awayName)
  const hN = norm(homeName)

  for (const g of games) {
    const a = g?.teams?.away?.team
    const h = g?.teams?.home?.team
    if (!a || !h) continue
    const awayHit = norm(a.name ?? '').includes(aN) || norm(a.teamName ?? '').includes(aN) || aN.includes(norm(a.teamName ?? ''))
    const homeHit = norm(h.name ?? '').includes(hN) || norm(h.teamName ?? '').includes(hN) || hN.includes(norm(h.teamName ?? ''))
    if (awayHit && homeHit) {
      return {
        gamePk: g.gamePk,
        date: g.officialDate ?? date,
        awayName: a.name,
        awayAbbr: a.abbreviation,
        homeName: h.name,
        homeAbbr: h.abbreviation,
      }
    }
  }
  return null
}

function parseDurationSeconds(d: string): number {
  if (!d) return 0
  const parts = d.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parseInt(d, 10) || 0
}

/** Pull a single MLB game's highlights. Each highlight has multiple playbacks
 *  (mp4Avc + hlsCloud + HTTP_CLOUD_WIRED variants); we prefer the highest-bitrate
 *  mp4Avc since browsers play mp4 natively without an HLS dependency.
 */
export async function fetchMlbGameHighlights(gamePk: number): Promise<MlbHighlight[]> {
  const data: any = await fetchJSON(`${STATSAPI}/game/${gamePk}/content`)
  if (!data) return []
  const items: any[] = data?.highlights?.highlights?.items ?? []

  return items
    .map((it: any): MlbHighlight | null => {
      // Prefer highest-bitrate mp4Avc; statsapi returns playbacks ordered low→high,
      // so reverse + first-mp4Avc gives best mp4. Fallback to any mp4 then any URL.
      const playbacks: any[] = it.playbacks ?? []
      const mp4 =
        [...playbacks].reverse().find((p) => p.name === 'mp4Avc' && p.url) ??
        [...playbacks].reverse().find((p) => /mp4/i.test(p.name) && p.url) ??
        playbacks.find((p) => p.url)
      // Image cuts ordered largest→smallest in some games and reverse in others;
      // walk both ends, take the highest-resolution under a sensible cap.
      const cuts: any[] = it?.image?.cuts ?? []
      const thumb = cuts.find((c) => (c.width ?? 0) <= 1280 && (c.width ?? 0) >= 480)?.src ?? cuts[0]?.src

      if (!mp4?.url && !thumb) return null

      return {
        id: String(it.id ?? it.guid ?? it.mediaPlaybackId ?? Math.random()),
        title: String(it.title ?? it.headline ?? 'MLB highlight'),
        description: String(it.description ?? it.blurb ?? ''),
        duration: String(it.duration ?? '00:00:00'),
        durationSeconds: parseDurationSeconds(String(it.duration ?? '0')),
        date: String(it.date ?? ''),
        mp4Url: mp4?.url,
        thumbnail: thumb,
      }
    })
    .filter((x): x is MlbHighlight => x !== null)
}
