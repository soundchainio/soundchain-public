import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { trackEvent, logActivity } from 'lib/api/trackEvent'

// POST { postId, type, action: 'add' | 'change' | 'remove' }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { postId, type, action } = req.body || {}
  if (!postId || !action) return res.status(400).json({ error: 'postId and action required' })
  if ((action === 'add' || action === 'change') && !type) return res.status(400).json({ error: 'type required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const postOid = new ObjectId(postId)
    const reactions = db.collection('reactions')
    const posts = db.collection('posts')

    if (action === 'remove') {
      const existing = await reactions.findOne({ postId: postOid, profileId: auth.profileId })
      if (existing) await reactions.deleteOne({ _id: existing._id })
      const oldType = existing?.type
      if (oldType) {
        await posts.updateOne(
          { _id: postOid, [`reactionStats.${oldType}`]: { $gt: 0 } },
          { $inc: { [`reactionStats.${oldType}`]: -1 } },
        )
      }
      return res.status(200).json({ ok: true, action: 'removed' })
    }

    const existing = await reactions.findOne({ postId: postOid, profileId: auth.profileId })

    if (action === 'add') {
      if (existing) return res.status(409).json({ error: 'Already reacted' })
      const now = new Date()
      await reactions.insertOne({ postId: postOid, profileId: auth.profileId, type, createdAt: now, updatedAt: now })
      await posts.updateOne({ _id: postOid }, { $inc: { [`reactionStats.${type}`]: 1 } })
      trackEvent('post_like', { postId, type }, auth.userId)
      logActivity(auth.profileId, 'LIKED', postOid, { reactionType: type })
      return res.status(200).json({ ok: true, action: 'added', type })
    }

    if (action === 'change') {
      if (!existing) return res.status(404).json({ error: 'No existing reaction' })
      const oldType = existing.type
      await reactions.updateOne({ _id: existing._id }, { $set: { type, updatedAt: new Date() } })
      await posts.updateOne(
        { _id: postOid, [`reactionStats.${oldType}`]: { $gt: 0 } },
        { $inc: { [`reactionStats.${oldType}`]: -1, [`reactionStats.${type}`]: 1 } },
      )
      return res.status(200).json({ ok: true, action: 'changed', oldType, type })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
