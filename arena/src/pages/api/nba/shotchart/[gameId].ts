/**
 * Shot Chart tab proxy — every FGA in the game w/ x/y coords, made/missed,
 * shot zone, action type. Powers the half-court SVG render.
 *
 * Season is derived from the game date (Oct-Dec → that year's season,
 * Jan-Jun → previous year's season). Required by stats.nba.com API.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchShotChart, nbaSeasonForDate } from '@/lib/nbaStats'
import { nbaCachedProxy } from '@/lib/nbaProxy'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Playoffs hint via query — defaults to Regular Season; ScoreboardV3 doesn't
  // expose seasonType cleanly so we pass-through.
  const seasonType =
    String(req.query.seasonType ?? '').toLowerCase() === 'playoffs'
      ? 'Playoffs'
      : 'Regular Season'

  return nbaCachedProxy(req, res, {
    type: 'shotchart',
    liveTtlMs: 30_000,           // shots accumulate quickly during live games
    fetcher: async (nbaGameId, gameDate) => {
      const season = nbaSeasonForDate(gameDate)
      const shotChart = await fetchShotChart(nbaGameId, season, seasonType as any)
      return { shotChart, season, seasonType }
    },
  })
}
