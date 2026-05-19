/**
 * Phase 16.47 — WebRTC signaling for the gym 1-on-1 P2P multiplayer.
 *
 * Two peers exchange SDPs + ICE candidates through Mongo polls. Once
 * the WebRTC peer connection establishes, all gameplay state flows
 * through the WebRTC data channel (no more polling here).
 *
 * Actions (POST body):
 *   { action: 'create', sdp, profile, handle }
 *     → host creates a room, returns { code, hostId }
 *
 *   { action: 'join', code, sdp, profile, handle }
 *     → guest joins room, returns { hostSDP, hostProfile, hostHandle, guestId }
 *     → host's next poll will see the guest's SDP
 *
 *   { action: 'candidate', code, role, candidate }
 *     → push an ICE candidate for the OTHER side to pick up
 *
 *   { action: 'poll', code, role, since }  (GET via query)
 *     → returns any new signaling data since `since` timestamp
 *
 * Mongo collection: `gym_rooms` (TTL index on lastActivity at 1h)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const ROOM_TTL_SECONDS = 60 * 60  // 1 hour
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // omit O/0/1/I for clarity

function genRoomCode(): string {
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return out
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

async function getRoomsCollection() {
  const client = await clientPromise
  const db = client.db()
  const col = db.collection('gym_rooms')
  // Lazy-create TTL index (no-op if exists)
  await col.createIndex({ lastActivity: 1 }, { expireAfterSeconds: ROOM_TTL_SECONDS })
  await col.createIndex({ code: 1 }, { unique: true })
  return col
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // GET = poll for new signaling data
    if (req.method === 'GET') {
      const code = String(req.query.code || '').toUpperCase()
      const role = String(req.query.role || '')
      const since = Number(req.query.since || 0)
      if (!code || !['host', 'guest'].includes(role)) {
        return res.status(400).json({ error: 'Missing code or invalid role' })
      }
      const col = await getRoomsCollection()
      const room = await col.findOne({ code })
      if (!room) return res.status(404).json({ error: 'Room not found' })
      // Update lastActivity so the room doesn't expire mid-handshake
      col.updateOne({ code }, { $set: { lastActivity: new Date() } }).catch(() => {})
      // Return only what the OTHER side wrote since `since`
      const out: Record<string, unknown> = {}
      if (role === 'host') {
        // Host wants guestSDP + any guest ICE candidates
        if (room.guestSDP && (room.guestSDPAt || 0) > since) {
          out.peerSDP = room.guestSDP
          out.peerProfile = room.guestProfile
          out.peerHandle = room.guestHandle
          out.peerSDPAt = room.guestSDPAt
        }
        out.peerCandidates = (room.guestCandidates || []).filter((c: { t: number }) => c.t > since)
      } else {
        if (room.hostSDPAt && room.hostSDPAt > since) {
          out.peerSDP = room.hostSDP
          out.peerProfile = room.hostProfile
          out.peerHandle = room.hostHandle
          out.peerSDPAt = room.hostSDPAt
        }
        out.peerCandidates = (room.hostCandidates || []).filter((c: { t: number }) => c.t > since)
      }
      out.now = Date.now()
      return res.status(200).json(out)
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = req.body || {}
    const action = body.action
    const col = await getRoomsCollection()
    const now = Date.now()
    const nowDate = new Date()

    if (action === 'create') {
      const { sdp, profile, handle } = body
      if (!sdp || typeof sdp !== 'object') return res.status(400).json({ error: 'Missing sdp' })
      // Try a few times to avoid code collision (6-char from 32 chars = ~1B space)
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = genRoomCode()
        const hostId = genId()
        try {
          await col.insertOne({
            code,
            hostId,
            hostSDP: sdp,
            hostSDPAt: now,
            hostProfile: profile || null,
            hostHandle: handle || 'Player 1',
            hostCandidates: [],
            guestSDP: null,
            guestId: null,
            guestProfile: null,
            guestHandle: null,
            guestCandidates: [],
            createdAt: nowDate,
            lastActivity: nowDate,
          })
          return res.status(200).json({ code, hostId, hostSDPAt: now })
        } catch (e) {
          // Duplicate code, retry
          if ((e as { code?: number }).code === 11000) continue
          throw e
        }
      }
      return res.status(500).json({ error: 'Could not allocate room code' })
    }

    if (action === 'join') {
      const { code: rawCode, sdp, profile, handle } = body
      const code = String(rawCode || '').toUpperCase()
      if (!code || !sdp) return res.status(400).json({ error: 'Missing code or sdp' })
      const guestId = genId()
      const result = await col.findOneAndUpdate(
        { code, guestId: null },  // only join if room is open
        {
          $set: {
            guestId,
            guestSDP: sdp,
            guestSDPAt: now,
            guestProfile: profile || null,
            guestHandle: handle || 'Player 2',
            lastActivity: nowDate,
          },
        },
        { returnDocument: 'after' },
      )
      const room = (result as { value?: Record<string, unknown> })?.value || result
      if (!room || !(room as Record<string, unknown>).code) {
        return res.status(404).json({ error: 'Room not found or already full' })
      }
      const r = room as Record<string, unknown>
      return res.status(200).json({
        guestId,
        hostSDP: r.hostSDP,
        hostSDPAt: r.hostSDPAt,
        hostProfile: r.hostProfile,
        hostHandle: r.hostHandle,
      })
    }

    if (action === 'candidate') {
      const { code: rawCode, role, candidate } = body
      const code = String(rawCode || '').toUpperCase()
      if (!code || !['host', 'guest'].includes(role) || !candidate) {
        return res.status(400).json({ error: 'Missing code/role/candidate' })
      }
      const field = role === 'host' ? 'hostCandidates' : 'guestCandidates'
      await col.updateOne(
        { code },
        {
          $push: { [field]: { c: candidate, t: now } } as never,
          $set: { lastActivity: nowDate },
        },
      )
      return res.status(200).json({ ok: true })
    }

    if (action === 'close') {
      const { code: rawCode } = body
      const code = String(rawCode || '').toUpperCase()
      if (!code) return res.status(400).json({ error: 'Missing code' })
      await col.deleteOne({ code })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[gym/signal] error', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
