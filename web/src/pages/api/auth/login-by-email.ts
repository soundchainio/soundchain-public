/**
 * POST /api/auth/login-by-email
 *
 * PHASE 1: Vercel direct → Atlas login. Bypasses Lambda entirely.
 * Falls back gracefully — if this fails, login.tsx tries Lambda.
 *
 * Same logic as Lambda's loginByEmail resolver but as a Vercel
 * API route for speed (no API Gateway, no Lambda cold start).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io/graphql'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { email, force } = req.body
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email required' })

  const normalizedEmail = email.toLowerCase().trim()

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const user = await db.collection('users').findOne({ email: normalizedEmail })
    if (!user) return res.status(404).json({ error: 'No account found with this email' })

    // Check passkeys (Face ID gate)
    if (!force) {
      const passkeyCount = await db.collection('passkeycredentials').countDocuments({ userId: user._id })
      if (passkeyCount > 0) {
        return res.status(403).json({ error: 'EMAILKEY_REQUIRED' })
      }
    }

    // Auto-generate Nostr keypair if missing
    if (!user.nostrPubkey) {
      try {
        const privKey = crypto.randomBytes(32)
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { nostrPubkey: crypto.createHash('sha256').update(privKey).digest('hex'), nostrPrivateKey: privKey.toString('hex'), notifyViaNostr: true } }
        )
      } catch {}
    }

    // Create JWT (same format as Lambda)
    const token = jwt.sign(
      { [JWT_NAMESPACE]: { roles: user.roles || [] } },
      JWT_SECRET,
      { algorithm: 'HS256', subject: user._id.toString(), expiresIn: '30d' }
    )

    // Set cookie at HTTP layer — client-side js-cookie writes are flaky on
    // Safari/Chrome iOS when followed by window.location navigation. Setting
    // it server-side means it survives the redirect deterministically.
    // Non-httpOnly so Apollo's authLink can read it for cross-origin /graphql.
    const isProd = process.env.NODE_ENV === 'production'
    const cookieParts = [
      `token=${token}`,
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
      'SameSite=Lax',
    ]
    if (isProd) cookieParts.push('Secure')
    res.setHeader('Set-Cookie', cookieParts.join('; '))

    return res.status(200).json({ data: { loginByEmail: { jwt: token } } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
