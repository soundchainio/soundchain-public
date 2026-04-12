/**
 * POST /api/auth/passkey-login-options
 *
 * Direct Vercel → Atlas passkey options. Bypasses Lambda.
 * Returns WebAuthn challenge options for Face ID / Touch ID login.
 *
 * This is the endpoint that was causing 504s on cold Lambda starts
 * and making Face ID "look broken". Now it's Vercel → Atlas direct.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'

const RP_ID = process.env.WEBAUTHN_RP_ID || 'soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const { email } = req.body

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // If no email, return empty (discoverable credentials flow — not used currently)
    if (!email) {
      return res.status(200).json({
        data: {
          passkeyLoginOptions: { sessionId: '', options: '', hasEmailKey: false },
        },
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await db.collection('users').findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(200).json({
        data: {
          passkeyLoginOptions: { sessionId: '', options: '', hasEmailKey: false },
        },
      })
    }

    // Find user's passkey credentials
    const credentials = await db.collection('passkeycredentials')
      .find({ userId: user._id })
      .toArray()

    if (!credentials.length) {
      return res.status(200).json({
        data: {
          passkeyLoginOptions: { sessionId: '', options: '', hasEmailKey: false },
        },
      })
    }

    // Generate WebAuthn authentication options
    // We do this without @simplewebauthn/server to avoid heavy dependency in Vercel function
    const challenge = crypto.randomBytes(32)
    const sessionId = crypto.randomBytes(32).toString('hex')

    const options = {
      rpId: RP_ID,
      challenge: challenge.toString('base64url'),
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: credentials.map((cred: any) => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports || ['internal'],
      })),
    }

    // Store challenge in MongoDB with 5 min TTL
    await db.collection('passkeychallenges').insertOne({
      sessionId,
      challenge: challenge.toString('base64url'),
      userId: user._id,
      type: 'authentication',
      createdAt: new Date(),
    })

    // Ensure TTL index exists (idempotent)
    await db.collection('passkeychallenges').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 300 }
    ).catch(() => {}) // Ignore if already exists

    return res.status(200).json({
      data: {
        passkeyLoginOptions: {
          sessionId,
          options: JSON.stringify(options),
          hasEmailKey: true,
        },
      },
    })
  } catch (err: any) {
    console.error('[auth] passkey-login-options error:', err.message)
    return res.status(500).json({ error: 'Failed to generate options: ' + err.message })
  }
}
