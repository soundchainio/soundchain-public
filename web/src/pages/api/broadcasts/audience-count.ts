/**
 * GET /api/broadcasts/audience-count?audience=all|returning_l1|new_signups|self
 *
 * Admin-only. Returns the number of profiles that would receive a broadcast
 * with the given audience filter. Lets the composer UI show "would send to
 * 4,283 users" before the admin hits the Send button.
 *
 * Cheap query — uses estimatedDocumentCount() where possible (per
 * `feedback_count_documents_collscan.md`); for filtered audiences, uses a
 * proper $match w/ index hint.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { AUDIENCE, MAINNET_CUTOVER_ISO, type Audience } from 'lib/broadcasts/welcomeManual'

async function isAdmin(db: any, userId: string): Promise<boolean> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'frank@soundchain.io').toLowerCase()
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1 } },
  )
  return !!user?.email && user.email.toLowerCase() === adminEmail
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const client = await clientPromise
  const db = client.db('soundchain')

  if (!(await isAdmin(db, auth.userId))) {
    return res.status(403).json({ error: 'Admin only' })
  }

  const audience = String(req.query.audience ?? 'all') as Audience
  const profiles = db.collection('profiles')
  const cutover = new Date(MAINNET_CUTOVER_ISO)

  let count = 0
  switch (audience) {
    case AUDIENCE.SELF:
      count = 1
      break
    case AUDIENCE.RETURNING_L1:
      // Profiles created BEFORE mainnet cutover
      count = await profiles.countDocuments({ createdAt: { $lt: cutover } })
      break
    case AUDIENCE.NEW_SIGNUPS:
      // Profiles created AFTER mainnet cutover
      count = await profiles.countDocuments({ createdAt: { $gte: cutover } })
      break
    case AUDIENCE.ALL:
    default:
      // Cheap metadata read — collection-scan-free
      count = await profiles.estimatedDocumentCount()
      break
  }

  return res.status(200).json({ audience, count })
}
