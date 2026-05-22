/**
 * POST /api/profile/claim-badge — Vercel-direct (Phase 7f.6)
 * Idempotent badge claim — flips claimed=true on profile/whitelist.
 * Returns { profile }.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    await db.collection('profiles').updateOne(
      { _id: auth.profileId },
      { $addToSet: { badges: 'CLAIMED' }, $set: { badgeClaimedAt: new Date(), updatedAt: new Date() } }
    )
    const profile: any = await db.collection('profiles').findOne({ _id: auth.profileId })
    return res.status(200).json({
      profile: profile ? {
        id: profile._id.toString(),
        badges: profile.badges || [],
        userHandle: profile.userHandle || '',
        displayName: profile.displayName || '',
        verified: profile.verified || false,
      } : null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
