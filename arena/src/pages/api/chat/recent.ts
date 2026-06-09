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
  editedAt?: Date
  replyTo?: string
  replyToHandle?: string
  replyToPreview?: string
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
  // Thread mode: ?thread=<messageId> returns that take's replies, oldest-first
  // (chat order) so the homepage feed can expand an inline reply thread —
  // exactly like the feed/wall posts on soundchain.io.
  const threadId = typeof req.query.thread === 'string' ? req.query.thread : null

  const db = await arenaDb()
  const col = db.collection<ChatDoc>('arena_game_chat')

  // Thread = a parent's replies oldest-first; feed = newest takes across all games.
  const docs = threadId
    ? await col.find({ replyTo: threadId }).sort({ createdAt: 1 }).limit(HARD_LIMIT).toArray()
    : await col.find({}).sort({ createdAt: -1 }).limit(limit).toArray()

  ensureIndex(col).catch(() => undefined)

  // Reply counts for the returned takes so the feed can show "N replies" under
  // each one (skip in thread mode — replies aren't themselves expanded here).
  const countMap = new Map<string, number>()
  if (!threadId && docs.length) {
    const ids = docs.map((d) => d._id.toString())
    const agg = await col
      .aggregate<{ _id: string; n: number }>([
        { $match: { replyTo: { $in: ids } } },
        { $group: { _id: '$replyTo', n: { $sum: 1 } } },
      ])
      .toArray()
    for (const c of agg) countMap.set(String(c._id), c.n)
  }

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
        editedAt: d.editedAt ? d.editedAt.toISOString() : null,
        replyTo: d.replyTo ?? null,
        replyToHandle: d.replyToHandle ?? null,
        replyToPreview: d.replyToPreview ?? null,
        reactions: reactions.map((r) => ({ key: r.key, kind: r.kind, count: r.count })),
        myReactions,
        replyCount: countMap.get(d._id.toString()) ?? 0,
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
