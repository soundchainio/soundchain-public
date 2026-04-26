/**
 * Cron: Auto-settle game picks based on ESPN final scores
 *
 * Runs every 10 minutes. Checks all 'matched' picks, fetches ESPN
 * scoreboard for each sport, and settles any games that are 'post' (final).
 *
 * vercel.json cron: every 10 minutes
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { SPORT_CONFIG, PickSport } from 'lib/arena/picks/types'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'
const CRON_SECRET = process.env.CRON_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth — cron secret or skip in dev
  const authHeader = req.headers.authorization
  const querySecret = req.query.secret as string
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const picks = db.collection('gamepicks')

    // Expire any open picks past their game time — runs first so unmatched picks don't sit
    // open forever when there are no matched picks to settle.
    const expiredOpen = await picks.updateMany(
      { status: 'open', expiresAt: { $lt: new Date().toISOString() } },
      { $set: { status: 'expired' } }
    )

    // Get all matched (active) picks
    const matchedPicks = await picks.find({ status: 'matched' }).toArray()
    if (matchedPicks.length === 0) {
      return res.status(200).json({
        settled: 0,
        expired: expiredOpen.modifiedCount,
        message: expiredOpen.modifiedCount > 0 ? 'expired stale open picks' : 'no active picks',
      })
    }

    // Group by sport to minimize ESPN calls
    const bySport: Record<string, any[]> = {}
    for (const p of matchedPicks) {
      if (!bySport[p.sport]) bySport[p.sport] = []
      bySport[p.sport].push(p)
    }

    // Fetch scoreboards for each sport with active picks
    const scoreboards: Record<string, any[]> = {}
    for (const sport of Object.keys(bySport)) {
      const cfg = SPORT_CONFIG[sport as PickSport]
      if (!cfg) continue
      try {
        const r = await fetch(`${ESPN_BASE}/${cfg.espnSport}/${cfg.espnLeague}/scoreboard`)
        const data = await r.json()
        scoreboards[sport] = data.events || []
      } catch {
        scoreboards[sport] = []
      }
    }

    let settled = 0
    let expired = expiredOpen.modifiedCount

    for (const pick of matchedPicks) {
      const events = scoreboards[pick.sport] || []
      const event = events.find((e: any) => e.id === pick.espnGameId)

      if (!event) {
        // Game not on today's scoreboard — may have ended yesterday
        // Check if game time is past + no result → mark for manual review
        if (new Date(pick.gameTime) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          // Game was 24+ hrs ago and not on scoreboard — expire it
          await picks.updateOne({ _id: pick._id }, { $set: { status: 'expired' } })
          expired++
        }
        continue
      }

      const comp = event.competitions?.[0]
      const state = comp?.status?.type?.state
      if (state !== 'post') continue // Game not final yet

      // Game is FINAL — determine winner
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
      const homeScore = parseInt(home?.score || '0')
      const awayScore = parseInt(away?.score || '0')

      if (homeScore === awayScore) continue // Tie — wait for OT (shouldn't happen in NBA/NFL, rare in NHL/MLB)

      const winner = homeScore > awayScore ? 'home' : 'away'
      const winnerHandle = pick.creatorPick === winner ? pick.creatorHandle : pick.takerHandle

      // Calculate payouts
      const pot = pick.pot || pick.entryFee * 2
      const platformFee = Math.floor((pot * pick.platformFeeBps) / 10000)
      const winnerPayout = pot - platformFee

      const now = new Date().toISOString()
      await picks.updateOne({ _id: pick._id }, {
        $set: {
          gameStatus: 'post',
          finalHomeScore: homeScore,
          finalAwayScore: awayScore,
          winner,
          winnerHandle,
          status: 'settled',
          settledAt: now,
        },
      })

      settled++
    }

    return res.status(200).json({
      settled,
      expired,
      checked: matchedPicks.length,
      sports: Object.keys(bySport),
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
