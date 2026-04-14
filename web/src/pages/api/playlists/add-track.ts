import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { playlistId, trackId }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { playlistId, trackId } = req.body || {}
  if (!playlistId || !trackId) return res.status(400).json({ error: 'playlistId and trackId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const playlistOid = new ObjectId(playlistId)

    const playlist = await db.collection('playlists').findOne(
      { _id: playlistOid },
      { projection: { profileId: 1 } },
    )
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' })
    if (playlist.profileId.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'Not your playlist' })
    }

    const count = await db.collection('playlisttracks').countDocuments({ playlistId: playlistOid })
    const now = new Date()
    const { insertedId } = await db.collection('playlisttracks').insertOne({
      playlistId: playlistOid,
      trackId: new ObjectId(trackId),
      profileId: auth.profileId,
      order: count,
      createdAt: now,
      updatedAt: now,
    })

    return res.status(200).json({ playlistTrack: { id: insertedId.toString(), order: count } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
