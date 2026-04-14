import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { title, description?, artworkUrl?, trackIds? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { title, description, artworkUrl, trackIds } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ error: 'title required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()

    const { insertedId } = await db.collection('playlists').insertOne({
      profileId: auth.profileId,
      title: String(title),
      description: description || '',
      artworkUrl: artworkUrl || '',
      createdAt: now,
      updatedAt: now,
    })

    if (Array.isArray(trackIds) && trackIds.length > 0) {
      const items = trackIds.map((tid: string, idx: number) => ({
        playlistId: insertedId,
        trackId: new ObjectId(tid),
        profileId: auth.profileId,
        order: idx,
        createdAt: now,
        updatedAt: now,
      }))
      await db.collection('playlisttracks').insertMany(items, { ordered: false }).catch(() => {})
    }

    return res.status(200).json({
      playlist: {
        id: insertedId.toString(),
        title,
        description: description || '',
        artworkUrl: artworkUrl || '',
        createdAt: now,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
