/**
 * NHL native highlights via api-web.nhle.com — free, no key. Each completed
 * game's `landing` payload includes per-goal `highlightClip` (Brightcove video
 * IDs) and `highlightClipSharingUrl` (nhl.com page URLs). The Brightcove
 * account that hosts NHL clips is `6415718365001`; the player URL pattern is
 * stable so we can build embedable iframes without server-side video resolution.
 *
 * Endpoint surface in scope:
 *   https://api-web.nhle.com/v1/schedule/{YYYY-MM-DD}        — date schedule
 *   https://api-web.nhle.com/v1/gamecenter/{nhlGameId}/landing — game detail
 *
 * Same posture as `lib/mlbContent.ts`: pure HTTP fetcher, defensive parse,
 * caller decides caching. The unified per-sport proxy (`/api/nhl/highlights`)
 * handles Mongo cache + ESPN gameId resolution.
 */

const NHL_BASE = 'https://api-web.nhle.com/v1'

// Brightcove player constants — NHL.com embeds clips through this account.
// Player ID `EXtH6yAAen` is the public NHL clip player (no auth, no token).
const BRIGHTCOVE_ACCOUNT = '6415718365001'
const BRIGHTCOVE_PLAYER = 'EXtH6yAAen'

export interface NhlScheduleGame {
  nhlGameId: number
  date: string                   // YYYY-MM-DD
  awayAbbr: string
  homeAbbr: string
  awayName: string
  homeName: string
}

export interface NhlHighlight {
  id: string                     // brightcove video id (string)
  title: string                  // "MTL @ TOR — Suzuki goal (1st period 12:34)"
  scorerName: string
  teamAbbr: string
  period: number
  timeInPeriod: string           // "12:34"
  awayScore: number
  homeScore: number
  shotType?: string
  thumbnail: string              // brightcove still
  embedUrl: string               // brightcove iframe URL
  watchUrl: string               // nhl.com page URL (highlightClipSharingUrl)
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

const ESPN_TO_NHL_TRICODE: Record<string, string> = {
  // ESPN abbreviations that differ from NHL.com tricodes
  NJ: 'NJD',
  TB: 'TBL',
  LA: 'LAK',
  SJ: 'SJS',
  WSH: 'WSH',
  CLB: 'CBJ',
  CBJ: 'CBJ',
}

function normalizeTricode(t: string): string {
  const up = t.toUpperCase()
  return ESPN_TO_NHL_TRICODE[up] ?? up
}

/** Resolve ESPN gameId → NHL gameId by matching date + away/home tricodes
 *  against the NHL schedule. Same approach as `resolveMlbGamePk`. */
export async function resolveNhlGameId(
  date: string,                  // YYYY-MM-DD
  awayAbbr: string,
  homeAbbr: string,
): Promise<NhlScheduleGame | null> {
  // NHL schedule API returns a week starting from the given date — we filter
  // to the exact date we asked for. ±1 day fallback handles UTC overflow at
  // late-night games.
  const candidates = await Promise.all([
    fetchJSON<any>(`${NHL_BASE}/schedule/${date}`),
    fetchJSON<any>(`${NHL_BASE}/schedule/${shiftDate(date, -1)}`),
  ])

  const aN = normalizeTricode(awayAbbr)
  const hN = normalizeTricode(homeAbbr)

  for (const data of candidates) {
    if (!data) continue
    const days: any[] = data.gameWeek ?? []
    for (const day of days) {
      if (day.date && day.date.slice(0, 10) !== date && shiftDate(day.date.slice(0, 10), 1) !== date) continue
      for (const g of day.games ?? []) {
        const a = String(g?.awayTeam?.abbrev ?? '').toUpperCase()
        const h = String(g?.homeTeam?.abbrev ?? '').toUpperCase()
        if (a === aN && h === hN) {
          return {
            nhlGameId: Number(g.id),
            date: day.date.slice(0, 10),
            awayAbbr: a,
            homeAbbr: h,
            awayName: String(g?.awayTeam?.placeName?.default ?? '') + ' ' + String(g?.awayTeam?.commonName?.default ?? ''),
            homeName: String(g?.homeTeam?.placeName?.default ?? '') + ' ' + String(g?.homeTeam?.commonName?.default ?? ''),
          }
        }
      }
    }
  }
  return null
}

function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

/** Pull a single NHL game's per-goal highlight clips from the landing payload.
 *  Each goal can carry a `highlightClip` (Brightcove video ID) plus a
 *  `highlightClipSharingUrl` to nhl.com's clip page. We build a Brightcove
 *  iframe URL inline so the frontend can embed without a second roundtrip. */
export async function fetchNhlGameHighlights(nhlGameId: number, awayAbbr: string, homeAbbr: string): Promise<NhlHighlight[]> {
  const data: any = await fetchJSON(`${NHL_BASE}/gamecenter/${nhlGameId}/landing`)
  if (!data) return []

  const periods: any[] = data?.summary?.scoring ?? []
  const out: NhlHighlight[] = []

  for (const p of periods) {
    const periodNumber = Number(p?.periodDescriptor?.number ?? p?.period ?? 0)
    for (const goal of p?.goals ?? []) {
      const clipId = goal?.highlightClip
      if (!clipId) continue   // skip goals without a video clip
      const teamAbbr = String(goal?.teamAbbrev?.default ?? goal?.teamAbbrev ?? '').toUpperCase()
      const scorer = String(goal?.name?.default ?? `${goal?.firstName?.default ?? ''} ${goal?.lastName?.default ?? ''}`).trim()
      const clock = String(goal?.timeInPeriod ?? '00:00')
      const shotType = goal?.shotType ? String(goal.shotType) : undefined
      out.push({
        id: String(clipId),
        title: `${awayAbbr} @ ${homeAbbr} — ${scorer} (P${periodNumber} ${clock})`,
        scorerName: scorer,
        teamAbbr,
        period: periodNumber,
        timeInPeriod: clock,
        awayScore: Number(goal?.awayScore ?? 0),
        homeScore: Number(goal?.homeScore ?? 0),
        shotType,
        thumbnail: `https://cf-images.us-east-1.prod.boltdns.net/v1/static/${BRIGHTCOVE_ACCOUNT}/${clipId}/main/640x360/match/image.jpg`,
        embedUrl: `https://players.brightcove.net/${BRIGHTCOVE_ACCOUNT}/${BRIGHTCOVE_PLAYER}_default/index.html?videoId=${clipId}`,
        watchUrl: String(goal?.highlightClipSharingUrl ?? `https://www.nhl.com/video/${clipId}`),
      })
    }
  }

  // Three-min recap is a single bonus clip on most completed games — prepend
  // it as a "Game recap" entry so users see the headline summary first.
  const recapId = data?.threeMinRecap
  if (recapId) {
    out.unshift({
      id: String(recapId),
      title: `${awayAbbr} @ ${homeAbbr} — 3-Minute Recap`,
      scorerName: '',
      teamAbbr: '',
      period: 0,
      timeInPeriod: '',
      awayScore: 0,
      homeScore: 0,
      thumbnail: `https://cf-images.us-east-1.prod.boltdns.net/v1/static/${BRIGHTCOVE_ACCOUNT}/${recapId}/main/640x360/match/image.jpg`,
      embedUrl: `https://players.brightcove.net/${BRIGHTCOVE_ACCOUNT}/${BRIGHTCOVE_PLAYER}_default/index.html?videoId=${recapId}`,
      watchUrl: `https://www.nhl.com/video/${recapId}`,
    })
  }

  return out
}
