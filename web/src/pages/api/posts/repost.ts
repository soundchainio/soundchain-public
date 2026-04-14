import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { repostId, body? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { repostId, body } = req.body || {}
  if (!repostId) return res.status(400).json({ error: 'repostId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()
    const repostOid = new ObjectId(repostId)

    const doc: any = {
      profileId: auth.profileId,
      repostId: repostOid,
      body: body ? String(body) : '',
      commentCount: 0,
      repostCount: 0,
      totalReactions: 0,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }
    const { insertedId } = await db.collection('posts').insertOne(doc)
    await db.collection('posts').updateOne({ _id: repostOid }, { $inc: { repostCount: 1 } })

    // Fan out feed items: self + followers
    const followers = await db.collection('follows')
      .find({ followedId: auth.profileId })
      .project({ followerId: 1 })
      .toArray()

    const feedItems = [
      { profileId: auth.profileId, postId: insertedId, postedAt: now, createdAt: now, updatedAt: now },
      ...followers.map(f => ({
        profileId: f.followerId,
        postId: insertedId,
        postedAt: now,
        createdAt: now,
        updatedAt: now,
      })),
    ]
    if (feedItems.length > 0) {
      await db.collection('feeditems').insertMany(feedItems, { ordered: false }).catch(() => {})
    }

    return res.status(200).json({ post: { id: insertedId.toString(), createdAt: now } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
