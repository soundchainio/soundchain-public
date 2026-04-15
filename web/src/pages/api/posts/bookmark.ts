import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { postId, action: 'add' | 'remove' }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { postId, action } = req.body || {}
  if (!postId || !action) return res.status(400).json({ error: 'postId and action required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    if (action === 'add') {
      await db.collection('bookmarks').updateOne(
        { profileId: auth.profileId, postId: new ObjectId(postId) },
        { $setOnInsert: { profileId: auth.profileId, postId: new ObjectId(postId), createdAt: new Date() } },
        { upsert: true },
      )
    } else if (action === 'remove') {
      await db.collection('bookmarks').deleteOne({ profileId: auth.profileId, postId: new ObjectId(postId) })
    }

    return res.status(200).json({ ok: true, action })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
