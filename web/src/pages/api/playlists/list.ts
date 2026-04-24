/**
 * GET /api/playlists/list — Vercel-direct replacement for useGetUserPlaylistsQuery
 *
 * ?profileId=xxx — playlists by user (required)
 * ?playlistId=xxx — single playlist with tracks
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const profileId = req.query.profileId as string
  const playlistId = req.query.playlistId as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Single playlist with tracks
    if (playlistId) {
      const playlist = await db.collection('playlists').findOne({ _id: new ObjectId(playlistId) })
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' })

      // Hydrate tracks
      const trackIds = (playlist.tracks || []).map((t: any) => {
        try { return new ObjectId(t.trackId || t) } catch { return null }
      }).filter(Boolean)

      const tracks = trackIds.length > 0
        ? await db.collection('tracks').find({ _id: { $in: trackIds } }).toArray()
        : []

      return res.status(200).json({
        playlist: {
          id: playlist._id.toString(),
          title: playlist.title || '',
          description: playlist.description || '',
          coverImage: playlist.coverImage || null,
          profileId: playlist.profileId?.toString() || null,
          tracks: tracks.map(t => ({
            id: t._id.toString(),
            title: t.title || '',
            artist: t.artist || '',
            artworkUrl: t.artworkUrl || '',
            playbackUrl: t.playbackUrl || '',
            genres: t.genres || [],
            playbackCount: t.playbackCount || 0,
          })),
          createdAt: playlist.createdAt || null,
        },
      })
    }

    // List playlists by user
    if (!profileId) return res.status(400).json({ error: 'profileId or playlistId required' })

    const playlists = await db.collection('playlists')
      .find({ profileId: new ObjectId(profileId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    const nodes = playlists.map(p => ({
      id: p._id.toString(),
      title: p.title || '',
      description: p.description || '',
      coverImage: p.coverImage || null,
      trackCount: (p.tracks || []).length,
      profileId: p.profileId?.toString() || null,
      createdAt: p.createdAt || null,
    }))

    return res.status(200).json({ nodes })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
