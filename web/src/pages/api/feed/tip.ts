/**
 * POST /api/feed/tip
 *
 * Records an OGUN tip on a post AFTER the on-chain transfer has succeeded.
 * The actual transfer happens client-side via useBlockchainV2.sendOgun().
 * This endpoint just persists the tip for feed display + audit.
 *
 * Body: { postId, amount, txHash, fromAddress, toAddress }
 * Returns: { ok: true, totalTippedOgun, tipCount }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = await authFromRequest(req)
  if (!auth?.profileId) return res.status(401).json({ error: 'Login required' })

  const { postId, amount, txHash, fromAddress, toAddress } = req.body || {}

  if (!postId || !amount || !txHash || !fromAddress || !toAddress) {
    return res.status(400).json({ error: 'postId, amount, txHash, fromAddress, toAddress required' })
  }

  const amountNum = parseFloat(String(amount))
  if (!isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  let postOid: ObjectId
  try { postOid = new ObjectId(postId) } catch { return res.status(400).json({ error: 'Invalid postId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const post = await db.collection('posts').findOne(
      { _id: postOid },
      { projection: { profileId: 1, deleted: 1 } }
    )
    if (!post || post.deleted) return res.status(404).json({ error: 'Post not found' })

    // Reject self-tips — escrow protects but UX shouldn't permit it
    if (post.profileId && auth.profileId.equals(post.profileId)) {
      return res.status(400).json({ error: 'Cannot tip your own post' })
    }

    const now = new Date()

    // Idempotency: txHash is unique per tip. If already recorded, return current state.
    const existing = await db.collection('tips').findOne({ txHash })
    if (existing) {
      const post2 = await db.collection('posts').findOne(
        { _id: postOid },
        { projection: { totalTippedOgun: 1, tipCount: 1 } }
      )
      return res.status(200).json({
        ok: true,
        idempotent: true,
        totalTippedOgun: post2?.totalTippedOgun || 0,
        tipCount: post2?.tipCount || 0,
      })
    }

    await db.collection('tips').insertOne({
      postId: postOid,
      recipientProfileId: post.profileId,
      tipperProfileId: auth.profileId,
      amount: amountNum,
      txHash,
      fromAddress: String(fromAddress).toLowerCase(),
      toAddress: String(toAddress).toLowerCase(),
      createdAt: now,
    })

    const updated = await db.collection('posts').findOneAndUpdate(
      { _id: postOid },
      { $inc: { totalTippedOgun: amountNum, tipCount: 1 } },
      { returnDocument: 'after', projection: { totalTippedOgun: 1, tipCount: 1 } }
    )

    // Fire-and-forget: log activity so the tipper's followers see it
    db.collection('activities').insertOne({
      profileId: auth.profileId,
      type: 'TIPPED',
      postId: postOid,
      recipientProfileId: post.profileId,
      amount: amountNum,
      createdAt: now,
    }).catch(() => {})

    return res.status(200).json({
      ok: true,
      totalTippedOgun: updated?.value?.totalTippedOgun || amountNum,
      tipCount: updated?.value?.tipCount || 1,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
