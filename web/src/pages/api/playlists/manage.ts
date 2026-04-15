/**
 * Playlist Management — single endpoint for all playlist CRUD
 * POST { action, ...params }
 *
 * Actions:
 *   create      — { name, description? } → creates playlist
 *   update      — { playlistId, name?, description?, coverUrl? }
 *   delete      — { playlistId }
 *   addTrack    — { playlistId, trackId, source? }
 *   addTracks   — { playlistId, tracks: [{ trackId, source? }] }
 *   removeTrack — { playlistId, trackId }
 *   favorite    — { playlistId } → toggles
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { action, ...params } = req.body || {}
  if (!action) return res.status(400).json({ error: 'action required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const playlists = db.collection('playlists')
    const playlistItems = db.collection('playlistitems')

    if (action === 'create') {
      const { name, description } = params
      if (!name) return res.status(400).json({ error: 'name required' })
      const doc = {
        name,
        description: description || '',
        profileId: auth.profileId,
        coverUrl: '',
        trackCount: 0,
        favoriteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await playlists.insertOne(doc)
      return res.status(200).json({ ok: true, playlistId: result.insertedId.toString() })
    }

    if (action === 'update') {
      const { playlistId, name, description, coverUrl } = params
      if (!playlistId) return res.status(400).json({ error: 'playlistId required' })
      const update: any = { updatedAt: new Date() }
      if (name !== undefined) update.name = name
      if (description !== undefined) update.description = description
      if (coverUrl !== undefined) update.coverUrl = coverUrl
      await playlists.updateOne({ _id: new ObjectId(playlistId), profileId: auth.profileId }, { $set: update })
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete') {
      const { playlistId } = params
      if (!playlistId) return res.status(400).json({ error: 'playlistId required' })
      await playlists.deleteOne({ _id: new ObjectId(playlistId), profileId: auth.profileId })
      await playlistItems.deleteMany({ playlistId: new ObjectId(playlistId) })
      return res.status(200).json({ ok: true })
    }

    if (action === 'addTrack') {
      const { playlistId, trackId, source } = params
      if (!playlistId || !trackId) return res.status(400).json({ error: 'playlistId and trackId required' })
      await playlistItems.updateOne(
        { playlistId: new ObjectId(playlistId), trackId: new ObjectId(trackId) },
        { $setOnInsert: { playlistId: new ObjectId(playlistId), trackId: new ObjectId(trackId), source: source || 'SOUNDCHAIN', addedAt: new Date() } },
        { upsert: true },
      )
      await playlists.updateOne({ _id: new ObjectId(playlistId) }, { $inc: { trackCount: 1 }, $set: { updatedAt: new Date() } })
      return res.status(200).json({ ok: true })
    }

    if (action === 'addTracks') {
      const { playlistId, tracks } = params
      if (!playlistId || !tracks?.length) return res.status(400).json({ error: 'playlistId and tracks required' })
      const ops = tracks.map((t: any) => ({
        updateOne: {
          filter: { playlistId: new ObjectId(playlistId), trackId: new ObjectId(t.trackId) },
          update: { $setOnInsert: { playlistId: new ObjectId(playlistId), trackId: new ObjectId(t.trackId), source: t.source || 'SOUNDCHAIN', addedAt: new Date() } },
          upsert: true,
        },
      }))
      await playlistItems.bulkWrite(ops)
      await playlists.updateOne({ _id: new ObjectId(playlistId) }, { $inc: { trackCount: tracks.length }, $set: { updatedAt: new Date() } })
      return res.status(200).json({ ok: true, added: tracks.length })
    }

    if (action === 'removeTrack') {
      const { playlistId, trackId } = params
      if (!playlistId || !trackId) return res.status(400).json({ error: 'playlistId and trackId required' })
      const result = await playlistItems.deleteOne({ playlistId: new ObjectId(playlistId), trackId: new ObjectId(trackId) })
      if (result.deletedCount > 0) {
        await playlists.updateOne({ _id: new ObjectId(playlistId), trackCount: { $gt: 0 } }, { $inc: { trackCount: -1 }, $set: { updatedAt: new Date() } })
      }
      return res.status(200).json({ ok: true })
    }

    if (action === 'favorite') {
      const { playlistId } = params
      if (!playlistId) return res.status(400).json({ error: 'playlistId required' })
      const existing = await db.collection('playlistfavorites').findOne({ playlistId: new ObjectId(playlistId), profileId: auth.profileId })
      if (existing) {
        await db.collection('playlistfavorites').deleteOne({ _id: existing._id })
        await playlists.updateOne({ _id: new ObjectId(playlistId), favoriteCount: { $gt: 0 } }, { $inc: { favoriteCount: -1 } })
        return res.status(200).json({ ok: true, favorited: false })
      } else {
        await db.collection('playlistfavorites').insertOne({ playlistId: new ObjectId(playlistId), profileId: auth.profileId, createdAt: new Date() })
        await playlists.updateOne({ _id: new ObjectId(playlistId) }, { $inc: { favoriteCount: 1 } })
        return res.status(200).json({ ok: true, favorited: true })
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
