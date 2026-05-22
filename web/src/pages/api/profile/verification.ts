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

  // Admin PATCH — approve/reject another user's request
  if (req.method === 'PATCH') {
    const { requestId, status, reason } = req.body || {}
    if (!requestId) return res.status(400).json({ error: 'requestId required' })
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED|REJECTED|PENDING' })
    }
    try {
      const { ObjectId } = require('mongodb')
      let oid: any
      try { oid = new ObjectId(requestId) } catch { return res.status(400).json({ error: 'Invalid requestId' }) }
      const update: any = {
        status,
        reviewedAt: new Date(),
        reviewedBy: auth.profileId,
        updatedAt: new Date(),
      }
      if (reason) update.reason = String(reason).slice(0, 500)
      const result = await db.collection('profileverificationrequests').updateOne(
        { _id: oid },
        { $set: update }
      )
      // Reflect on profile if approved
      if (status === 'APPROVED') {
        const reqDoc: any = await db.collection('profileverificationrequests').findOne({ _id: oid })
        if (reqDoc?.profileId) {
          try {
            const profId = typeof reqDoc.profileId === 'string' ? new ObjectId(reqDoc.profileId) : reqDoc.profileId
            await db.collection('profiles').updateOne({ _id: profId }, { $set: { verified: true } })
          } catch {}
        }
      }
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Request not found' })
      return res.status(200).json({ success: true, status })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET, POST, or PATCH only' })
}
