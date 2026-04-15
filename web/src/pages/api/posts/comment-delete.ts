import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { commentId }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { commentId } = req.body || {}
  if (!commentId) return res.status(400).json({ error: 'commentId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const comment = await db.collection('comments').findOne({ _id: new ObjectId(commentId) })
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    if (comment.profileId?.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'Not your comment' })
    }

    // Soft delete
    await db.collection('comments').updateOne(
      { _id: new ObjectId(commentId) },
      { $set: { deleted: true, deletedAt: new Date() } },
    )

    // Decrement comment count on the post
    if (comment.postId) {
      await db.collection('posts').updateOne(
        { _id: comment.postId, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } },
      )
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
