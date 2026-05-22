/**
 * GET /api/comments/get?id=<commentId> — Vercel-direct (Phase 7e)
 * Returns single comment by id w/ author profile hydration.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'id required' })
  let oid: ObjectId
  try { oid = new ObjectId(id) } catch { return res.status(400).json({ error: 'Invalid id' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const c: any = await db.collection('comments').findOne({ _id: oid })
    if (!c) return res.status(404).json({ error: 'Not found' })

    let author: any = null
    if (c.profileId) {
      author = await db.collection('profiles')
        .findOne({ _id: c.profileId }, { projection: { displayName: 1, profilePicture: 1, userHandle: 1, verified: 1, teamMember: 1, badges: 1 } as any })
    }

    return res.status(200).json({
      comment: {
        id: c._id.toString(),
        body: c.body || '',
        postId: c.postId?.toString() || null,
        createdAt: c.createdAt,
        deleted: c.deleted || false,
        isGuest: c.isGuest || false,
        walletAddress: c.walletAddress || null,
        replyToId: c.replyToId?.toString() || null,
        replyCount: c.replyCount || 0,
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          profilePicture: author.profilePicture,
          userHandle: author.userHandle,
          verified: author.verified || false,
          teamMember: author.teamMember || false,
          badges: author.badges || [],
        } : null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
