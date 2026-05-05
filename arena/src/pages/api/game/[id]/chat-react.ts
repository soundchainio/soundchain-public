/**
 * Toggle a reaction on a chat message.
 *
 * Reactions are emoji unicode chars OR image URLs from the allow-listed
 * emote CDNs (7TV / BTTV / FFZ / Twitch / Pinata). Per-device toggle:
 * one device can apply many distinct reaction keys but the same key only
 * counts once. Atomic writes use Mongo positional updates so concurrent
 * reacts don't double-count.
 *
 * Side-effect: every successful "add" queues a notification doc against
 * the message author's deviceId so the bell + future native push light up.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Collection, ObjectId } from 'mongodb'
import { arenaDb } from '@/lib/mongo'

export const config = {
  api: { bodyParser: { sizeLimit: '4kb' } },
}

const SPORT_VALUES = new Set([
  'nba', 'nhl', 'mlb', 'wnba', 'nfl', 'ncaaf', 'ncaab', 'mma', 'epl', 'mls', 'soccer', 'boxing', 'f1',
])

const REACTION_KEY_MAX = 256
const RATE_LIMIT_MS = 600 // one react per device per 600ms — defends against spam-tap

// Allowed image hosts mirror identity.ts so a malicious URL can't be
// injected as a reaction (XSS / phishing / NSFW vector).
const URL_REACTION_HOST_RE = /^https:\/\/(soundchain\.mypinata\.cloud|gateway\.pinata\.cloud|ipfs\.io|cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com|static-cdn\.jtvnw\.net)\//

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
  deviceId: string
  createdAt: Date
  reactions?: ChatReactionDoc[]
}

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

const lastReactByDevice = new Map<string, number>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const gameId = String(req.query.id || '').trim()
  if (!gameId) return res.status(400).json({ error: 'Missing gameId' })

  const { sport, messageId, reactionKey, reactionKind, toggle, deviceId } = (req.body || {}) as {
    sport?: string
    messageId?: string
    reactionKey?: string
    reactionKind?: 'emoji' | 'image'
    toggle?: 'add' | 'remove'
    deviceId?: string
  }

  if (!sport || !SPORT_VALUES.has(sport.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid sport' })
  }
  if (!messageId || !ObjectId.isValid(messageId)) {
    return res.status(400).json({ error: 'Invalid messageId' })
  }
  if (!deviceId || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing device id' })
  }
  if (toggle !== 'add' && toggle !== 'remove') {
    return res.status(400).json({ error: 'Invalid toggle' })
  }
  if (!reactionKey || typeof reactionKey !== 'string' || reactionKey.length === 0 || reactionKey.length > REACTION_KEY_MAX) {
    return res.status(400).json({ error: 'Invalid reaction' })
  }
  if (reactionKind !== 'emoji' && reactionKind !== 'image') {
    return res.status(400).json({ error: 'Invalid reaction kind' })
  }
  if (reactionKind === 'image' && !URL_REACTION_HOST_RE.test(reactionKey)) {
    return res.status(400).json({ error: 'Image reaction must come from an allow-listed CDN' })
  }
  if (reactionKind === 'emoji' && reactionKey.length > 16) {
    return res.status(400).json({ error: 'Emoji too long' })
  }

  const now = Date.now()
  const last = lastReactByDevice.get(deviceId) ?? 0
  if (now - last < RATE_LIMIT_MS) {
    return res.status(429).json({ error: 'Easy — one reaction at a time.' })
  }
  lastReactByDevice.set(deviceId, now)

  const db = await arenaDb()
  const col = db.collection<ChatDoc>('arena_game_chat')
  const _id = new ObjectId(messageId)

  if (toggle === 'add') {
    // Try positional update on existing entry first ($addToSet on reactedBy
    // is idempotent — if the device already reacted with this key, count
    // doesn't change because we skip $inc unless the reactedBy actually grew).
    const existing = await col.findOne(
      { _id, gameId, sport: sport.toLowerCase(), 'reactions.key': reactionKey },
      { projection: { 'reactions.$': 1 } },
    )
    if (existing && existing.reactions && existing.reactions.length > 0) {
      const entry = existing.reactions[0]
      const already = Array.isArray(entry.reactedBy) && entry.reactedBy.includes(deviceId)
      if (!already) {
        await col.updateOne(
          { _id, 'reactions.key': reactionKey },
          {
            $inc: { 'reactions.$.count': 1 },
            $addToSet: { 'reactions.$.reactedBy': deviceId },
          },
        )
      }
    } else {
      // First reaction with this key — push a fresh entry. Conditional on
      // the key NOT existing yet so two concurrent first-reactions don't
      // create duplicate entries.
      const r = await col.updateOne(
        { _id, 'reactions.key': { $ne: reactionKey } },
        {
          $push: {
            reactions: {
              key: reactionKey,
              kind: reactionKind,
              count: 1,
              reactedBy: [deviceId],
            },
          },
        },
      )
      if (r.matchedCount === 0) {
        // Race: another tap landed first. Retry as the "add to existing" path.
        await col.updateOne(
          { _id, 'reactions.key': reactionKey, 'reactions.reactedBy': { $ne: deviceId } },
          {
            $inc: { 'reactions.$.count': 1 },
            $addToSet: { 'reactions.$.reactedBy': deviceId },
          },
        )
      }
    }
  } else {
    // remove
    await col.updateOne(
      { _id, 'reactions.key': reactionKey, 'reactions.reactedBy': deviceId },
      {
        $inc: { 'reactions.$.count': -1 },
        $pull: { 'reactions.$.reactedBy': deviceId },
      },
    )
    // Sweep any zero-count entries left behind. Cheap enough — typical
    // arrays stay tiny because most takes get a handful of distinct keys.
    await col.updateOne(
      { _id },
      { $pull: { reactions: { count: { $lte: 0 } } } },
    )
  }

  // Re-read to return authoritative state.
  const fresh = await col.findOne({ _id })
  if (!fresh) return res.status(404).json({ error: 'Take not found' })
  const reactions = Array.isArray(fresh.reactions) ? fresh.reactions : []
  const myReactions = reactions
    .filter((r) => Array.isArray(r.reactedBy) && r.reactedBy.includes(deviceId))
    .map((r) => r.key)

  // Fire reaction notification on add (skip self-react). Best-effort — the
  // chat reaction succeeds regardless of notif outcome.
  if (toggle === 'add' && fresh.deviceId && fresh.deviceId !== deviceId) {
    queueReactionNotif({
      db,
      message: fresh,
      reactorDeviceId: deviceId,
      reactionKey,
      reactionKind,
    }).catch(() => undefined)
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    reactions: reactions.map((r) => ({ key: r.key, kind: r.kind, count: r.count })),
    myReactions,
  })
}

async function queueReactionNotif(args: {
  db: Awaited<ReturnType<typeof arenaDb>>
  message: ChatDoc
  reactorDeviceId: string
  reactionKey: string
  reactionKind: 'emoji' | 'image'
}) {
  const { db, message, reactorDeviceId, reactionKey, reactionKind } = args
  const chatCol = db.collection<ChatDoc>('arena_game_chat')
  const notifCol = db.collection<ArenaNotificationDoc>('arena_notifications')

  // Need the reactor's handle/avatar — pull their most recent take in this
  // collection. Fast (covered by existing deviceId index).
  const reactor = await chatCol.findOne(
    { deviceId: reactorDeviceId },
    { projection: { handle: 1, avatar: 1 }, sort: { createdAt: -1 } },
  )
  const actorHandle = reactor?.handle || 'someone'
  const actorAvatar = reactor?.avatar || '🏟️'

  await notifCol.insertOne({
    _id: new ObjectId(),
    recipientDeviceId: message.deviceId,
    recipientHandle: message.handle,
    type: 'reaction',
    gameId: message.gameId,
    sport: message.sport,
    messageId: message._id.toString(),
    actorHandle,
    actorAvatar,
    preview: (message.body || '').slice(0, 140),
    reactionKey,
    reactionKind,
    read: false,
    createdAt: new Date(),
  })
  ensureNotifIndexes(notifCol).catch(() => undefined)
}

let notifIndexesEnsured = false
async function ensureNotifIndexes(col: Collection<ArenaNotificationDoc>) {
  if (notifIndexesEnsured) return
  notifIndexesEnsured = true
  try {
    await Promise.all([
      col.createIndex({ recipientDeviceId: 1, createdAt: -1 }),
      col.createIndex({ recipientDeviceId: 1, read: 1 }),
    ])
  } catch {
    notifIndexesEnsured = false
  }
}
