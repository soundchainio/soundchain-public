/**
 * GET /api/playlists/get?id=<playlistId> — Vercel-direct (Phase 7e)
 * Returns single playlist by id matching Apollo PlaylistQuery shape.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'id required' })
  let oid: ObjectId
  try { oid = new ObjectId(id) } catch { return res.status(400).json({ error: 'Invalid id' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const p: any = await db.collection('playlists').findOne({ _id: oid })
    if (!p) return res.status(404).json({ error: 'Not found' })

    return res.status(200).json({
      playlist: {
        id: p._id.toString(),
        title: p.title || '',
        description: p.description || '',
        artworkUrl: p.artworkUrl || p.coverArtUrl || null,
        profileId: p.profileId?.toString() || null,
        favoriteCount: p.favoriteCount || 0,
        followCount: p.followCount || 0,
        createdAt: p.createdAt,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
