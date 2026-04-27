/**
 * Arena Game Pick Actions
 *
 * GET  /api/arena/picks/[id] — get pick detail
 * POST /api/arena/picks/[id] — take (match), cancel
 *
 * Actions:
 *   take   — take the other side of the wager
 *   cancel — creator cancels before matched
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { ethers } from 'ethers'

const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com'
const TREASURY = '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b'
const MIN_FEE_WEI = ethers.BigNumber.from('500000000000000') // 0.0005 POL — floor below frontend's 0.001 min, allows for rounding

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

  // ─── TAKE (match the wager) ─────────────────────────────
  if (action === 'take') {
    if (pick.status !== 'open') return res.status(400).json({ error: 'pick is not open' })
    if (pick.creatorHandle === myHandle || pick.creatorProfileId === auth.profileId.toString()) {
      return res.status(400).json({
        error: 'cannot take your own pick — use a different account (incognito or second device)',
        debug: { creatorHandle: pick.creatorHandle, yourHandle: myHandle, creatorProfileId: pick.creatorProfileId, yourProfileId: auth.profileId.toString() },
      })
    }

    // Check game hasn't started
    if (new Date(pick.expiresAt) < new Date()) {
      await picks.updateOne({ _id: pick._id }, { $set: { status: 'expired' } })
      return res.status(400).json({ error: 'game has started — pick expired' })
    }

    // Wallet + on-chain platform fee verification — applies to every take
    const { txHash, walletAddress } = req.body || {}
    if (!txHash || !walletAddress) {
      return res.status(400).json({ error: 'wallet required — sign the platform fee transaction in your wallet to take this pick' })
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return res.status(400).json({ error: 'invalid txHash format' })
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) return res.status(400).json({ error: 'invalid wallet address' })

    let onchainTx
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
      onchainTx = await provider.getTransaction(txHash)
    } catch {
      return res.status(502).json({ error: 'failed to reach Polygon — please retry' })
    }
    if (!onchainTx) return res.status(400).json({ error: 'transaction not found on Polygon yet — wait a few seconds and retry' })
    if ((onchainTx.from || '').toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'transaction sender does not match the wallet you signed with' })
    }
    if ((onchainTx.to || '').toLowerCase() !== TREASURY.toLowerCase()) {
      return res.status(400).json({ error: 'platform fee must be sent to SoundChain treasury' })
    }
    if (onchainTx.value.lt(MIN_FEE_WEI)) {
      return res.status(400).json({ error: 'platform fee below 0.0005 POL minimum' })
    }
    if (onchainTx.chainId !== 137) {
      return res.status(400).json({ error: 'platform fee must be on Polygon mainnet' })
    }

    const dup = await picks.findOne({ takerTxHash: txHash })
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
        takerTxHash: txHash,
        takerFeePaidWei: onchainTx.value.toString(),
        pot: pick.entryFee * 2,
        status: 'matched',
        matchedAt: now,
      },
    })

    return res.status(200).json({ ok: true, status: 'matched', yourPick: takerPick, txHash, fee: ethers.utils.formatEther(onchainTx.value) + ' POL' })
  }

  // ─── CANCEL (creator only, before matched) ──────────────
  if (action === 'cancel') {
    if (pick.creatorHandle !== myHandle) return res.status(403).json({ error: 'only creator can cancel' })
    if (pick.status !== 'open') return res.status(400).json({ error: 'can only cancel open picks' })

    await picks.updateOne({ _id: pick._id }, { $set: { status: 'cancelled' } })
    return res.status(200).json({ ok: true, status: 'cancelled' })
  }

  // ─── EDIT (creator only, before matched — wager only, team is locked) ────────
  if (action === 'edit') {
    if (pick.creatorHandle !== myHandle) return res.status(403).json({ error: 'only creator can edit' })
    if (pick.status !== 'open') return res.status(400).json({ error: 'can only edit open picks' })
    if (pick.takerHandle) return res.status(400).json({ error: 'pick already taken — cannot edit' })

    const { entryToken, entryFee } = req.body || {}
    const update: any = {}

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

    await picks.updateOne({ _id: pick._id }, { $set: update })
    return res.status(200).json({ ok: true, updated: update })
  }

  return res.status(400).json({ error: 'action must be take, cancel, or edit' })
}
