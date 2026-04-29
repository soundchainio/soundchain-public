/**
 * Arena Game Pick Actions
 *
 * GET  /api/arena/picks/[id] — get pick detail
 * POST /api/arena/picks/[id] — deposit (creator finalize), take (taker join + server lock), cancel, edit
 *
 * Actions:
 *   deposit — creator submits the join() txHash after server-created league. Flips pending_deposit → open.
 *   take    — taker submits the join() txHash. Server then signs lock() and flips open → matched.
 *   cancel  — creator cancels before matched. If creator already deposited, server signs cancel() to refund on-chain.
 *   edit    — creator edits wager amount (only allowed pre-deposit, i.e. status='pending_deposit'). On-chain entryFee is immutable post-create.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { ethers } from 'ethers'
import {
  escrowHasJoined,
  escrowGetLeague,
  escrowLockPick,
  escrowCancelPick,
} from 'lib/arena/picks/escrowServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pickId = req.query.id as string
  if (!pickId) return res.status(400).json({ error: 'pick id required' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const picks = db.collection('gamepicks')

  let pick: any
  try {
    pick = await picks.findOne({ _id: new ObjectId(pickId) })
  } catch { return res.status(400).json({ error: 'invalid id' }) }
  if (!pick) return res.status(404).json({ error: 'pick not found' })

  // GET — detail
  if (req.method === 'GET') {
    return res.status(200).json({ pick: { ...pick, id: pick._id.toString(), _id: undefined } })
  }

  // POST — actions
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'auth required' })

  const me = await db.collection('profiles').findOne({ _id: auth.profileId })
  if (!me) return res.status(404).json({ error: 'profile not found' })
  const myHandle = me.userHandle || ''

  const { action } = req.body || {}

  // ─── DEPOSIT (creator finalizes their on-chain join) ─────────────────────
  if (action === 'deposit') {
    if (pick.creatorHandle !== myHandle && pick.creatorProfileId !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'only creator can finalize their own deposit' })
    }
    if (pick.status !== 'pending_deposit') return res.status(400).json({ error: 'pick is not awaiting creator deposit' })
    if (!pick.escrowLeagueId) return res.status(500).json({ error: 'pick has no escrow leagueId — internal error' })

    const { txHash, walletAddress } = req.body || {}
    if (!txHash || !walletAddress) return res.status(400).json({ error: 'txHash and walletAddress required' })
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return res.status(400).json({ error: 'invalid txHash format' })
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) return res.status(400).json({ error: 'invalid wallet address' })

    // Verify the wallet is now a member of the league on-chain
    try {
      const joined = await escrowHasJoined(pick.escrowLeagueId, walletAddress)
      if (!joined) return res.status(400).json({ error: 'on-chain escrow does not show your wallet as joined yet — wait a few seconds for confirmation and retry' })
    } catch (err: any) {
      return res.status(502).json({ error: `could not verify on-chain join: ${err?.message || 'rpc failed'}` })
    }

    await picks.updateOne({ _id: pick._id }, {
      $set: {
        status: 'open',
        creatorWalletAddress: walletAddress.toLowerCase(),
        creatorDepositTxHash: txHash,
      },
    })
    return res.status(200).json({ ok: true, status: 'open', txHash })
  }

  // ─── TAKE (taker submits their on-chain join → server locks) ─────────────
  if (action === 'take') {
    if (pick.status !== 'open') return res.status(400).json({ error: 'pick is not open' })
    if (pick.creatorHandle === myHandle || pick.creatorProfileId === auth.profileId.toString()) {
      return res.status(400).json({
        error: 'cannot take your own pick — use a different account (incognito or second device)',
        debug: { creatorHandle: pick.creatorHandle, yourHandle: myHandle, creatorProfileId: pick.creatorProfileId, yourProfileId: auth.profileId.toString() },
      })
    }
    if (new Date(pick.expiresAt) < new Date()) {
      await picks.updateOne({ _id: pick._id }, { $set: { status: 'expired' } })
      return res.status(400).json({ error: 'game has started — pick expired' })
    }
    if (!pick.escrowLeagueId) return res.status(500).json({ error: 'pick has no escrow leagueId — internal error' })

    const { txHash, walletAddress } = req.body || {}
    if (!txHash || !walletAddress) return res.status(400).json({ error: 'wallet required — sign the on-chain stake transaction in your wallet to take this pick' })
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return res.status(400).json({ error: 'invalid txHash format' })
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) return res.status(400).json({ error: 'invalid wallet address' })
    if (walletAddress.toLowerCase() === (pick.creatorWalletAddress || '').toLowerCase()) {
      return res.status(400).json({ error: 'taker wallet must differ from creator wallet' })
    }

    // Verify taker is now a member on-chain
    try {
      const joined = await escrowHasJoined(pick.escrowLeagueId, walletAddress)
      if (!joined) return res.status(400).json({ error: 'on-chain escrow does not show your wallet as joined yet — wait a few seconds for confirmation and retry' })
    } catch (err: any) {
      return res.status(502).json({ error: `could not verify on-chain join: ${err?.message || 'rpc failed'}` })
    }

    // Verify the league now has both members and is still Open before we lock
    let lockTxHash: string
    try {
      const league = await escrowGetLeague(pick.escrowLeagueId)
      if (league.status !== 0) return res.status(400).json({ error: 'on-chain league is not open — may already be locked or settled' })
      if (league.joinedTeams < 2) return res.status(400).json({ error: 'on-chain league only has one member — wait for taker join confirmation' })
      lockTxHash = await escrowLockPick(pick.escrowLeagueId)
    } catch (err: any) {
      return res.status(502).json({ error: `failed to lock on-chain league: ${err?.message || 'unknown'}` })
    }

    const dup = await picks.findOne({ takerDepositTxHash: txHash })
    if (dup) return res.status(400).json({ error: 'this transaction has already been used to take a pick' })

    const takerPick = pick.creatorPick === 'home' ? 'away' : 'home'
    const now = new Date().toISOString()

    await picks.updateOne({ _id: pick._id }, {
      $set: {
        takerHandle: myHandle,
        takerProfileId: auth.profileId.toString(),
        takerAvatarUrl: me.profilePicture || null,
        takerPick,
        takerWalletAddress: walletAddress.toLowerCase(),
        takerDepositTxHash: txHash,
        takerSignedAt: now,
        pot: pick.entryFee * 2,
        status: 'matched',
        matchedAt: now,
        escrowLockTxHash: lockTxHash,
      },
    })

    return res.status(200).json({ ok: true, status: 'matched', yourPick: takerPick, takerDepositTxHash: txHash, escrowLockTxHash: lockTxHash })
  }

  // ─── CANCEL (creator only, before matched) ──────────────
  if (action === 'cancel') {
    if (pick.creatorHandle !== myHandle) return res.status(403).json({ error: 'only creator can cancel' })
    if (pick.status !== 'pending_deposit' && pick.status !== 'open') {
      return res.status(400).json({ error: 'can only cancel pending or open picks' })
    }

    const update: any = { status: 'cancelled' }
    // If creator already deposited (status='open'), refund on-chain via escrow.cancel
    if (pick.status === 'open' && pick.escrowLeagueId) {
      try {
        const cancelTxHash = await escrowCancelPick(pick.escrowLeagueId)
        update.escrowCancelTxHash = cancelTxHash
      } catch (err: any) {
        return res.status(502).json({ error: `on-chain refund failed: ${err?.message || 'unknown'} — pick remains open, retry shortly.` })
      }
    }

    await picks.updateOne({ _id: pick._id }, { $set: update })
    return res.status(200).json({ ok: true, status: 'cancelled', refundTxHash: update.escrowCancelTxHash })
  }

  // ─── EDIT (creator only, pre-deposit — wager amount/token only) ────────
  if (action === 'edit') {
    if (pick.creatorHandle !== myHandle) return res.status(403).json({ error: 'only creator can edit' })
    if (pick.status !== 'pending_deposit') {
      return res.status(400).json({ error: 'on-chain entry fee is immutable post-deposit. Cancel the pick (refunds your stake) and create a new one.' })
    }

    const { entryToken, entryFee } = req.body || {}
    const update: any = {}
    const NATIVE_TOKEN_SYMBOLS = new Set(['POL', 'MATIC'])

    if (entryToken !== undefined) {
      const { TOKEN_CONFIG, isTokenLive } = await import('lib/arena/fantasy/types')
      if (!isTokenLive(entryToken)) return res.status(400).json({ error: `${entryToken} not yet supported` })
      if (!TOKEN_CONFIG[entryToken]) return res.status(400).json({ error: `unknown token ${entryToken}` })
      update.entryToken = entryToken
      update.ogunBonusBps = entryToken === 'OGUN' ? 1000 : 0
    }
    if (entryFee !== undefined) {
      const fee = Number(entryFee)
      if (!Number.isFinite(fee) || fee <= 0) return res.status(400).json({ error: 'entryFee > 0 required' })
      update.entryFee = fee
    }

    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'no fields to edit (entryToken or entryFee)' })

    // Editing pre-deposit means we have an unused on-chain league with the OLD entryFee.
    // Cancel the stale on-chain league (no members → no refunds emitted) so it doesn't dangle in Open status.
    if (pick.escrowLeagueId) {
      try {
        const cancelTxHash = await escrowCancelPick(pick.escrowLeagueId)
        update.escrowCancelTxHash = cancelTxHash
      } catch {
        // Non-fatal — old league sits Open with no members forever, harmless. Surface soft warning.
      }
    }

    // Spin up a new on-chain league with the updated wager (token + fee aware).
    const { escrowCreatePick } = await import('lib/arena/picks/escrowServer')
    const { TOKEN_CONFIG } = await import('lib/arena/fantasy/types')
    const { NATIVE_TOKEN, isNativeToken } = await import('lib/arena/picks/contract')
    const newToken: string = update.entryToken ?? pick.entryToken
    const newFee: number = update.entryFee ?? pick.entryFee
    const newTokenInfo = TOKEN_CONFIG[newToken]
    if (!newTokenInfo) return res.status(400).json({ error: `unknown token ${newToken}` })
    const newTokenAddress = NATIVE_TOKEN_SYMBOLS.has(newToken) ? NATIVE_TOKEN : newTokenInfo.address
    if (!isNativeToken(newTokenAddress) && !/^0x[0-9a-fA-F]{40}$/.test(newTokenAddress)) {
      return res.status(400).json({ error: `${newToken} has no Polygon address configured` })
    }
    let newWei: ethers.BigNumber
    try {
      newWei = ethers.utils.parseUnits(String(newFee), newTokenInfo.decimals)
    } catch (err: any) {
      return res.status(400).json({ error: `invalid entryFee for ${newToken}: ${err?.message || 'parse failed'}` })
    }
    try {
      const result = await escrowCreatePick(newTokenAddress, newWei)
      update.escrowLeagueId = result.leagueId
      update.escrowCreateTxHash = result.txHash
      // Re-record platformFeeBps in case the contract default was bumped between
      // the original create and this edit — keeps the pick doc in sync with the
      // on-chain rate that will actually settle this pick.
      update.platformFeeBps = result.platformFeeBps
    } catch (err: any) {
      return res.status(502).json({ error: `could not re-create on-chain league: ${err?.message || 'unknown'}` })
    }

    await picks.updateOne({ _id: pick._id }, { $set: update })
    return res.status(200).json({ ok: true, updated: update })
  }

  return res.status(400).json({ error: 'action must be deposit, take, cancel, or edit' })
}
