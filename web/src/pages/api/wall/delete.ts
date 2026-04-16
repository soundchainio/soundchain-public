import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { wallPostId } = req.body || {}
  if (!wallPostId) return res.status(400).json({ error: 'wallPostId required' })

  let oid: ObjectId
  try { oid = new ObjectId(wallPostId) } catch { return res.status(400).json({ error: 'Invalid wallPostId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const post = await db.collection('wallposts').findOne({ _id: oid }, { projection: { authorProfileId: 1, profileId: 1 } })
    if (!post) return res.status(404).json({ error: 'Not found' })

    const mine = auth.profileId.toString()
    const isAuthor = post.authorProfileId?.toString() === mine
    const isWallOwner = post.profileId?.toString() === mine
    if (!isAuthor && !isWallOwner) return res.status(403).json({ error: 'Not allowed' })

    await db.collection('wallposts').updateOne(
      { _id: oid },
      { $set: { deleted: true, updatedAt: new Date() } },
    )
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
