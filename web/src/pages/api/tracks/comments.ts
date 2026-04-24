/**
 * GET /api/tracks/comments — Vercel-direct replacement for useTrackComments hook
 *
 * ?trackId=xxx — comments on a track (timestamped waveform comments)
 * ?limit=50
 *
 * POST — create a track comment
 * { trackId, body, timestamp }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')

  if (req.method === 'GET') {
    const trackId = req.query.trackId as string
    if (!trackId) return res.status(400).json({ error: 'trackId required' })

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

    try {
      const comments = await db.collection('trackcomments')
        .find({ trackId: new ObjectId(trackId) })
        .sort({ timestamp: 1, createdAt: -1 })
        .limit(limit)
        .toArray()

      // Hydrate profiles
      const profileIds = [...new Set(comments.map(c => c.profileId?.toString()).filter(Boolean))]
      const profileOids = profileIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
      const profiles = profileOids.length > 0
        ? await db.collection('profiles').find({ _id: { $in: profileOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1 }).toArray()
        : []
      const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

      const nodes = comments.map(c => {
        const profile = profileMap.get(c.profileId?.toString())
        return {
          id: c._id.toString(),
          body: c.body || '',
          timestamp: c.timestamp ?? 0,
          createdAt: c.createdAt || null,
          profile: profile ? {
            id: profile._id.toString(),
            displayName: profile.displayName || '',
            userHandle: profile.userHandle || '',
            profilePicture: profile.profilePicture || null,
          } : null,
        }
      })

      return res.status(200).json({ nodes })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { trackId, body, timestamp } = req.body || {}
    if (!trackId || !body) return res.status(400).json({ error: 'trackId and body required' })

    try {
      const doc = {
        trackId: new ObjectId(trackId),
        profileId: auth.profileId,
        body: String(body).slice(0, 500),
        timestamp: typeof timestamp === 'number' ? timestamp : 0,
        createdAt: new Date(),
      }
      const result = await db.collection('trackcomments').insertOne(doc)
      return res.status(201).json({ id: result.insertedId.toString() })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
