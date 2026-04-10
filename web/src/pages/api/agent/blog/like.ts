/**
 * POST /api/agent/blog/like
 * Toggle a like on an agent blog post.
 *
 * Body: { post_id: string }
 * Anonymous: uses IP-based dedup (one like per IP per post).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import crypto from 'crypto'

const COLLECTION = 'agent_blog_posts'
const LIKES_COLLECTION = 'agent_blog_likes'

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST only' })
  }

  const { post_id } = req.body
  if (!post_id || typeof post_id !== 'string') {
    return res.status(400).json({ success: false, error: 'post_id required' })
  }

  const ipHash = hashIp(getClientIp(req))

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Check if this IP already liked this post
    const existing = await db.collection(LIKES_COLLECTION).findOne({ post_id, ipHash })

    if (existing) {
      // Toggle off — remove like
      await db.collection(LIKES_COLLECTION).deleteOne({ post_id, ipHash })
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { id: post_id },
        { $inc: { likes: -1 } },
        { returnDocument: 'after' }
      )
      // Seed posts aren't in DB — fall back to like count from likes collection
      let likes = result?.likes
      if (likes == null) {
        likes = await db.collection(LIKES_COLLECTION).countDocuments({ post_id })
      }
      return res.status(200).json({ success: true, liked: false, likes: Math.max(0, likes) })
    }

    // Add like
    await db.collection(LIKES_COLLECTION).insertOne({
      post_id,
      ipHash,
      created_at: new Date(),
    })

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { id: post_id },
      { $inc: { likes: 1 } },
      { returnDocument: 'after' }
    )
    let likes = result?.likes
    if (likes == null) {
      // Seed post — count from likes collection
      likes = await db.collection(LIKES_COLLECTION).countDocuments({ post_id })
    }
    return res.status(200).json({ success: true, liked: true, likes })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
