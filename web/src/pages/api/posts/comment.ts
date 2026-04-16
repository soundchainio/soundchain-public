import { trackEvent, logActivity } from 'lib/api/trackEvent'
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { postId, body, replyToId? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { postId, body, replyToId } = req.body || {}
  if (!postId || !body?.trim()) return res.status(400).json({ error: 'postId and body required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const postOid = new ObjectId(postId)
    const now = new Date()

    const post = await db.collection('posts').findOne({ _id: postOid }, { projection: { _id: 1 } })
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const doc: any = {
      postId: postOid,
      profileId: auth.profileId,
      body: String(body),
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }
    if (replyToId) doc.replyToId = new ObjectId(replyToId)
    const { insertedId } = await db.collection('comments').insertOne(doc)
    await db.collection('posts').updateOne({ _id: postOid }, { $inc: { commentCount: 1 } })
    trackEvent('post_comment', { postId, commentId: insertedId.toString() }, auth.userId)
    logActivity(auth.profileId, 'COMMENTED', postOid)

    const author = await db.collection('profiles').findOne(
      { _id: auth.profileId },
      { projection: { displayName: 1, userHandle: 1, profilePicture: 1 } },
    )

    return res.status(200).json({
      comment: {
        id: insertedId.toString(),
        body: doc.body,
        createdAt: now,
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          userHandle: author.userHandle,
          profilePicture: author.profilePicture,
        } : null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
