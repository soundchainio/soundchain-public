/**
 * GET /api/profile/verification — check verification request status
 * POST /api/profile/verification — submit verification request
 *
 * Replaces useProfileVerificationRequestQuery + useCreateProfileVerificationRequestMutation
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')

  if (req.method === 'GET') {
    try {
      const request = await db.collection('verificationrequests')
        .findOne({ profileId: auth.profileId })

      if (!request) return res.status(200).json({ request: null })

      return res.status(200).json({
        request: {
          id: request._id.toString(),
          status: request.status || 'pending',
          soundcloudUrl: request.soundcloudUrl || '',
          youtubeUrl: request.youtubeUrl || '',
          bandcampUrl: request.bandcampUrl || '',
          notes: request.notes || '',
          createdAt: request.createdAt || null,
          reviewedAt: request.reviewedAt || null,
          reviewedBy: request.reviewedBy || null,
        },
      })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const { soundcloudUrl, youtubeUrl, bandcampUrl, notes } = req.body || {}

    try {
      // Upsert — one request per profile
      await db.collection('verificationrequests').updateOne(
        { profileId: auth.profileId },
        {
          $set: {
            soundcloudUrl: soundcloudUrl || '',
            youtubeUrl: youtubeUrl || '',
            bandcampUrl: bandcampUrl || '',
            notes: notes || '',
            status: 'pending',
            updatedAt: new Date(),
          },
          $setOnInsert: { profileId: auth.profileId, createdAt: new Date() },
        },
        { upsert: true }
      )

      return res.status(200).json({ success: true, status: 'pending' })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
