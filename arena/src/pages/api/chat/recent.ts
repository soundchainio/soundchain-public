/**
 * Cross-game live takes feed — surfaces the freshest fan chat from EVERY
 * game in the same Mongo collection (`arena_game_chat`) so the homepage
 * can render an "instant fan engagement" stream the moment a visitor lands.
 *
 * Read-only. POST/PUT/DELETE all live on /api/game/[id]/chat — this endpoint
 * never authors anything. Cheap query (createdAt index already exists from
 * the per-game endpoint's lazy index creation).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Collection, ObjectId } from 'mongodb'
import { arenaDb } from '@/lib/mongo'

const HARD_LIMIT = 30
const DEFAULT_LIMIT = 12

type ChatReactionDoc = {
  key: string
  kind: 'emoji' | 'image'
  count: number
  reactedBy: string[]
}

type ChatDoc = {
  _id: ObjectId
  gameId: string
  sport: string
  handle: string
  avatar: string
  body: string
  mediaUrl?: string | null
  mediaType?: 'image' | null
  deviceId: string
  createdAt: Date
  reactions?: ChatReactionDoc[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limitRaw = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(HARD_LIMIT, limitRaw)) : DEFAULT_LIMIT
  const requestDeviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : null

  const db = await arenaDb()
  const col = db.collection<ChatDoc>('arena_game_chat')

  // Newest-first across the entire collection. The compound index
  // {gameId:1, createdAt:-1} doesn't help here, but createdAt-only sort
  // on a small collection is fast enough; a {createdAt:-1} index gets
  // added the first time recent is hit if missing.
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  ensureIndex(col).catch(() => undefined)

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    messages: docs.map((d) => {
      const reactions = Array.isArray(d.reactions) ? d.reactions : []
      const myReactions: string[] = requestDeviceId
        ? reactions.filter((r) => Array.isArray(r.reactedBy) && r.reactedBy.includes(requestDeviceId)).map((r) => r.key)
        : []
      return {
        id: d._id.toString(),
        gameId: d.gameId,
        sport: d.sport,
        handle: d.handle,
        avatar: d.avatar,
        body: d.body,
        mediaUrl: d.mediaUrl ?? null,
        mediaType: d.mediaType ?? null,
        createdAt: d.createdAt.toISOString(),
        reactions: reactions.map((r) => ({ key: r.key, kind: r.kind, count: r.count })),
        myReactions,
      }
    }),
  })
}

let indexEnsured = false
async function ensureIndex(col: Collection<ChatDoc>) {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await col.createIndex({ createdAt: -1 })
  } catch {
    indexEnsured = false
  }
}
