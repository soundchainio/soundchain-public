import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { targetProfileId, action: 'subscribe' | 'unsubscribe' }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { targetProfileId, action } = req.body || {}
  if (!targetProfileId || !['subscribe', 'unsubscribe'].includes(action)) {
    return res.status(400).json({ error: 'targetProfileId + action (subscribe/unsubscribe) required' })
  }
  const targetOid = new ObjectId(targetProfileId)
  if (targetOid.equals(auth.profileId)) return res.status(400).json({ error: 'Cannot subscribe to self' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const subs = db.collection('subscriptions')

    if (action === 'subscribe') {
      const existing = await subs.findOne({ subscriberId: auth.profileId, subscribedToId: targetOid })
      if (existing) return res.status(200).json({ ok: true, action: 'already_subscribed' })
      const now = new Date()
      await subs.insertOne({
        subscriberId: auth.profileId,
        subscribedToId: targetOid,
        createdAt: now,
        updatedAt: now,
      })
      return res.status(200).json({ ok: true, action: 'subscribed' })
    }

    const deleted = await subs.deleteOne({ subscriberId: auth.profileId, subscribedToId: targetOid })
    return res.status(200).json({ ok: true, action: 'unsubscribed', removed: deleted.deletedCount })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
