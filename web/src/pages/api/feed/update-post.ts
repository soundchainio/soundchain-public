/**
 * POST /api/feed/update-post — Vercel-direct (Phase 7f.6)
 * Body: { postId, body?, mediaLink? }
 * Author-only edit. Returns updated { post }.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { postId, body, mediaLink } = req.body || {}
  if (!postId) return res.status(400).json({ error: 'postId required' })
  let postOid: ObjectId
  try { postOid = new ObjectId(postId) } catch { return res.status(400).json({ error: 'Invalid postId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const update: any = { updatedAt: new Date() }
    if (typeof body === 'string') update.body = String(body).slice(0, 5000)
    if (typeof mediaLink === 'string') update.mediaLink = mediaLink
    const result = await db.collection('posts').updateOne(
      { _id: postOid, profileId: auth.profileId },
      { $set: update }
    )
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Post not found or not yours' })
    const post: any = await db.collection('posts').findOne({ _id: postOid })
    return res.status(200).json({ post: { id: post._id.toString(), body: post.body || '' } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
