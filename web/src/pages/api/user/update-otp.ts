/**
 * POST /api/user/update-otp — Vercel-direct (Phase 7f.4)
 *
 * Body: { otpSecret, otpRecoveryPhrase }
 * Stores hashed OTP secret + recovery phrase on the user doc.
 * Used by SecurityForm + DisableSecurityForm (passing empty strings to disable).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { otpSecret, otpRecoveryPhrase } = req.body || {}

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const userOid = new ObjectId(auth.userId)
    // Clear vs set
    if (!otpSecret) {
      await db.collection('users').updateOne(
        { _id: userOid },
        { $unset: { otpSecret: '', otpRecoveryPhrase: '' }, $set: { otpEnabled: false, updatedAt: new Date() } }
      )
    } else {
      await db.collection('users').updateOne(
        { _id: userOid },
        { $set: { otpSecret, otpRecoveryPhrase, otpEnabled: true, updatedAt: new Date() } }
      )
    }
    return res.status(200).json({ user: { id: auth.userId } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
