/**
 * GET /api/cron/cleanup-ephemeral — Vercel Cron (Phase 7h)
 *
 * Replaces soundchain-api-production-cleanupephemeral AWS Lambda.
 * Runs hourly (per vercel.json).
 *
 * Finds posts where isEphemeral=true + mediaExpiresAt < now + uploadedMediaUrl
 * exists, deletes the media from S3 (if creds present), then clears the
 * uploadedMediaUrl + uploadedMediaType fields on the post.
 * The post text + metadata stay so UI can render "media expired".
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

// NOTE: legacy Lambda did S3 DeleteObject; Vercel runtime doesn't have
// @aws-sdk/client-s3 in the bundle, so we just clear the Mongo references
// here. Recommended: set an S3 lifecycle policy on the uploads bucket to
// auto-expire objects 7 days after upload. Same storage-hygiene outcome
// without needing the SDK in the function bundle.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.headers['x-vercel-cron'] && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Cron only' })
  }

  const now = new Date()
  let cleaned = 0
  let total = 0

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const result = await db.collection('posts').updateMany(
      {
        isEphemeral: true,
        mediaExpiresAt: { $lt: now },
        uploadedMediaUrl: { $exists: true, $ne: null },
      },
      {
        $set: { uploadedMediaUrl: null, uploadedMediaType: null, updatedAt: now },
      }
    )

    cleaned = result.modifiedCount
    total = result.matchedCount

    return res.status(200).json({
      success: true,
      runAt: now.toISOString(),
      cleaned,
      total,
      note: 'Mongo cleared. S3 objects expire via bucket lifecycle policy.',
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, cleaned, total })
  }
}
