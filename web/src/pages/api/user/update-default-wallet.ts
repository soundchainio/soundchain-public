/**
 * POST /api/user/update-default-wallet — Vercel-direct (Phase 7f.4)
 *
 * Body: { defaultWallet }   // 'HD' | 'MAGIC' | 'METAMASK'
 * Persists the user's preferred wallet on the users doc + returns the updated user.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

const ALLOWED = new Set(['HD', 'MAGIC', 'METAMASK', 'WALLETCONNECT'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { defaultWallet } = req.body || {}
  if (!defaultWallet || !ALLOWED.has(String(defaultWallet).toUpperCase())) {
    return res.status(400).json({ error: `defaultWallet must be one of ${[...ALLOWED].join(', ')}` })
  }
  const normalized = String(defaultWallet).toUpperCase()

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const userOid = new ObjectId(auth.userId)
    await db.collection('users').updateOne(
      { _id: userOid },
      { $set: { defaultWallet: normalized, updatedAt: new Date() } }
    )
    return res.status(200).json({ user: { id: auth.userId, defaultWallet: normalized } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
