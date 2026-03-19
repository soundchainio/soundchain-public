/**
 * Service Token Generator — Creates JWT for existing platform users (like FURL)
 *
 * POST /api/agent/service-token
 * Body: { handle: "furt", api_secret: "..." }
 *
 * Used by FURL and other service accounts that exist as regular users
 * but need programmatic JWT access for channel plugins.
 *
 * Protected by AGENT_API_SECRET — only trusted platforms can call this.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io'
const AGENT_API_SECRET = process.env.AGENT_API_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const { handle, api_secret } = req.body

  if (!handle || typeof handle !== 'string') {
    return res.status(400).json({ error: 'handle is required' })
  }

  // Auth check
  if (!AGENT_API_SECRET) {
    return res.status(500).json({ error: 'AGENT_API_SECRET not configured' })
  }
  if (api_secret !== AGENT_API_SECRET) {
    return res.status(401).json({ error: 'Invalid api_secret' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find user by handle
    const user = await db.collection('users').findOne({ handle: handle.toLowerCase() })
    if (!user) {
      return res.status(404).json({ error: `User @${handle} not found` })
    }

    // Find profile
    const profile = await db.collection('profiles').findOne({ _id: user.profileId })

    const payload = {
      sub: user._id.toString(),
      [`${JWT_NAMESPACE}/handle`]: user.handle,
      [`${JWT_NAMESPACE}/profileId`]: (user.profileId || profile?._id)?.toString(),
      [`${JWT_NAMESPACE}/roles`]: user.roles || ['USER'],
      [`${JWT_NAMESPACE}/isService`]: true,
      iat: Math.floor(Date.now() / 1000),
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })

    return res.status(200).json({
      success: true,
      handle: user.handle,
      token,
      expires_in: '30d',
      usage: 'Authorization: Bearer <token>',
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
