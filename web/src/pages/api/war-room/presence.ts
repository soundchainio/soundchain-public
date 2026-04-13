/**
 * War Room Presence
 *
 * GET — Who's currently in the war room
 * POST — Register/heartbeat presence (TTL 2 min)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const COLLECTION = 'warroom_presence'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const col = db.collection(COLLECTION)

    // Ensure TTL index (idempotent)
    await col.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 120 }).catch(() => {})

    if (req.method === 'POST') {
      const { handle, role } = req.body
      if (!handle) return res.status(400).json({ error: 'handle required' })

      await col.updateOne(
        { handle },
        { $set: { handle, role: role || 'member', lastSeen: new Date() } },
        { upsert: true }
      )
      return res.status(200).json({ ok: true })
    }

    // GET — return who's present
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30')
    const humans = await col.find({}).toArray()

    // Get radio track
    let radioTrack = null
    try {
      const tracks = await db.collection('tracks')
        .find({ assetUrl: { $exists: true, $ne: null } })
        .sort({ createdAt: -1 })
        .limit(1)
        .project({ title: 1, artist: 1 })
        .toArray()
      if (tracks[0]) radioTrack = { title: tracks[0].title, artist: tracks[0].artist }
    } catch {}

    return res.status(200).json({
      humans: humans.map(h => ({ handle: h.handle, role: h.role, joinedAt: h.lastSeen })),
      radioTrack,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
