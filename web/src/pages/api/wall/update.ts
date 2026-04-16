import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { wallPostId, body } — only the author can edit their own post body
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { wallPostId, body } = req.body || {}
  if (!wallPostId || !body?.trim()) return res.status(400).json({ error: 'wallPostId and body required' })

  let oid: ObjectId
  try { oid = new ObjectId(wallPostId) } catch { return res.status(400).json({ error: 'Invalid wallPostId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const post = await db.collection('wallposts').findOne({ _id: oid }, { projection: { authorProfileId: 1 } })
    if (!post) return res.status(404).json({ error: 'Not found' })
    if (post.authorProfileId?.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'Only the author can edit' })
    }

    const trimmed = String(body).substring(0, 1000)
    await db.collection('wallposts').updateOne(
      { _id: oid },
      { $set: { body: trimmed, updatedAt: new Date() } },
    )
    return res.status(200).json({ id: wallPostId, body: trimmed })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
