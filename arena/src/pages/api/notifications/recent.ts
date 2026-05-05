/**
 * Recent notifications for the requesting device. Read-only.
 *
 * Native-push-ready: when arena ships the Capacitor shell, this endpoint
 * (or a poll/subscribe variant of it) is what the native worker will pull
 * to render OS-level push. Keeping it deviceId-keyed means today's
 * pseudonymous-handle UX maps cleanly into push targeting tomorrow.
 *
 * `?markRead=1` flips all unread notifs for the device to read at the end
 * of the response — atomic inside one request.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Collection, ObjectId } from 'mongodb'
import { arenaDb } from '@/lib/mongo'

const HARD_LIMIT = 50
const DEFAULT_LIMIT = 20

type ArenaNotificationDoc = {
  _id: ObjectId
  recipientDeviceId: string
  recipientHandle: string
  type: 'mention' | 'reaction'
  gameId: string
  sport: string
  messageId: string
  actorHandle: string
  actorAvatar: string
  preview: string
  reactionKey?: string
  reactionKind?: 'emoji' | 'image'
  read: boolean
  createdAt: Date
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : ''
  if (!deviceId || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing device id' })
  }

  const limitRaw = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(HARD_LIMIT, limitRaw)) : DEFAULT_LIMIT
  const markRead = String(req.query.markRead ?? '') === '1'

  const db = await arenaDb()
  const col = db.collection<ArenaNotificationDoc>('arena_notifications')

  const docs = await col
    .find({ recipientDeviceId: deviceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  const unreadCount = await col.countDocuments({ recipientDeviceId: deviceId, read: false })

  if (markRead) {
    await col.updateMany({ recipientDeviceId: deviceId, read: false }, { $set: { read: true } })
  }

  ensureIndexes(col).catch(() => undefined)

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    notifications: docs.map((d) => ({
      id: d._id.toString(),
      type: d.type,
      gameId: d.gameId,
      sport: d.sport,
      messageId: d.messageId,
      actorHandle: d.actorHandle,
      actorAvatar: d.actorAvatar,
      preview: d.preview,
      reactionKey: d.reactionKey ?? null,
      reactionKind: d.reactionKind ?? null,
      read: !!d.read,
      createdAt: d.createdAt.toISOString(),
    })),
    unreadCount: markRead ? 0 : unreadCount,
  })
}

let indexesEnsured = false
async function ensureIndexes(col: Collection<ArenaNotificationDoc>) {
  if (indexesEnsured) return
  indexesEnsured = true
  try {
    await Promise.all([
      col.createIndex({ recipientDeviceId: 1, createdAt: -1 }),
      col.createIndex({ recipientDeviceId: 1, read: 1 }),
    ])
  } catch {
    indexesEnsured = false
  }
}
