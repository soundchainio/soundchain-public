/**
 * Arena Game Picks API
 *
 * GET  /api/arena/picks — list picks (filterable by sport, status)
 * POST /api/arena/picks — create a new pick wager
 *
 * Query params:
 *   ?sport=nba|nhl|mlb|nfl — filter by sport
 *   ?status=open|matched|settled — filter by status
 *   ?mine=true — only my picks (requires auth)
 *   ?limit=20
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { GamePick, PickSport, SPORT_CONFIG } from 'lib/arena/picks/types'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const picks = db.collection('gamepicks')

  // GET — list picks
  if (req.method === 'GET') {
    const sport = req.query.sport as string
    const status = req.query.status as string
    const mine = req.query.mine === 'true'
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

    const filter: any = {}
    if (sport && SPORT_CONFIG[sport as PickSport]) filter.sport = sport
    if (status) filter.status = status
    if (mine) {
      const auth = await authFromRequest(req)
      if (!auth) return res.status(200).json({ picks: [] })
      const me = await db.collection('profiles').findOne({ _id: auth.profileId })
      const myHandle = me?.userHandle || ''
      filter.$or = [{ creatorHandle: myHandle }, { takerHandle: myHandle }]
    }

    const results = await picks.find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
    return res.status(200).json({
      picks: results.map(p => ({ ...p, id: p._id.toString(), _id: undefined })),
    })
  }

  // POST — create pick
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'auth required' })

  const me = await db.collection('profiles').findOne({ _id: auth.profileId })
  if (!me) return res.status(404).json({ error: 'profile not found' })
  const myHandle = me.userHandle || ''

  const { sport, espnGameId, pick, entryToken, entryFee } = req.body || {}

  if (!sport || !SPORT_CONFIG[sport as PickSport]) return res.status(400).json({ error: 'valid sport required (nba, nhl, mlb, nfl)' })
  if (!espnGameId) return res.status(400).json({ error: 'espnGameId required' })
  if (!pick || !['home', 'away'].includes(pick)) return res.status(400).json({ error: 'pick must be home or away' })
  if (!entryToken) return res.status(400).json({ error: 'entryToken required' })
  const fee = Number(entryFee)
  if (!Number.isFinite(fee) || fee <= 0) return res.status(400).json({ error: 'entryFee > 0 required' })

  // Fetch game data from ESPN to validate + populate
  const cfg = SPORT_CONFIG[sport as PickSport]
  try {
    const espnRes = await fetch(`${ESPN_BASE}/${cfg.espnSport}/${cfg.espnLeague}/scoreboard`)
    const espnData = await espnRes.json()
    const event = (espnData.events || []).find((e: any) => e.id === espnGameId)
    if (!event) return res.status(400).json({ error: 'game not found on ESPN scoreboard — may have already started or ended' })

    const comp = event.competitions?.[0]
    const state = comp?.status?.type?.state || 'pre'
    if (state !== 'pre') return res.status(400).json({ error: 'can only pick games that haven\'t started yet' })

    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')

    // Check for duplicate pick by same user on same game
    const existing = await picks.findOne({ espnGameId, creatorHandle: myHandle, status: { $in: ['open', 'matched'] } })
    if (existing) return res.status(400).json({ error: 'you already have a pick on this game' })

    const now = new Date()
    const gameTime = comp?.date || event.date || now.toISOString()

    const doc: GamePick = {
      sport: sport as PickSport,
      espnGameId,
      homeTeam: home?.team?.abbreviation || '?',
      awayTeam: away?.team?.abbreviation || '?',
      homeTeamFull: home?.team?.displayName || home?.team?.shortDisplayName || '?',
      awayTeamFull: away?.team?.displayName || away?.team?.shortDisplayName || '?',
      homeLogo: home?.team?.logo || '',
      awayLogo: away?.team?.logo || '',
      gameTime,
      gameStatus: 'pre',
      creatorHandle: myHandle,
      creatorProfileId: auth.profileId.toString(),
      creatorPick: pick,
      entryToken,
      entryFee: fee,
      pot: 0, // pot fills when taker joins
      platformFeeBps: 500, // 5%
      status: 'open',
      createdAt: now.toISOString(),
      expiresAt: gameTime, // expires at game start if not matched
    }

    const { insertedId } = await picks.insertOne(doc as any)
    return res.status(201).json({ pick: { ...doc, id: insertedId.toString() } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
