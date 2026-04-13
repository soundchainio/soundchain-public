/**
 * POST /api/auth/passkey-login-verify
 *
 * PHASE 1: Vercel direct Face ID verification + JWT.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io/graphql'
const RP_ID = process.env.WEBAUTHN_RP_ID || 'soundchain.io'
const EXPECTED_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { sessionId, credential } = req.body
  if (!sessionId || !credential) return res.status(400).json({ error: 'sessionId and credential required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const challengeDoc = await db.collection('passkeychallenges').findOne({ sessionId, type: 'authentication' })
    if (!challengeDoc) return res.status(401).json({ error: 'Invalid or expired session' })

    const parsed = typeof credential === 'string' ? JSON.parse(credential) : credential

    const stored = await db.collection('passkeycredentials').findOne({ credentialID: parsed.id })
    if (!stored) return res.status(401).json({ error: 'Passkey not recognized' })

    // Dynamic import to avoid bundling issues
    const { verifyAuthenticationResponse } = await import('@simplewebauthn/server')

    const verification = await verifyAuthenticationResponse({
      response: parsed,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: stored.credentialID,
        publicKey: stored.publicKey.buffer ? new Uint8Array(stored.publicKey.buffer) : new Uint8Array(Buffer.from(stored.publicKey)),
        counter: stored.counter || 0,
        transports: stored.transports || ['internal'],
      },
      requireUserVerification: false,
    })

    if (!verification.verified) return res.status(401).json({ error: 'Verification failed' })

    // Update counter + cleanup
    await db.collection('passkeycredentials').updateOne({ _id: stored._id }, { $set: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() } })
    await db.collection('passkeychallenges').deleteOne({ _id: challengeDoc._id })

    const user = await db.collection('users').findOne({ _id: stored.userId })
    if (!user) return res.status(401).json({ error: 'User not found' })

    // Nostr keypair
    if (!user.nostrPubkey) {
      try {
        const privKey = crypto.randomBytes(32)
        await db.collection('users').updateOne({ _id: user._id }, { $set: { nostrPubkey: crypto.createHash('sha256').update(privKey).digest('hex'), nostrPrivateKey: privKey.toString('hex'), notifyViaNostr: true } })
      } catch {}
    }

    const token = jwt.sign(
      { [JWT_NAMESPACE]: { roles: user.roles || [] } },
      JWT_SECRET,
      { algorithm: 'HS256', subject: user._id.toString(), expiresIn: '30d' }
    )

    return res.status(200).json({ data: { passkeyLoginVerify: { jwt: token } } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
