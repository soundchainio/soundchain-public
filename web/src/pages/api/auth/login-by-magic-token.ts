/**
 * POST /api/auth/login-by-magic-token
 *
 * PHASE 6 pattern: Vercel direct login after Magic OAuth/OTP success.
 * Bypasses Lambda entirely (api.soundchain.io → Apollo `login` mutation
 * is currently dead due to custom-domain → API Gateway hop failure,
 * same as Jan 31 / Feb 2 incidents).
 *
 * Trust model (matches /api/auth/register): the frontend has already
 * proven Magic auth — `magic.user.isLoggedIn()` gate fires before we
 * get here — so we accept the email + publicAddress it pulled from
 * `magic.user.getMetadata()`. We do NOT verify the Magic DID token
 * server-side (no Admin SDK in the Vercel runtime; that's Lambda's job).
 *
 * Returns the exact shape Apollo's `useLoginMutation` consumers expect:
 *   { data: { login: { jwt } } }
 *
 * 404 = user not found → frontend should route to /create-account/unified.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import clientPromise from 'lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io/graphql'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { email, publicAddress } = req.body || {}

  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : ''
  const normalizedAddress = typeof publicAddress === 'string' ? publicAddress.toLowerCase().trim() : ''

  if (!normalizedEmail && !normalizedAddress) {
    return res.status(400).json({ error: 'email or publicAddress required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Look up by email first (primary key for Magic-authenticated users),
    // then fall back to any wallet-address field if email lookup misses.
    let user: any = null
    if (normalizedEmail) {
      user = await db.collection('users').findOne({ email: normalizedEmail })
    }
    if (!user && normalizedAddress) {
      user = await db.collection('users').findOne({
        $or: [
          { magicWalletAddress: normalizedAddress },
          { googleWalletAddress: normalizedAddress },
          { discordWalletAddress: normalizedAddress },
          { twitchWalletAddress: normalizedAddress },
          { emailWalletAddress: normalizedAddress },
          { hdWalletAddress: normalizedAddress },
        ],
      })
    }

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' })
    }

    // Auto-generate Nostr keypair on first login if missing (parity with
    // /api/auth/login-by-email and the Me resolver's lazy generation).
    if (!user.nostrPubkey) {
      try {
        const privKey = crypto.randomBytes(32)
        const pubKey = crypto.createHash('sha256').update(privKey).digest('hex')
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { nostrPubkey: pubKey, nostrPrivateKey: privKey.toString('hex'), notifyViaNostr: true } },
        )
      } catch (_) { /* non-fatal */ }
    }

    const token = jwt.sign(
      { [JWT_NAMESPACE]: { roles: user.roles || [] } },
      JWT_SECRET,
      { algorithm: 'HS256', subject: user._id.toString(), expiresIn: '30d' },
    )

    return res.status(200).json({ data: { login: { jwt: token } } })
  } catch (err: any) {
    console.error('[login-by-magic-token] error:', err)
    return res.status(500).json({ error: err?.message || 'login failed' })
  }
}
