/**
 * FANTASY LEAGUE ACTIONS — join / start-draft / pick / lock / settle / cancel
 *
 * POST /api/arena/fantasy/[id]/action { action, ...payload }
 *
 * Each action enforces status + authorship guards. State transitions:
 *   open → drafting (start-draft, commissioner, teams >= 2)
 *   drafting → live (auto when all roster slots filled; commissioner can force via lock)
 *   live → complete (settle, commissioner, after week 14+ schedule)
 *   open → cancelled (cancel, commissioner)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import {
  FantasyLeague,
  FantasyTeam,
  DEFAULT_ROSTER_TEMPLATE,
} from 'lib/arena/fantasy/types'
import { generateRoundRobin } from 'lib/arena/fantasy/schedule'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const id = req.query.id as string
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: 'valid id required' })

  const { action } = req.body || {}
  if (!action) return res.status(400).json({ error: 'action required' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const leagues = db.collection<FantasyLeague>('fantasy_leagues')
  const profiles = db.collection('profiles')
  const league = await leagues.findOne({ _id: new ObjectId(id) as any })
  if (!league) return res.status(404).json({ error: 'league not found' })

  const me = await profiles.findOne({ _id: auth.profileId })
  if (!me) return res.status(404).json({ error: 'profile not found' })
  const myHandle: string = me.userHandle || `user_${auth.profileId.toString().slice(-6)}`
  const myProfileId = auth.profileId.toString()
  const isCommissioner = league.commissionerProfileId === myProfileId

  // ─── JOIN ────────────────────────────────────────────────
  if (action === 'join') {
    if (league.status !== 'open') return res.status(400).json({ error: 'league not open for joining' })
    if (league.teams.length >= league.maxTeams) return res.status(400).json({ error: 'league full' })
    if (league.teams.some(t => t.ownerProfileId === myProfileId)) {
      return res.status(409).json({ error: 'already joined' })
    }

    const teamName = (req.body.teamName as string)?.trim() || `${myHandle}'s Team`
    const depositTxHash = req.body.depositTxHash as string | undefined

    const myWallet = me.hdWalletAddress || me.magicWalletAddress || me.googleWalletAddress ||
      me.discordWalletAddress || me.twitchWalletAddress || me.emailWalletAddress

    const newTeam: FantasyTeam = {
      ownerHandle: myHandle,
      ownerProfileId: myProfileId,
      ownerWallet: myWallet || undefined,
      teamName,
      joinedAt: new Date().toISOString(),
      roster: [],
      weeklyScores: {},
      wins: 0,
      losses: 0,
      totalPoints: 0,
      depositTxHash,
    }
    await leagues.updateOne(
      { _id: new ObjectId(id) as any },
      { $push: { teams: newTeam } as any, $set: { updatedAt: new Date().toISOString() } }
    )
    return res.status(200).json({ ok: true, team: newTeam })
  }

  // ─── START DRAFT ─────────────────────────────────────────
  if (action === 'start-draft') {
    if (!isCommissioner) return res.status(403).json({ error: 'commissioner only' })
    if (league.status !== 'open') return res.status(400).json({ error: 'league not open' })
    if (league.teams.length < 2) return res.status(400).json({ error: 'need 2+ teams' })

    // Random draft order
    const order = [...league.teams.map(t => t.ownerHandle)]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }

    // Pre-generate season schedule based on finalized team list
    const schedule = generateRoundRobin(league.teams.map(t => t.ownerHandle), 14)

    await leagues.updateOne(
      { _id: new ObjectId(id) as any },
      {
        $set: {
          status: 'drafting',
          draftOrder: order,
          currentPickIndex: 0,
          schedule,
          updatedAt: new Date().toISOString(),
        },
      }
    )
    return res.status(200).json({ ok: true, draftOrder: order, scheduleLength: schedule.length })
  }

  // ─── DRAFT PICK ──────────────────────────────────────────
  if (action === 'pick') {
    if (league.status !== 'drafting') return res.status(400).json({ error: 'not in draft' })
    const { playerId, fullName, position, teamAbbr, slot } = req.body
    if (!playerId || !fullName || !position) {
      return res.status(400).json({ error: 'playerId, fullName, position required' })
    }

    // Snake draft: compute whose turn it is from currentPickIndex
    const N = league.draftOrder.length
    const overall = league.currentPickIndex
    const round = Math.floor(overall / N)          // 0-indexed round
    const withinRound = overall % N
    const onClockIdx = round % 2 === 0 ? withinRound : (N - 1 - withinRound)
    const onClockHandle = league.draftOrder[onClockIdx]
    if (onClockHandle !== myHandle) {
      return res.status(403).json({ error: `not your pick — @${onClockHandle} is on the clock` })
    }

    // Find my team
    const team = league.teams.find(t => t.ownerProfileId === myProfileId)
    if (!team) return res.status(404).json({ error: 'you are not in this league' })
    if (team.roster.length >= league.draftRounds) {
      return res.status(400).json({ error: 'roster full' })
    }

    // Prevent dupes across league
    const already = league.teams.some(t => t.roster.some(r => r.playerId === String(playerId)))
    if (already) return res.status(409).json({ error: 'player already drafted in this league' })

    const nextSlot = slot || DEFAULT_ROSTER_TEMPLATE[team.roster.length] || 'BENCH'
    const entry = {
      playerId: String(playerId),
      fullName,
      position,
      teamAbbr: teamAbbr || '',
      slot: nextSlot,
      draftedAt: new Date().toISOString(),
      draftPick: overall + 1,
    }

    const newIndex = overall + 1
    const totalPicks = N * league.draftRounds
    const newStatus = newIndex >= totalPicks ? 'live' : 'drafting'

    await leagues.updateOne(
      {
        _id: new ObjectId(id) as any,
        'teams.ownerProfileId': myProfileId,
      },
      {
        $push: { 'teams.$.roster': entry } as any,
        $set: {
          currentPickIndex: newIndex,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
      }
    )
    return res.status(200).json({ ok: true, pick: entry, nextIndex: newIndex, draftComplete: newStatus === 'live' })
  }

  // ─── LOCK (force end draft early — commissioner only) ────
  if (action === 'lock') {
    if (!isCommissioner) return res.status(403).json({ error: 'commissioner only' })
    if (league.status !== 'drafting') return res.status(400).json({ error: 'not drafting' })
    await leagues.updateOne(
      { _id: new ObjectId(id) as any },
      { $set: { status: 'live', updatedAt: new Date().toISOString() } }
    )
    return res.status(200).json({ ok: true, status: 'live' })
  }

  // ─── SETTLE (commissioner declares winners) ──────────────
  if (action === 'settle') {
    if (!isCommissioner) return res.status(403).json({ error: 'commissioner only' })
    if (league.status !== 'live') return res.status(400).json({ error: 'league not live' })
    const { first, second, third, payoutTxHash } = req.body
    if (!first) return res.status(400).json({ error: 'first winner required' })

    await leagues.updateOne(
      { _id: new ObjectId(id) as any },
      {
        $set: {
          status: 'complete',
          winners: { first, second: second || null, third: third || null },
          payoutTxHash: payoutTxHash || null,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    )
    return res.status(200).json({ ok: true, status: 'complete' })
  }

  // ─── CANCEL (before draft only) ──────────────────────────
  if (action === 'cancel') {
    if (!isCommissioner) return res.status(403).json({ error: 'commissioner only' })
    if (league.status !== 'open') return res.status(400).json({ error: 'only open leagues can be cancelled' })
    await leagues.updateOne(
      { _id: new ObjectId(id) as any },
      { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
    )
    return res.status(200).json({ ok: true, status: 'cancelled' })
  }

  return res.status(400).json({ error: 'unknown action' })
}
