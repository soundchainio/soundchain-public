/**
 * POST /api/feed/repost — Vercel-direct (Phase 7f.6)
 * Body: { repostId, body? }
 * Creates a repost — new post with repostId field, increments original
 * post's repostCount.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { repostId, body } = req.body || {}
  if (!repostId) return res.status(400).json({ error: 'repostId required' })
  let originalOid: ObjectId
  try { originalOid = new ObjectId(repostId) } catch { return res.status(400).json({ error: 'Invalid repostId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()
    const doc = {
      profileId: auth.profileId,
      body: typeof body === 'string' ? String(body).slice(0, 5000) : '',
      repostId: originalOid,
      reactionStats: {},
      totalReactions: 0,
      commentCount: 0,
      repostCount: 0,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }
    const result = await db.collection('posts').insertOne(doc)
    await db.collection('posts').updateOne({ _id: originalOid }, { $inc: { repostCount: 1 } })
    const original: any = await db.collection('posts').findOne({ _id: originalOid }, { projection: { repostCount: 1 } as any })
    return res.status(200).json({
      post: { id: result.insertedId.toString() },
      originalPost: { id: originalOid.toString(), repostCount: original?.repostCount || 1 },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
