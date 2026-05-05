/**
 * Per-game chat — list (GET) + send (POST). Phase 1 auth-optional: identity
 * is a chosen pseudonymous handle + device id (from the client's localStorage).
 *
 * Storage: collection `arena_game_chat` in the shared SoundChain Mongo cluster.
 * Doc shape stays separate from anything music-side — no cross-pollination.
 *
 * Per Frank's CLARITY-Act guardrail, this surface stays free-to-play and
 * never references wagers/stakes/prize pools. Just chat about the game.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { Collection, ObjectId } from 'mongodb'
import { arenaDb } from '@/lib/mongo'

export const config = {
  api: { bodyParser: { sizeLimit: '32kb' } },
}

const SPORT_VALUES = new Set([
  'nba', 'nhl', 'mlb', 'wnba', 'nfl', 'ncaaf', 'ncaab', 'mma', 'epl', 'mls', 'soccer', 'boxing', 'f1',
])

const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]{2,24}$/
const BODY_MAX = 280
const RATE_LIMIT_MS = 3_000 // one message per 3s per device per game
const PAGE_LIMIT = 50

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
  // Reactions are appended lazily on first react via $push / positional $inc.
  // Older docs predate these fields — undefined treated as [].
  reactions?: ChatReactionDoc[]
  // Lowercased handles + tags extracted from the message body at send time.
  // Used for @mention notifs + future hashtag filtering on the cross-game feed.
  mentions?: string[]
  hashtags?: string[]
}

function isProfanity(s: string) {
  // Keep the bar low — server-side block on a tiny obvious-slur set.
  // Real moderation lives in Phase 2 (report button + admin queue).
  const pattern = /\b(fuck|shit|bitch|nigg|fag|cunt|retard)\w*\b/i
  return pattern.test(s)
}

function shapeMessage(doc: ChatDoc, requestDeviceId: string | null) {
  const reactions = Array.isArray(doc.reactions) ? doc.reactions : []
  const myReactions: string[] = requestDeviceId
    ? reactions.filter((r) => Array.isArray(r.reactedBy) && r.reactedBy.includes(requestDeviceId)).map((r) => r.key)
    : []
  return {
    id: doc._id.toString(),
    gameId: doc.gameId,
    sport: doc.sport,
    handle: doc.handle,
    avatar: doc.avatar,
    body: doc.body,
    mediaUrl: doc.mediaUrl ?? null,
    mediaType: doc.mediaType ?? null,
    createdAt: doc.createdAt.toISOString(),
    reactions: reactions.map((r) => ({ key: r.key, kind: r.kind, count: r.count })),
    myReactions,
    isMine: !!requestDeviceId && doc.deviceId === requestDeviceId,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gameId = String(req.query.id || '').trim()
  if (!gameId) return res.status(400).json({ error: 'Missing gameId' })

  if (req.method === 'GET') {
    return handleList(req, res, gameId)
  }
  if (req.method === 'POST') {
    return handleSend(req, res, gameId)
  }
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleList(req: NextApiRequest, res: NextApiResponse, gameId: string) {
  const sport = String(req.query.sport || '').toLowerCase()
  if (!SPORT_VALUES.has(sport)) return res.status(400).json({ error: 'Invalid sport' })

  const requestDeviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : null
  const before = typeof req.query.before === 'string' ? req.query.before : null

  const db = await arenaDb()
  const col = db.collection<ChatDoc>('arena_game_chat')

  const filter: Record<string, unknown> = { gameId, sport }
  if (before) {
    const beforeDate = new Date(before)
    if (!isNaN(beforeDate.getTime())) filter.createdAt = { $lt: beforeDate }
  }

  const docs = await col.find(filter).sort({ createdAt: -1 }).limit(PAGE_LIMIT + 1).toArray()
  const hasMore = docs.length > PAGE_LIMIT
  const page = hasMore ? docs.slice(0, PAGE_LIMIT) : docs
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    messages: page.map((d) => shapeMessage(d, requestDeviceId)),
    nextCursor,
  })
}

async function handleSend(req: NextApiRequest, res: NextApiResponse, gameId: string) {
  const { sport, body, handle, avatar, deviceId, mediaUrl } = (req.body || {}) as {
    sport?: string
    body?: string
    handle?: string
    avatar?: string
    deviceId?: string
    mediaUrl?: string | null
  }

  if (!sport || !SPORT_VALUES.has(sport.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid sport' })
  }
  if (!handle || !HANDLE_PATTERN.test(handle)) {
    return res.status(400).json({ error: 'Pick a handle (2-24 chars, letters/numbers/.-_)' })
  }
  if (!deviceId || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing device id' })
  }

  const trimmed = (body || '').trim()
  const hasMedia = typeof mediaUrl === 'string' && mediaUrl.length > 0
  if (!trimmed && !hasMedia) {
    return res.status(400).json({ error: 'Say something or attach an image' })
  }
  if (trimmed.length > BODY_MAX) {
    return res.status(400).json({ error: `Keep it under ${BODY_MAX} chars` })
  }
  if (hasMedia && !/^https:\/\/(soundchain\.mypinata\.cloud|gateway\.pinata\.cloud|ipfs\.io)\//.test(mediaUrl as string)) {
    // Only accept images we just pinned via /chat-image. Defends against
    // arbitrary remote URLs being injected into the chat.
    return res.status(400).json({ error: 'Image must come from the upload flow' })
  }
  if (trimmed && isProfanity(trimmed)) {
    return res.status(400).json({ error: 'Keep it clean — community guidelines.' })
  }

  const db = await arenaDb()
  const col = db.collection<ChatDoc>('arena_game_chat')

  // Per-device rate limit. Cheap query — covered by an index we'll add lazily.
  const since = new Date(Date.now() - RATE_LIMIT_MS)
  const recent = await col.findOne({ deviceId, createdAt: { $gt: since } }, { sort: { createdAt: -1 } })
  if (recent) {
    return res.status(429).json({ error: 'Easy — wait a few seconds before sending another message.' })
  }

  // Accept emoji avatars (≤8 chars — covers multi-codepoint emoji) OR allow-listed
  // image URLs:
  //   • Pinata gateways for uploads from /api/avatars/upload
  //   • cdn.7tv.app for the SC_EMOTES + 7TV search + 7TV global set
  //   • cdn.betterttv.net for BTTV global emotes
  //   • cdn.frankerfacez.com for FFZ global emotes
  //   • static-cdn.jtvnw.net for Twitch global emotes
  // Anything else falls back to the default emoji to defend against arbitrary
  // remote URLs being injected into the chat row (XSS/phishing/NSFW vector).
  const isEmojiAvatar = avatar && avatar.length <= 8
  const isUrlAvatar = avatar && /^https:\/\/(soundchain\.mypinata\.cloud|gateway\.pinata\.cloud|ipfs\.io|cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com|static-cdn\.jtvnw\.net)\//.test(avatar)
  const safeAvatar = (isEmojiAvatar || isUrlAvatar) ? (avatar as string) : '🏟️'

  // Parse mentions (@handle) + hashtags (#tag) once at write time so reads
  // never have to re-scan. Lowercased so matching is case-insensitive both
  // for the mention notif fan-out below and any future hashtag aggregation.
  const mentions = extractMentions(trimmed)
  const hashtags = extractHashtags(trimmed)

  const doc: ChatDoc = {
    _id: new ObjectId(),
    gameId,
    sport: sport.toLowerCase(),
    handle: handle.trim(),
    avatar: safeAvatar,
    body: trimmed,
    mediaUrl: hasMedia ? (mediaUrl as string) : null,
    mediaType: hasMedia ? 'image' : null,
    deviceId,
    createdAt: new Date(),
    reactions: [],
    mentions,
    hashtags,
  }
  await col.insertOne(doc)

  // Lazy index creation — runs once per cold start, cheap if already exists.
  ensureIndexes(col).catch(() => undefined)

  // Fan out mention notifications. Look up every device that has used each
  // mentioned handle on this collection (handles aren't reserved, so a few
  // can match — that's fine). Skip self-mentions. Best-effort fire-and-forget.
  if (mentions.length > 0) {
    fanOutMentionNotifications({
      db,
      messageId: doc._id.toString(),
      gameId,
      sport: doc.sport,
      actorHandle: doc.handle,
      actorAvatar: doc.avatar,
      actorDeviceId: deviceId,
      preview: trimmed.slice(0, 140),
      mentions,
    }).catch(() => undefined)
  }

  return res.status(201).json(shapeMessage(doc, deviceId))
}

const MENTION_RE_SERVER = /@([a-zA-Z0-9_.-]{2,24})/g
const HASHTAG_RE_SERVER = /#([a-zA-Z0-9_]{1,40})/g

function extractMentions(body: string): string[] {
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = MENTION_RE_SERVER.exec(body))) out.add(m[1].toLowerCase())
  return Array.from(out)
}

function extractHashtags(body: string): string[] {
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = HASHTAG_RE_SERVER.exec(body))) out.add(m[1].toLowerCase())
  return Array.from(out)
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

async function fanOutMentionNotifications(args: {
  db: Awaited<ReturnType<typeof arenaDb>>
  messageId: string
  gameId: string
  sport: string
  actorHandle: string
  actorAvatar: string
  actorDeviceId: string
  preview: string
  mentions: string[]
}) {
  const chatCol = args.db.collection<ChatDoc>('arena_game_chat')
  const notifCol = args.db.collection<ArenaNotificationDoc>('arena_notifications')

  // Find recent devices for each mentioned handle. Use case-insensitive
  // regex anchored at full string. We cap to recent 50 messages per handle
  // to keep this cheap; in practice most handles map to 1-3 devices.
  const targets: Array<{ handle: string; deviceId: string }> = []
  for (const handle of args.mentions) {
    const docs = await chatCol
      .find({ handle: { $regex: `^${escapeRegex(handle)}$`, $options: 'i' } }, { projection: { handle: 1, deviceId: 1 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    const seen = new Set<string>()
    for (const d of docs) {
      if (!d.deviceId || d.deviceId === args.actorDeviceId) continue
      if (seen.has(d.deviceId)) continue
      seen.add(d.deviceId)
      targets.push({ handle: d.handle, deviceId: d.deviceId })
    }
  }
  if (targets.length === 0) return

  const now = new Date()
  const docsToInsert: ArenaNotificationDoc[] = targets.map((t) => ({
    _id: new ObjectId(),
    recipientDeviceId: t.deviceId,
    recipientHandle: t.handle,
    type: 'mention',
    gameId: args.gameId,
    sport: args.sport,
    messageId: args.messageId,
    actorHandle: args.actorHandle,
    actorAvatar: args.actorAvatar,
    preview: args.preview,
    read: false,
    createdAt: now,
  }))
  await notifCol.insertMany(docsToInsert, { ordered: false }).catch(() => undefined)
  ensureNotificationIndexes(notifCol).catch(() => undefined)
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let notifIndexesEnsured = false
async function ensureNotificationIndexes(col: Collection<ArenaNotificationDoc>) {
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

let indexesEnsured = false
async function ensureIndexes(col: Collection<ChatDoc>) {
  if (indexesEnsured) return
  indexesEnsured = true
  try {
    await Promise.all([
      col.createIndex({ gameId: 1, createdAt: -1 }),
      col.createIndex({ deviceId: 1, createdAt: -1 }),
    ])
  } catch {
    indexesEnsured = false
  }
}
