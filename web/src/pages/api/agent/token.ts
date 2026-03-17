/**
 * Agent Token Endpoint
 *
 * POST /api/agent/token - Generate JWT auth token for an agent user
 *
 * Requires: PUBLISH_SECRET header for authorization
 * Returns: JWT signed with JWT_SECRET, valid for 365 days
 *
 * Used by OpenClaw channel plugin to authenticate as a SoundChain user
 * for DM operations (sendMessage, chatHistory, etc.)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import clientPromise from 'lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'not so secret'
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'http://localhost:4000/graphql'

// Base64url encode (no padding, URL-safe)
function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Sign JWT with HMAC-SHA256 (matches JwtService.ts exactly)
function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const signature = base64url(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  )
  return `${header}.${body}.${signature}`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  // Auth check — requires PUBLISH_SECRET
  const publishSecret = process.env.PUBLISH_SECRET
  if (!publishSecret) {
    return res.status(500).json({ error: 'PUBLISH_SECRET not configured on server' })
  }

  const authHeader = req.headers.authorization
  const providedSecret = authHeader?.replace('Bearer ', '')
  if (providedSecret !== publishSecret) {
    return res.status(401).json({ error: 'Unauthorized — invalid PUBLISH_SECRET' })
  }

  try {
    const { handle } = req.body

    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'handle is required in request body' })
    }

    // Look up user by handle
    const client = await clientPromise
    const db = client.db('soundchain')
    const user = await db.collection('users').findOne({
      handle: handle.toLowerCase()
    })

    if (!user) {
      return res.status(404).json({ error: `User with handle "${handle}" not found` })
    }

    // Generate JWT matching JwtService.create() format exactly
    const now = Math.floor(Date.now() / 1000)
    const payload: Record<string, unknown> = {
      [JWT_NAMESPACE]: { roles: [] },
      sub: user._id.toString(),
      iat: now,
      exp: now + (365 * 24 * 60 * 60) // 365 days for agent tokens
    }

    const token = signJwt(payload, JWT_SECRET)

    return res.status(200).json({
      success: true,
      handle: user.handle,
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      token,
      expiresIn: '365 days',
      usage: 'Set as channels.soundchain.apiToken in OpenClaw config'
    })

  } catch (error: any) {
    console.error('[Agent Token] Error:', error)
    return res.status(500).json({ error: 'Token generation failed', details: error.message })
  }
}
