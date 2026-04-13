/**
 * POST /api/auth/passkey-login-options
 *
 * PHASE 1: Vercel direct Face ID challenge generation.
 * Returns WebAuthn options for Face ID / Touch ID login.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import crypto from 'crypto'

const RP_ID = process.env.WEBAUTHN_RP_ID || 'soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { email } = req.body

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    if (!email) {
      return res.status(200).json({ data: { passkeyLoginOptions: { sessionId: '', options: '', hasEmailKey: false } } })
    }

    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(200).json({ data: { passkeyLoginOptions: { sessionId: '', options: '', hasEmailKey: false } } })
    }

    const credentials = await db.collection('passkeycredentials').find({ userId: user._id }).toArray()
    if (!credentials.length) {
      return res.status(200).json({ data: { passkeyLoginOptions: { sessionId: '', options: '', hasEmailKey: false } } })
    }

    const challenge = crypto.randomBytes(32)
    const sessionId = crypto.randomBytes(32).toString('hex')

    const options = {
      rpId: RP_ID,
      challenge: challenge.toString('base64url'),
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: credentials.map((c: any) => ({
        id: c.credentialID,
        type: 'public-key',
        transports: c.transports || ['internal'],
      })),
    }

    await db.collection('passkeychallenges').insertOne({
      sessionId, challenge: challenge.toString('base64url'),
      userId: user._id, type: 'authentication', createdAt: new Date(),
    })

    // Ensure TTL index
    await db.collection('passkeychallenges').createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }).catch(() => {})

    return res.status(200).json({ data: { passkeyLoginOptions: { sessionId, options: JSON.stringify(options), hasEmailKey: true } } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
