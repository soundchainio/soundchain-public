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

    const takerPick = pick.creatorPick === 'home' ? 'away' : 'home'
    const now = new Date().toISOString()

    await picks.updateOne({ _id: pick._id }, {
      $set: {
        takerHandle: myHandle,
        takerProfileId: auth.profileId.toString(),
        takerPick,
        pot: pick.entryFee * 2,
        status: 'matched',
        matchedAt: now,
      },
    })

    return res.status(200).json({ ok: true, status: 'matched', yourPick: takerPick })
  }

  // ─── CANCEL (creator only, before matched) ──────────────
  if (action === 'cancel') {
    if (pick.creatorHandle !== myHandle) return res.status(403).json({ error: 'only creator can cancel' })
    if (pick.status !== 'open') return res.status(400).json({ error: 'can only cancel open picks' })

    await picks.updateOne({ _id: pick._id }, { $set: { status: 'cancelled' } })
    return res.status(200).json({ ok: true, status: 'cancelled' })
  }

  return res.status(400).json({ error: 'action must be take or cancel' })
}
