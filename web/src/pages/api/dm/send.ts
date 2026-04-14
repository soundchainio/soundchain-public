import { trackEvent, logActivity } from 'lib/api/trackEvent'
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { toId, message }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { toId, message } = req.body || {}
  if (!toId || !message?.trim()) return res.status(400).json({ error: 'toId and message required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const toOid = new ObjectId(toId)
    const now = new Date()

    const doc: any = {
      fromId: auth.profileId,
      toId: toOid,
      message: String(message),
      read: false,
      createdAt: now,
      updatedAt: now,
    }
    const { insertedId } = await db.collection('messages').insertOne(doc)
    await db.collection('profiles').updateOne({ _id: toOid }, { $inc: { unreadMessageCount: 1 } })

    return res.status(200).json({
      message: {
        id: insertedId.toString(),
        fromId: auth.profileId.toString(),
        toId: toOid.toString(),
        message: doc.message,
        createdAt: now,
        read: false,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
