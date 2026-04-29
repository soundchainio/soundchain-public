/**
 * Cron: Auto-settle game picks based on ESPN final scores
 *
 * Runs every 10 minutes. Three sweeps in priority order:
 *   1. Refund expired open picks (creator deposited, no taker showed) → escrow.cancel + status=expired
 *   2. Reap stale pending_deposit picks (creator never finalized) > 30 min old → escrow.cancel + status=cancelled
 *   3. Settle matched picks where ESPN reports a final score → escrow.settle(winner) + status=settled
 *
 * vercel.json cron: every 10 minutes
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'
import { SPORT_CONFIG, PickSport } from 'lib/arena/picks/types'
import { escrowSettlePick, escrowCancelPick, transferErc20FromCommissioner } from 'lib/arena/picks/escrowServer'
import { TOKEN_CONFIG } from 'lib/arena/fantasy/types'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'
const CRON_SECRET = process.env.CRON_SECRET || ''
const PENDING_DEPOSIT_TIMEOUT_MS = 30 * 60 * 1000 // 30 min

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

    let refundedExpired = 0
    let reapedPending = 0
    let settled = 0
    const errors: string[] = []

    // ─── Sweep 1: Expire & refund open picks past game time ───────────────
    const expiredOpenPicks = await picks.find({
      status: 'open',
      expiresAt: { $lt: new Date().toISOString() },
    }).toArray()
    for (const p of expiredOpenPicks) {
      if (!p.escrowLeagueId) {
        // Legacy pre-on-chain pick — just mark expired
        await picks.updateOne({ _id: p._id }, { $set: { status: 'expired' } })
        refundedExpired++
        continue
      }
      try {
        const cancelTxHash = await escrowCancelPick(p.escrowLeagueId)
        await picks.updateOne({ _id: p._id }, { $set: { status: 'expired', escrowCancelTxHash: cancelTxHash } })
        refundedExpired++
      } catch (err: any) {
        errors.push(`refund expired ${p._id}: ${err?.message || 'unknown'}`)
      }
    }

    // ─── Sweep 2: Reap pending_deposit picks the creator abandoned ────────
    const cutoff = new Date(Date.now() - PENDING_DEPOSIT_TIMEOUT_MS).toISOString()
    const stalePending = await picks.find({
      status: 'pending_deposit',
      createdAt: { $lt: cutoff },
    }).toArray()
    for (const p of stalePending) {
      try {
        if (p.escrowLeagueId) {
          // No members joined — cancel is a no-op refund-wise but flips on-chain status
          try { await escrowCancelPick(p.escrowLeagueId) } catch {}
        }
        await picks.updateOne({ _id: p._id }, { $set: { status: 'cancelled' } })
        reapedPending++
      } catch (err: any) {
        errors.push(`reap pending ${p._id}: ${err?.message || 'unknown'}`)
      }
    }

    // ─── Sweep 3: Settle matched picks where ESPN says final ──────────────
    const matchedPicks = await picks.find({ status: 'matched' }).toArray()
    if (matchedPicks.length === 0) {
      return res.status(200).json({
        refundedExpired,
        reapedPending,
        settled: 0,
        errors,
        message: 'no matched picks awaiting settle',
      })
    }

    // Group by sport to minimize ESPN calls
    const bySport: Record<string, any[]> = {}
    for (const p of matchedPicks) {
      if (!bySport[p.sport]) bySport[p.sport] = []
      bySport[p.sport].push(p)
    }

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

    for (const pick of matchedPicks) {
      const events = scoreboards[pick.sport] || []
      const event = events.find((e: any) => e.id === pick.espnGameId)

      if (!event) {
        // Game not on today's scoreboard — may have ended yesterday
        if (new Date(pick.gameTime) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          // Game was 24+ hrs ago and not on scoreboard — stuck. Manual review needed.
          errors.push(`pick ${pick._id} game ${pick.espnGameId} not on scoreboard 24+ hrs after gameTime — manual review`)
        }
        continue
      }

      const comp = event.competitions?.[0]
      const state = comp?.status?.type?.state
      if (state !== 'post') continue // Game not final yet

      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
      const homeScore = parseInt(home?.score || '0')
      const awayScore = parseInt(away?.score || '0')

      if (homeScore === awayScore) continue // Tie — wait for OT

      const winner = homeScore > awayScore ? 'home' : 'away'
      const winnerHandle = pick.creatorPick === winner ? pick.creatorHandle : pick.takerHandle
      const winnerWalletAddress = pick.creatorPick === winner ? pick.creatorWalletAddress : pick.takerWalletAddress

      if (!winnerWalletAddress) {
        errors.push(`pick ${pick._id} missing winner wallet address — cannot settle on-chain`)
        continue
      }
      if (!pick.escrowLeagueId) {
        errors.push(`pick ${pick._id} missing escrowLeagueId — cannot settle on-chain`)
        continue
      }

      let payoutTxHash: string
      try {
        payoutTxHash = await escrowSettlePick(pick.escrowLeagueId, winnerWalletAddress)
      } catch (err: any) {
        errors.push(`settle ${pick._id} (league ${pick.escrowLeagueId}): ${err?.message || 'unknown'}`)
        continue
      }

      // OGUN bonus payout: pot * ogunBonusBps / 10000 OGUN from commissioner -> winner.
      // Gated on commissioner balance; never aborts the cron.
      const bonusUpdate: Record<string, any> = {}
      if (pick.entryToken === 'OGUN' && pick.ogunBonusBps && pick.ogunBonusBps > 0) {
        try {
          const ogunCfg = TOKEN_CONFIG['OGUN']
          const bonusAmount = (pick.entryFee * 2 * pick.ogunBonusBps) / 10000
          const bonusWei = ethers.utils.parseUnits(bonusAmount.toString(), ogunCfg.decimals)
          const result = await transferErc20FromCommissioner(ogunCfg.address, winnerWalletAddress, bonusWei)
          bonusUpdate.ogunBonusAt = new Date().toISOString()
          if (result.txHash) bonusUpdate.ogunBonusTxHash = result.txHash
          if (result.skippedReason) bonusUpdate.ogunBonusSkippedReason = result.skippedReason
        } catch (err: any) {
          errors.push(`ogun bonus ${pick._id}: ${err?.message || 'unknown'}`)
          bonusUpdate.ogunBonusAt = new Date().toISOString()
          bonusUpdate.ogunBonusSkippedReason = `error: ${err?.message || 'unknown'}`
        }
      }

      await picks.updateOne({ _id: pick._id }, {
        $set: {
          gameStatus: 'post',
          finalHomeScore: homeScore,
          finalAwayScore: awayScore,
          winner,
          winnerHandle,
          winnerWalletAddress,
          payoutTxHash,
          status: 'settled',
          settledAt: new Date().toISOString(),
          ...bonusUpdate,
        },
      })
      settled++
    }

    return res.status(200).json({
      refundedExpired,
      reapedPending,
      settled,
      checked: matchedPicks.length,
      sports: Object.keys(bySport),
      errors,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
