/**
 * POST /api/feed/create
 *
 * PHASE 4: Vercel direct feed post creation — bypasses Lambda GraphQL.
 * Inserts post, fans out feed items to followers.
 *
 * Headers: Authorization: Bearer <jwt> (or cookie `token`)
 * Body: { body, mediaLink?, uploadedMediaUrl?, uploadedMediaType?, uploadedMediaThumbnail? }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let token = ''
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
  else if (req.cookies?.token) token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'No token' })

  let userId: string
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.sub
    if (!userId) return res.status(401).json({ error: 'Invalid token' })
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const { body, mediaLink, uploadedMediaUrl, uploadedMediaType, uploadedMediaThumbnail } = req.body || {}

  if (!body?.trim() && !mediaLink && !uploadedMediaUrl) {
    return res.status(400).json({ error: 'Post must have text, mediaLink, or uploadedMedia' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { profileId: 1 } })
    if (!user?.profileId) return res.status(403).json({ error: 'No profile for user' })

    const profileId = user.profileId as ObjectId
    const now = new Date()
    const isEphemeral = !!uploadedMediaUrl
    const mediaExpiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined

    const postDoc: any = {
      profileId,
      body: body || '',
      mediaLink: mediaLink || null,
      mediaThumbnail: uploadedMediaThumbnail || null,
      uploadedMediaUrl: uploadedMediaUrl || null,
      uploadedMediaType: uploadedMediaType || null,
      isEphemeral,
      mediaExpiresAt,
      commentCount: 0,
      repostCount: 0,
      totalReactions: 0,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }

    const { insertedId } = await db.collection('posts').insertOne(postDoc)

    // Fan out feed items: self + all followers
    const followers = await db.collection('follows')
      .find({ followedId: profileId })
      .project({ followerId: 1 })
      .toArray()

    const feedItems = [
      { profileId, postId: insertedId, postedAt: now, createdAt: now, updatedAt: now },
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

    // Fire-and-forget: activity log + analytics event
    // These don't block the response — post is already created
    Promise.all([
      // Log activity for feed
      db.collection('activities').insertOne({
        profileId,
        type: 'POSTED',
        postId: insertedId,
        createdAt: now,
      }).catch(() => {}),
      // Track analytics event
      fetch(`https://${req.headers.host}/api/agent/analytics-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'post_create', userId, meta: { postId: insertedId.toString() } }),
      }).catch(() => {}),
      // Increment profile post count (for activity feed)
      db.collection('profiles').updateOne(
        { _id: profileId },
        { $inc: { postsCount: 1 } }
      ).catch(() => {}),
    ]).catch(() => {})

    return res.status(200).json({
      post: {
        id: insertedId.toString(),
        body: postDoc.body,
        mediaLink: postDoc.mediaLink,
        mediaThumbnail: postDoc.mediaThumbnail,
        uploadedMediaUrl: postDoc.uploadedMediaUrl,
        uploadedMediaType: postDoc.uploadedMediaType,
        createdAt: postDoc.createdAt,
        isEphemeral: postDoc.isEphemeral,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
