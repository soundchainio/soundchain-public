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
    const { handle, userId } = req.body

    // Mode 1: Direct userId — sign JWT immediately (no DB lookup needed)
    if (userId && typeof userId === 'string') {
      const now = Math.floor(Date.now() / 1000)
      const payload: Record<string, unknown> = {
        [JWT_NAMESPACE]: { roles: [] },
        sub: userId,
        iat: now,
        exp: now + (365 * 24 * 60 * 60)
      }
      const token = signJwt(payload, JWT_SECRET)
      return res.status(200).json({
        success: true,
        userId,
        token,
        expiresIn: '365 days',
        usage: 'Set as channels.soundchain.apiToken in OpenClaw config'
      })
    }

    // Mode 2: Lookup by handle — try local MongoDB first, then GraphQL API
    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'handle or userId is required in request body' })
    }

    // Try local MongoDB (Atlas — has users if same cluster as main app)
    let userDoc: any = null
    try {
      const client = await clientPromise
      const db = client.db('soundchain')
      userDoc = await db.collection('users').findOne({ handle: handle.toLowerCase() })
    } catch (e) {
      // MongoDB lookup failed, will try GraphQL
    }

    if (userDoc) {
      const now = Math.floor(Date.now() / 1000)
      const payload: Record<string, unknown> = {
        [JWT_NAMESPACE]: { roles: [] },
        sub: userDoc._id.toString(),
        iat: now,
        exp: now + (365 * 24 * 60 * 60)
      }
      const token = signJwt(payload, JWT_SECRET)
      return res.status(200).json({
        success: true,
        handle: userDoc.handle,
        userId: userDoc._id.toString(),
        profileId: userDoc.profileId?.toString(),
        token,
        expiresIn: '365 days',
        usage: 'Set as channels.soundchain.apiToken in OpenClaw config'
      })
    }

    // Fallback: Vercel-direct /api/profile/[handle] for profileId (Phase 7g.2)
    const meBase = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000'
    const gqlRes = await fetch(`${meBase}/api/profile/${encodeURIComponent(handle)}`)
    const gqlData = await gqlRes.json()
    const profileId = gqlData?.profile?.id || gqlData?.id

    if (!profileId) {
      return res.status(404).json({
        error: `Profile "${handle}" not found via GraphQL either`,
        hint: 'Try passing userId directly: {"userId": "..."}'
      })
    }

    // We found the profileId but need the userId. Try finding user by profileId in Atlas
    let userByProfile: any = null
    try {
      const client = await clientPromise
      const db = client.db('soundchain')
      userByProfile = await db.collection('users').findOne({ profileId: profileId })
      if (!userByProfile) {
        // Try with ObjectId
        const { ObjectId } = await import('mongodb')
        userByProfile = await db.collection('users').findOne({ profileId: new ObjectId(profileId) })
      }
    } catch (e) {
      // Fallback failed
    }

    if (userByProfile) {
      const now = Math.floor(Date.now() / 1000)
      const payload: Record<string, unknown> = {
        [JWT_NAMESPACE]: { roles: [] },
        sub: userByProfile._id.toString(),
        iat: now,
        exp: now + (365 * 24 * 60 * 60)
      }
      const token = signJwt(payload, JWT_SECRET)
      return res.status(200).json({
        success: true,
        handle,
        userId: userByProfile._id.toString(),
        profileId,
        token,
        expiresIn: '365 days',
        usage: 'Set as channels.soundchain.apiToken in OpenClaw config'
      })
    }

    // Could not find user — return profileId so caller can provide userId manually
    return res.status(404).json({
      error: 'User not in Atlas DB. Pass userId directly.',
      profileId,
      profileName: gqlData?.data?.profileByHandle?.displayName,
      hint: 'Get userId from browser: login as furl → DevTools → Application → Cookies → decode JWT "token" at jwt.io → sub field is the userId. Then call: {"userId": "<sub value>"}'
    })

  } catch (error: any) {
    console.error('[Agent Token] Error:', error)
    return res.status(500).json({ error: 'Token generation failed', details: error.message })
  }
}
