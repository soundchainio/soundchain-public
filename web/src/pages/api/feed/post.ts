/**
 * GET /api/feed/post?id=<postId>
 *
 * Single-post fetch, Vercel-direct (Phase 6 continuation).
 * Used by PostModal to prefill the edit form without Apollo → dead
 * api.soundchain.io hop (Bug #49, #50).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'id required' })

  let oid: ObjectId
  try {
    oid = new ObjectId(id)
  } catch {
    return res.status(400).json({ error: 'Invalid id' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const post = await db.collection('posts').findOne({ _id: oid })
    if (!post) return res.status(404).json({ error: 'Post not found' })

    return res.status(200).json({
      post: {
        id: post._id.toString(),
        body: post.body || '',
        mediaLink: post.mediaLink || null,
        profileId: post.profileId?.toString() || null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt || post.createdAt,
        deleted: post.deleted || false,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
