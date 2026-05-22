/**
 * POST /api/user/validate-otp-recovery — Vercel-direct (Phase 7f.4)
 *
 * Body: { otpRecoveryPhrase }
 * Returns { valid: boolean }
 *
 * Compares the supplied phrase against the user's stored otpRecoveryPhrase.
 * Used to gate disabling 2FA when the user has lost their authenticator.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { otpRecoveryPhrase } = req.body || {}
  if (!otpRecoveryPhrase) return res.status(400).json({ valid: false })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const user: any = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) }, { projection: { otpRecoveryPhrase: 1 } as any })
    const valid = !!user?.otpRecoveryPhrase && user.otpRecoveryPhrase === otpRecoveryPhrase
    return res.status(200).json({ valid })
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message })
  }
}
