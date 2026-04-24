/**
 * Fantasy League Trades
 *
 * GET  /api/arena/fantasy/[id]/trade — list trades for a league
 * POST /api/arena/fantasy/[id]/trade — propose, accept, reject, or veto a trade
 *
 * Actions:
 *   propose  — { offering: [playerId...], requesting: [playerId...], recipientHandle }
 *   accept   — { tradeId }
 *   reject   — { tradeId }
 *   veto     — { tradeId, reason } (commissioner only, within 24hrs of acceptance)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { Trade, TradeSide } from 'lib/arena/fantasy/types'
import { randomBytes } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const leagueId = req.query.id as string
  if (!leagueId) return res.status(400).json({ error: 'league id required' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const leagues = db.collection('fantasyleagues')

  // GET — list trades
  if (req.method === 'GET') {
    const league = await leagues.findOne({ _id: new ObjectId(leagueId) })
    if (!league) return res.status(404).json({ error: 'league not found' })
    return res.status(200).json({ trades: league.trades || [] })
  }

  // POST — trade actions
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'auth required' })

  const me = await db.collection('profiles').findOne({ _id: auth.profileId })
  if (!me) return res.status(404).json({ error: 'profile not found' })
  const myHandle = me.userHandle || ''

  const league = await leagues.findOne({ _id: new ObjectId(leagueId) })
  if (!league) return res.status(404).json({ error: 'league not found' })

  // Must be in the league
  const myTeam = league.teams?.find((t: any) => t.ownerHandle === myHandle)
  if (!myTeam) return res.status(403).json({ error: 'not in this league' })

  // League must be live (trades happen during the season)
  if (league.status !== 'live') return res.status(400).json({ error: 'trades only during live season' })

  const { action } = req.body || {}

  // ─── PROPOSE ──────────────────────────────────────────────
  if (action === 'propose') {
    const { offering, requesting, recipientHandle } = req.body

    if (!offering?.length || !requesting?.length) return res.status(400).json({ error: 'offering and requesting arrays required' })
    if (!recipientHandle) return res.status(400).json({ error: 'recipientHandle required' })
    if (recipientHandle === myHandle) return res.status(400).json({ error: 'cannot trade with yourself' })

    // Check trade deadline
    const currentWeek = league.lastScoringSyncWeek || 1
    if (currentWeek > (league.tradeDeadlineWeek || 12)) {
      return res.status(400).json({ error: `trade deadline passed (week ${league.tradeDeadlineWeek || 12})` })
    }

    // Verify recipient is in the league
    const recipientTeam = league.teams?.find((t: any) => t.ownerHandle === recipientHandle)
    if (!recipientTeam) return res.status(400).json({ error: 'recipient not in this league' })

    // Verify proposer owns all offered players
    const myRoster = myTeam.roster || []
    for (const pid of offering) {
      if (!myRoster.find((r: any) => r.playerId === pid)) {
        return res.status(400).json({ error: `you don't own player ${pid}` })
      }
    }

    // Verify recipient owns all requested players
    const theirRoster = recipientTeam.roster || []
    for (const pid of requesting) {
      if (!theirRoster.find((r: any) => r.playerId === pid)) {
        return res.status(400).json({ error: `${recipientHandle} doesn't own player ${pid}` })
      }
    }

    // Build trade
    const now = new Date()
    const trade: Trade = {
      id: randomBytes(8).toString('hex'),
      leagueId,
      proposer: {
        ownerHandle: myHandle,
        players: offering.map((pid: string) => {
          const r = myRoster.find((r: any) => r.playerId === pid)
          return { playerId: pid, fullName: r?.fullName || '?', position: r?.position || '?', teamAbbr: r?.teamAbbr || '?' }
        }),
      },
      recipient: {
        ownerHandle: recipientHandle,
        players: requesting.map((pid: string) => {
          const r = theirRoster.find((r: any) => r.playerId === pid)
          return { playerId: pid, fullName: r?.fullName || '?', position: r?.position || '?', teamAbbr: r?.teamAbbr || '?' }
        }),
      },
      status: 'proposed',
      proposedAt: now.toISOString(),
      vetoDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    }

    await leagues.updateOne({ _id: new ObjectId(leagueId) }, { $push: { trades: trade as any }, $set: { updatedAt: now.toISOString() } })
    return res.status(201).json({ trade })
  }

  // ─── ACCEPT ───────────────────────────────────────────────
  if (action === 'accept') {
    const { tradeId } = req.body
    if (!tradeId) return res.status(400).json({ error: 'tradeId required' })

    const trades: Trade[] = league.trades || []
    const trade = trades.find(t => t.id === tradeId)
    if (!trade) return res.status(404).json({ error: 'trade not found' })
    if (trade.status !== 'proposed') return res.status(400).json({ error: `trade is ${trade.status}` })
    if (trade.recipient.ownerHandle !== myHandle) return res.status(403).json({ error: 'only recipient can accept' })

    // Check expiry
    if (new Date(trade.expiresAt) < new Date()) {
      await leagues.updateOne(
        { _id: new ObjectId(leagueId), 'trades.id': tradeId },
        { $set: { 'trades.$.status': 'expired', 'trades.$.respondedAt': new Date().toISOString() } }
      )
      return res.status(400).json({ error: 'trade expired' })
    }

    // Execute the swap — move players between rosters
    const now = new Date().toISOString()
    const proposerIdx = league.teams.findIndex((t: any) => t.ownerHandle === trade.proposer.ownerHandle)
    const recipientIdx = league.teams.findIndex((t: any) => t.ownerHandle === trade.recipient.ownerHandle)

    // Remove offered players from proposer, add requested players
    const proposerRoster = [...league.teams[proposerIdx].roster]
    const recipientRoster = [...league.teams[recipientIdx].roster]

    // Players leaving proposer → going to recipient
    const movingToRecipient = trade.proposer.players.map(p => {
      const idx = proposerRoster.findIndex((r: any) => r.playerId === p.playerId)
      if (idx === -1) return null
      const [removed] = proposerRoster.splice(idx, 1)
      return { ...removed, slot: 'BENCH' as const } // traded players go to bench
    }).filter(Boolean)

    // Players leaving recipient → going to proposer
    const movingToProposer = trade.recipient.players.map(p => {
      const idx = recipientRoster.findIndex((r: any) => r.playerId === p.playerId)
      if (idx === -1) return null
      const [removed] = recipientRoster.splice(idx, 1)
      return { ...removed, slot: 'BENCH' as const }
    }).filter(Boolean)

    // Add traded players to opposite rosters
    proposerRoster.push(...movingToProposer)
    recipientRoster.push(...movingToRecipient)

    // Update everything atomically
    await leagues.updateOne(
      { _id: new ObjectId(leagueId) },
      {
        $set: {
          [`teams.${proposerIdx}.roster`]: proposerRoster,
          [`teams.${recipientIdx}.roster`]: recipientRoster,
          'trades.$[t].status': 'accepted',
          'trades.$[t].respondedAt': now,
          'trades.$[t].vetoDeadline': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now,
        },
      },
      { arrayFilters: [{ 't.id': tradeId }] }
    )

    return res.status(200).json({ ok: true, status: 'accepted' })
  }

  // ─── REJECT ───────────────────────────────────────────────
  if (action === 'reject') {
    const { tradeId } = req.body
    if (!tradeId) return res.status(400).json({ error: 'tradeId required' })

    const trades: Trade[] = league.trades || []
    const trade = trades.find(t => t.id === tradeId)
    if (!trade) return res.status(404).json({ error: 'trade not found' })
    if (trade.status !== 'proposed') return res.status(400).json({ error: `trade is ${trade.status}` })
    if (trade.recipient.ownerHandle !== myHandle && trade.proposer.ownerHandle !== myHandle) {
      return res.status(403).json({ error: 'only proposer or recipient can reject' })
    }

    await leagues.updateOne(
      { _id: new ObjectId(leagueId) },
      { $set: { 'trades.$[t].status': 'rejected', 'trades.$[t].respondedAt': new Date().toISOString(), updatedAt: new Date().toISOString() } },
      { arrayFilters: [{ 't.id': tradeId }] }
    )

    return res.status(200).json({ ok: true, status: 'rejected' })
  }

  // ─── VETO (commissioner only) ─────────────────────────────
  if (action === 'veto') {
    const { tradeId, reason } = req.body
    if (!tradeId) return res.status(400).json({ error: 'tradeId required' })

    // Commissioner check
    if (myHandle !== league.commissionerHandle) {
      return res.status(403).json({ error: 'only commissioner can veto' })
    }

    const trades: Trade[] = league.trades || []
    const trade = trades.find(t => t.id === tradeId)
    if (!trade) return res.status(404).json({ error: 'trade not found' })
    if (trade.status !== 'accepted') return res.status(400).json({ error: 'can only veto accepted trades' })

    // Check veto window (24hrs after acceptance)
    if (new Date(trade.vetoDeadline) < new Date()) {
      return res.status(400).json({ error: 'veto window expired (24hrs)' })
    }

    // Reverse the roster swap
    const proposerIdx = league.teams.findIndex((t: any) => t.ownerHandle === trade.proposer.ownerHandle)
    const recipientIdx = league.teams.findIndex((t: any) => t.ownerHandle === trade.recipient.ownerHandle)
    const proposerRoster = [...league.teams[proposerIdx].roster]
    const recipientRoster = [...league.teams[recipientIdx].roster]

    // Move proposer's original players back from recipient
    for (const p of trade.proposer.players) {
      const idx = recipientRoster.findIndex((r: any) => r.playerId === p.playerId)
      if (idx !== -1) {
        const [removed] = recipientRoster.splice(idx, 1)
        proposerRoster.push(removed)
      }
    }
    // Move recipient's original players back from proposer
    for (const p of trade.recipient.players) {
      const idx = proposerRoster.findIndex((r: any) => r.playerId === p.playerId)
      if (idx !== -1) {
        const [removed] = proposerRoster.splice(idx, 1)
        recipientRoster.push(removed)
      }
    }

    await leagues.updateOne(
      { _id: new ObjectId(leagueId) },
      {
        $set: {
          [`teams.${proposerIdx}.roster`]: proposerRoster,
          [`teams.${recipientIdx}.roster`]: recipientRoster,
          'trades.$[t].status': 'vetoed',
          'trades.$[t].vetoedBy': myHandle,
          'trades.$[t].vetoReason': reason || 'Commissioner vetoed this trade',
          'trades.$[t].respondedAt': new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { arrayFilters: [{ 't.id': tradeId }] }
    )

    return res.status(200).json({ ok: true, status: 'vetoed' })
  }

  return res.status(400).json({ error: 'action must be propose, accept, reject, or veto' })
}
