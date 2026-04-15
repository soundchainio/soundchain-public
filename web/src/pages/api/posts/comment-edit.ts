import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { commentId, body }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { commentId, body } = req.body || {}
  if (!commentId || !body) return res.status(400).json({ error: 'commentId and body required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const comment = await db.collection('comments').findOne({ _id: new ObjectId(commentId) })
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    if (comment.profileId?.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'Not your comment' })
    }

    await db.collection('comments').updateOne(
      { _id: new ObjectId(commentId) },
      { $set: { body, updatedAt: new Date() } },
    )
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
