/**
 * GET /api/arena/picks/games — today's games across all 4 sports from ESPN
 *
 * ?sport=nba — filter to one sport (optional, default all)
 *
 * Returns games that haven't started yet (state === 'pre') — eligible for picks.
 * Also returns in-progress and final games for display.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { SPORT_CONFIG, PickSport } from 'lib/arena/picks/types'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 60_000 // 60s

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const sportFilter = req.query.sport as string

  if (cache && Date.now() - cache.ts < CACHE_TTL && !sportFilter) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  try {
    const sports = sportFilter ? [sportFilter] : Object.keys(SPORT_CONFIG)
    const results: any[] = []

    await Promise.all(sports.map(async (sport) => {
      const cfg = SPORT_CONFIG[sport as PickSport]
      if (!cfg) return

      try {
        const r = await fetch(`${ESPN_BASE}/${cfg.espnSport}/${cfg.espnLeague}/scoreboard`, {
          headers: { 'Accept': 'application/json' },
        })
        if (!r.ok) return
        const data = await r.json()

        for (const event of (data.events || [])) {
          const comp = event.competitions?.[0]
          const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
          const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
          const state = comp?.status?.type?.state || 'pre'

          results.push({
            sport,
            sportLabel: cfg.label,
            sportEmoji: cfg.emoji,
            espnGameId: event.id,
            homeTeam: home?.team?.abbreviation || '?',
            awayTeam: away?.team?.abbreviation || '?',
            homeTeamFull: home?.team?.displayName || '?',
            awayTeamFull: away?.team?.displayName || '?',
            homeLogo: home?.team?.logo || '',
            awayLogo: away?.team?.logo || '',
            homeScore: home?.score || '0',
            awayScore: away?.score || '0',
            gameTime: comp?.date || event.date,
            state, // pre, in, post
            statusDetail: comp?.status?.type?.shortDetail || '',
            canPick: state === 'pre', // only pre-game picks
          })
        }
      } catch { /* skip sport on error */ }
    }))

    // Sort: pickable games first, then by game time
    results.sort((a, b) => {
      if (a.canPick !== b.canPick) return a.canPick ? -1 : 1
      return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
    })

    const response = { games: results, fetchedAt: new Date().toISOString() }
    if (!sportFilter) cache = { data: response, ts: Date.now() }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(response)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
