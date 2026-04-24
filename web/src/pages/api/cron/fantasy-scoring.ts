/**
 * Fantasy scoring cron — invoked by Vercel scheduler (vercel.json cron entry).
 * Iterates every live league, pulls ESPN gamelogs for the current NFL week,
 * applies PPR scoring, updates weeklyScores + matchup W/L.
 *
 * Auth: Vercel cron hits this route with header `Authorization: Bearer ${CRON_SECRET}`.
 * Also accepts manual invocations with a valid bearer for debugging.
 *
 * Off-season behavior: returns {skipped, reason: 'offseason'} cleanly — safe to
 * leave scheduled year-round.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { syncAllLiveLeagues } from 'lib/arena/fantasy/scoringSync'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel cron uses GET. Allow POST for manual triggers.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'GET or POST only' })
  }

  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.authorization || ''
  const isAuthed =
    !cronSecret ||  // if unset in dev, allow (prod must set it)
    auth === `Bearer ${cronSecret}` ||
    req.query.secret === cronSecret

  if (!isAuthed) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const startedAt = Date.now()
    const { nflWeek, results } = await syncAllLiveLeagues()
    const elapsed = Date.now() - startedAt

    const summary = {
      ok: true,
      nflWeek,
      elapsedMs: elapsed,
      leaguesTotal: results.length,
      leaguesSynced: results.filter(r => r.status === 'ok').length,
      leaguesSkipped: results.filter(r => r.status === 'skipped').length,
      leaguesErrored: results.filter(r => r.status === 'error').length,
      results,
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(summary)
  } catch (err: any) {
    console.error('[cron/fantasy-scoring] fatal:', err)
    return res.status(500).json({ error: err?.message || 'internal error' })
  }
}
