/**
 * POST /api/auth/passkey-login-verify
 *
 * Direct Vercel → Atlas passkey verification. Bypasses Lambda.
 * Verifies the WebAuthn credential and returns a JWT.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io/graphql'
const RP_ID = process.env.WEBAUTHN_RP_ID || 'soundchain.io'
const EXPECTED_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const { sessionId, credential } = req.body
  if (!sessionId || !credential) {
    return res.status(400).json({ error: 'sessionId and credential required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find the challenge session
    const challengeDoc = await db.collection('passkeychallenges').findOne({
      sessionId,
      type: 'authentication',
    })

    if (!challengeDoc) {
      return res.status(401).json({ error: 'Invalid or expired passkey session' })
    }

    // Parse the credential
    const parsedCredential = typeof credential === 'string' ? JSON.parse(credential) : credential

    // Find the stored credential
    const storedCredential = await db.collection('passkeycredentials').findOne({
      credentialID: parsedCredential.id,
    })

    if (!storedCredential) {
      return res.status(401).json({ error: 'Passkey not recognized' })
    }

    // Verify the authentication response using @simplewebauthn/server
    // Dynamic import to keep the function lightweight
    const { verifyAuthenticationResponse } = await import('@simplewebauthn/server')

    const verification = await verifyAuthenticationResponse({
      response: parsedCredential,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: storedCredential.credentialID,
        publicKey: storedCredential.publicKey.buffer
          ? new Uint8Array(storedCredential.publicKey.buffer)
          : new Uint8Array(Buffer.from(storedCredential.publicKey)),
        counter: storedCredential.counter || 0,
        transports: storedCredential.transports || ['internal'],
      },
      requireUserVerification: false, // Allow synced passkeys (iCloud Keychain)
    })

    if (!verification.verified) {
      return res.status(401).json({ error: 'Passkey verification failed' })
    }

    // Update counter for replay protection
    await db.collection('passkeycredentials').updateOne(
      { _id: storedCredential._id },
      {
        $set: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      }
    )

    // Delete used challenge
    await db.collection('passkeychallenges').deleteOne({ _id: challengeDoc._id })

    // Get user
    const user = await db.collection('users').findOne({ _id: storedCredential.userId })
    if (!user) {
      return res.status(401).json({ error: 'User account not found' })
    }

    // Auto-generate Nostr keypair if missing
    if (!user.nostrPubkey) {
      try {
        const privKeyBytes = crypto.randomBytes(32)
        const nostrPrivateKey = privKeyBytes.toString('hex')
        const nostrPubkey = crypto.createHash('sha256').update(privKeyBytes).digest('hex')
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { nostrPubkey, nostrPrivateKey, notifyViaNostr: true } }
        )
      } catch {}
    }

    // Create JWT
    const token = jwt.sign(
      { [JWT_NAMESPACE]: { roles: user.roles || [] } },
      JWT_SECRET,
      {
        algorithm: 'HS256',
        subject: user._id.toString(),
        expiresIn: '30d',
      }
    )

    return res.status(200).json({
      data: {
        passkeyLoginVerify: { jwt: token },
      },
    })
  } catch (err: any) {
    console.error('[auth] passkey-login-verify error:', err.message)
    return res.status(500).json({ error: 'Verification failed: ' + err.message })
  }
}
