import { trackEvent, logActivity } from 'lib/api/trackEvent'
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { profileId: targetProfileId, body, replyToId, mediaUrl, mediaType, coverArtUrl, mediaThumbnailUrl, mediaTitle } = req.body || {}
  if (!targetProfileId) return res.status(400).json({ error: 'profileId required' })
  if (!body && !mediaUrl) return res.status(400).json({ error: 'body or mediaUrl required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()

    const doc: any = {
      profileId: new ObjectId(targetProfileId),
      authorProfileId: auth.profileId,
      body: body ? String(body).substring(0, 1000) : undefined,
      replyToId: replyToId ? new ObjectId(replyToId) : undefined,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      coverArtUrl: coverArtUrl || undefined,
      mediaThumbnailUrl: mediaThumbnailUrl || undefined,
      mediaTitle: mediaTitle ? String(mediaTitle).substring(0, 200) : undefined,
      deleted: false,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    const { insertedId } = await db.collection('wallposts').insertOne(doc)

    const author = await db.collection('profiles').findOne(
      { _id: auth.profileId },
      { projection: { displayName: 1, userHandle: 1, profilePicture: 1 } },
    )

    return res.status(200).json({
      wallPost: {
        id: insertedId.toString(),
        body: doc.body || '',
        createdAt: now,
        mediaUrl: doc.mediaUrl || null,
        mediaType: doc.mediaType || null,
        coverArtUrl: doc.coverArtUrl || null,
        mediaThumbnailUrl: doc.mediaThumbnailUrl || null,
        mediaTitle: doc.mediaTitle || null,
        author: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          userHandle: author.userHandle,
          profilePicture: author.profilePicture,
        } : null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
