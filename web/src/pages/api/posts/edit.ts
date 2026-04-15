import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { postId, body?, mediaLink? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { postId, body, mediaLink } = req.body || {}
  if (!postId) return res.status(400).json({ error: 'postId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) })
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.profileId?.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'Not your post' })
    }

    const update: any = { updatedAt: new Date() }
    if (body !== undefined) update.body = body
    if (mediaLink !== undefined) update.mediaLink = mediaLink

    await db.collection('posts').updateOne({ _id: new ObjectId(postId) }, { $set: update })
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
