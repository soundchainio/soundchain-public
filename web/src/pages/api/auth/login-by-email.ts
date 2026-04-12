/**
 * POST /api/auth/login-by-email
 *
 * Direct Vercel → Atlas login. Bypasses Lambda entirely.
 * This is the FAST PATH for email login — no API Gateway,
 * no Lambda cold start, no 504 timeouts.
 *
 * Replaces the GraphQL loginByEmail mutation for the login page.
 * The GraphQL mutation still exists for backward compatibility
 * but the login page should call this endpoint instead.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io/graphql'

if (!JWT_SECRET) console.error('[auth] CRITICAL: JWT_SECRET not set')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const { email, force } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email required' })
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find user by email
    const user = await db.collection('users').findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' })
    }

    // Check if user has passkeys registered (Face ID / Touch ID)
    if (!force) {
      const passkeyCount = await db.collection('passkeycredentials').countDocuments({ userId: user._id })
      if (passkeyCount > 0) {
        return res.status(403).json({
          error: 'EMAILKEY_REQUIRED',
          message: 'This account is secured with Face ID. Use the EmailKey Book or the bypass button.',
        })
      }
    }

    // Auto-generate Nostr keypair if missing
    if (!user.nostrPubkey) {
      try {
        const privKeyBytes = crypto.randomBytes(32)
        const nostrPrivateKey = privKeyBytes.toString('hex')
        // Simple pubkey derivation placeholder — real Nostr uses secp256k1
        const nostrPubkey = crypto.createHash('sha256').update(privKeyBytes).digest('hex')
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { nostrPubkey, nostrPrivateKey, notifyViaNostr: true } }
        )
      } catch {}
    }

    // Create JWT — same format as Lambda JwtService
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
        loginByEmail: { jwt: token },
      },
    })
  } catch (err: any) {
    console.error('[auth] login-by-email error:', err.message)
    return res.status(500).json({ error: 'Login failed: ' + err.message })
  }
}
