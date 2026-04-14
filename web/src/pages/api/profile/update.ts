import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

const ALLOWED_FIELDS = new Set([
  'bio', 'displayName', 'profilePicture', 'coverImage', 'coverPicture',
  'userHandle', 'favoriteGenres', 'musicianTypes', 'socialLinks',
])

// POST { fields: { [fieldName]: value, ... } }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { fields } = req.body || {}
  if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'fields object required' })

  const update: any = { updatedAt: new Date() }
  for (const [k, v] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = v
  }
  if (Object.keys(update).length === 1) return res.status(400).json({ error: 'No allowed fields provided' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    await db.collection('profiles').updateOne({ _id: auth.profileId }, { $set: update })
    const profile = await db.collection('profiles').findOne({ _id: auth.profileId })
    return res.status(200).json({
      profile: profile
        ? { ...profile, id: profile._id.toString(), _id: undefined }
        : null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
