/**
 * GET    /api/nodeverse/game-sessions           → all active sessions (for world beacons)
 * GET    /api/nodeverse/game-sessions?ownerId=.. → sessions by owner
 * POST   /api/nodeverse/game-sessions           → host a session on your parcel (auth)
 * DELETE /api/nodeverse/game-sessions?id=..     → end a session (auth, owner-only)
 *
 * Phase 5 — NBA 2K / Discord-style. A parcel owner broadcasts a playable
 * stream (Parsec, GeForce NOW, Twitch, YouTube live, twitch.tv/embed, etc.)
 * anchored to their parcel. Other visitors in the Nodeverse see a beacon
 * over the parcel and can tap to open a spectate modal that embeds the URL.
 *
 * Sessions auto-expire after 4 hours (server-side) so dead streams don't
 * clutter the map. One active session per parcel; POST-ing again replaces
 * the existing record.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

const MAX_SESSION_MS = 4 * 60 * 60 * 1000

function safeEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    const allowed = ['twitch.tv', 'youtube.com', 'youtu.be', 'parsec.app', 'play.geforcenow.com', 'kick.com', 'xbox.com', 'play.google.com']
    if (!allowed.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) return null
    return u.toString()
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const sessions = db.collection('nodeverse_game_sessions')
  const squares = db.collection('nodeverse_squares')

  // Auto-expire any sessions older than MAX_SESSION_MS on every hit.
  const cutoff = new Date(Date.now() - MAX_SESSION_MS)
  await sessions.deleteMany({ startedAt: { $lt: cutoff } })

  if (req.method === 'GET') {
    const ownerId = (req.query.ownerId as string) || ''
    const parcelX = req.query.parcelX !== undefined ? parseInt(req.query.parcelX as string) : null
    const parcelZ = req.query.parcelZ !== undefined ? parseInt(req.query.parcelZ as string) : null
    const query: any = {}
    if (ownerId) {
      try { query.ownerId = new ObjectId(ownerId) } catch { return res.status(400).json({ error: 'bad ownerId' }) }
    } else if (parcelX !== null && parcelZ !== null) {
      query.parcelX = parcelX
      query.parcelZ = parcelZ
    }
    const docs = await sessions.find(query).sort({ startedAt: -1 }).limit(200).toArray()
    res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=10')
    return res.status(200).json({
      sessions: docs.map(d => ({
        ...d,
        _id: d._id.toString(),
        ownerId: (d.ownerId as ObjectId)?.toString?.() || d.ownerId,
      })),
    })
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { parcelX, parcelZ, streamUrl, title, hostHandle } = req.body || {}
    if (typeof parcelX !== 'number' || typeof parcelZ !== 'number') return res.status(400).json({ error: 'parcelX/Z required' })
    if (!streamUrl || typeof streamUrl !== 'string') return res.status(400).json({ error: 'streamUrl required' })
    const safe = safeEmbedUrl(streamUrl)
    if (!safe) return res.status(400).json({ error: 'streamUrl must be HTTPS on twitch/youtube/parsec/geforcenow/kick' })
    if (typeof title !== 'string' || title.length < 2 || title.length > 120) return res.status(400).json({ error: 'title 2–120 chars' })

    const parcel = await squares.findOne({ x: parcelX, z: parcelZ })
    if (!parcel) return res.status(403).json({ error: 'parcel not owned' })
    if (!auth.profileId.equals(parcel.ownerId)) return res.status(403).json({ error: 'not your parcel' })

    // Replace any existing session on this parcel.
    await sessions.deleteMany({ parcelX, parcelZ })
    const doc = {
      ownerId: auth.profileId,
      hostHandle: typeof hostHandle === 'string' ? hostHandle.slice(0, 40) : null,
      parcelX,
      parcelZ,
      streamUrl: safe,
      title: title.trim(),
      startedAt: new Date(),
    }
    const result = await sessions.insertOne(doc as any)
    return res.status(200).json({ session: { ...doc, _id: result.insertedId.toString(), ownerId: auth.profileId.toString() } })
  }

  if (req.method === 'DELETE') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })
    const id = (req.query.id as string) || ''
    let _id: ObjectId
    try { _id = new ObjectId(id) } catch { return res.status(400).json({ error: 'bad id' }) }
    const existing = await sessions.findOne({ _id })
    if (!existing) return res.status(404).json({ error: 'session not found' })
    if (!auth.profileId.equals(existing.ownerId)) return res.status(403).json({ error: 'not yours' })
    await sessions.deleteOne({ _id })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
