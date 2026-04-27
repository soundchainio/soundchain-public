/**
 * Arena Game Picks API
 *
 * GET  /api/arena/picks — list picks (filterable by sport, status)
 * POST /api/arena/picks — create a new pick wager (server-side createLeague on FantasyLeagueEscrow)
 *
 * Create flow:
 *   1. Validate pick + game data
 *   2. Server (commissioner key) signs createLeague(NATIVE_TOKEN, entryFeeWei, 2, 9995, 0, 0)
 *   3. Insert MongoDB doc with status='pending_deposit', escrowLeagueId, escrowCreateTxHash
 *   4. Frontend receives leagueId + entryFeeWei → signs escrow.join(leagueId) with creator wallet
 *   5. Frontend posts back via /api/arena/picks/[id] action='deposit' to flip status='open'
 *
 * v1 supports POL-only wagers. ERC-20 (OGUN, USDC) will land once approve()+join() UX is wired.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { GamePick, PickSport, SPORT_CONFIG } from 'lib/arena/picks/types'
import { TOKEN_CONFIG, isTokenLive } from 'lib/arena/fantasy/types'
import { escrowCreatePick } from 'lib/arena/picks/escrowServer'
import { PICKS_ESCROW_ADDRESS, PICK_PLATFORM_BPS } from 'lib/arena/picks/contract'

const OGUN_BONUS_BPS = 1000  // 10% OGUN bonus to winner when wager is in OGUN — paid from rewards pool on settle (deferred until ERC-20 path lands)

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

// v1: native POL only. Adding ERC-20 requires approve()+join() bundling on the client.
const NATIVE_WAGER_TOKENS = new Set(['POL', 'MATIC'])

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
    if (status) {
      filter.status = status
    } else if (!mine) {
      // Default list view: hide pending_deposit picks (creator hasn't actually committed funds yet)
      filter.status = { $ne: 'pending_deposit' }
    }
    if (mine) {
      const auth = await authFromRequest(req)
      if (!auth) return res.status(200).json({ picks: [] })
      const me = await db.collection('profiles').findOne({ _id: auth.profileId })
      const myHandle = me?.userHandle || ''
      filter.$or = [{ creatorHandle: myHandle }, { takerHandle: myHandle }]
    }

    const results = await picks.find(filter).sort({ createdAt: -1 }).limit(limit).toArray()

    // Hydrate avatars — denormalized field on the doc, falls back to profile lookup so existing picks (no denorm) still get an avatar
    const handlesNeedingHydration = new Set<string>()
    for (const p of results) {
      if (p.creatorHandle && !p.creatorAvatarUrl) handlesNeedingHydration.add(p.creatorHandle)
      if (p.takerHandle && !p.takerAvatarUrl) handlesNeedingHydration.add(p.takerHandle)
    }
    const avatarMap = new Map<string, string | null>()
    if (handlesNeedingHydration.size > 0) {
      const profs = await db.collection('profiles')
        .find({ userHandle: { $in: Array.from(handlesNeedingHydration) } })
        .project({ userHandle: 1, profilePicture: 1 })
        .toArray()
      for (const pr of profs) avatarMap.set(pr.userHandle, pr.profilePicture || null)
    }

    return res.status(200).json({
      picks: results.map(p => ({
        ...p,
        id: p._id.toString(),
        _id: undefined,
        creatorAvatarUrl: p.creatorAvatarUrl || (p.creatorHandle ? avatarMap.get(p.creatorHandle) : null) || null,
        takerAvatarUrl: p.takerAvatarUrl || (p.takerHandle ? avatarMap.get(p.takerHandle) : null) || null,
      })),
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
  if (!isTokenLive(entryToken)) {
    return res.status(400).json({
      error: `${entryToken} not yet supported — pick from live tokens (OGUN, POL, USDC, USDT, WETH, LINK, AVAX). Cross-chain tokens unlock when SoundchainPicksEscrow deploys to ZetaChain.`,
    })
  }
  if (!TOKEN_CONFIG[entryToken]) return res.status(400).json({ error: `unknown token ${entryToken}` })
  if (!NATIVE_WAGER_TOKENS.has(entryToken)) {
    return res.status(400).json({ error: 'On-chain picks v1 supports POL wagers only — ERC-20 (OGUN, USDC, etc.) ships next once approve()+join() flow is wired.' })
  }
  const fee = Number(entryFee)
  if (!Number.isFinite(fee) || fee <= 0) return res.status(400).json({ error: 'entryFee > 0 required' })

  // Fetch game data from ESPN to validate + populate
  const cfg = SPORT_CONFIG[sport as PickSport]
  let event: any
  try {
    const espnRes = await fetch(`${ESPN_BASE}/${cfg.espnSport}/${cfg.espnLeague}/scoreboard`)
    const espnData = await espnRes.json()
    event = (espnData.events || []).find((e: any) => e.id === espnGameId)
    if (!event) return res.status(400).json({ error: 'game not found on ESPN scoreboard — may have already started or ended' })
  } catch (err: any) {
    return res.status(502).json({ error: 'ESPN unreachable — please retry' })
  }

  const comp = event.competitions?.[0]
  const state = comp?.status?.type?.state || 'pre'
  if (state !== 'pre') return res.status(400).json({ error: 'can only pick games that haven\'t started yet' })

  const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
  const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')

  // Check for duplicate pick by same user on same game
  const existing = await picks.findOne({
    espnGameId,
    creatorHandle: myHandle,
    status: { $in: ['pending_deposit', 'open', 'matched'] },
  })
  if (existing) return res.status(400).json({ error: 'you already have a pick on this game' })

  // Server signs createLeague on FantasyLeagueEscrow with commissioner key.
  // entryFee is in whole POL units (e.g. 100); convert to wei for the contract.
  const entryFeeWei = ethers.utils.parseEther(String(fee))
  let leagueId: string
  let escrowCreateTxHash: string
  try {
    const result = await escrowCreatePick(entryFeeWei)
    leagueId = result.leagueId
    escrowCreateTxHash = result.txHash
  } catch (err: any) {
    const msg = err?.reason || err?.message || 'unknown'
    return res.status(502).json({
      error: `Could not create on-chain escrow league: ${msg}. Ensure commissioner wallet is funded with POL for gas.`,
    })
  }

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
    creatorAvatarUrl: me.profilePicture || null,
    creatorPick: pick,
    entryToken,
    entryFee: fee,
    pot: 0,
    platformFeeBps: PICK_PLATFORM_BPS,
    ogunBonusBps: entryToken === 'OGUN' ? OGUN_BONUS_BPS : 0,
    status: 'pending_deposit',  // creator must still call escrow.join with their wallet
    createdAt: now.toISOString(),
    expiresAt: gameTime,
    escrowContractAddress: PICKS_ESCROW_ADDRESS,
    escrowLeagueId: leagueId,
    escrowCreateTxHash,
  }

  const { insertedId } = await picks.insertOne(doc as any)
  return res.status(201).json({
    pick: { ...doc, id: insertedId.toString() },
    requiresDeposit: {
      escrowAddress: PICKS_ESCROW_ADDRESS,
      leagueId,
      entryFeeWei: entryFeeWei.toString(),
      chainId: 137,
    },
  })
}
