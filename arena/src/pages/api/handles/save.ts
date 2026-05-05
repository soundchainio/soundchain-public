/**
 * Persist `{deviceId, handle, avatar}` to the `arena_handles` Mongo collection.
 *
 * Phase 1 = pseudonymous device-keyed identity. Before this endpoint, handle +
 * avatar lived ONLY in localStorage + as denormalized snapshots on each chat
 * message. Two consequences:
 *   - Clearing localStorage = total identity loss (deviceId regenerates too,
 *     so server-side recovery isn't possible — that's by design for Phase 1).
 *   - The "central record" of "who is @courtside_kid right now" had no home;
 *     mention fan-out had to scan the chat collection.
 *
 * Now: HandlePickerModal fires-and-forgets to this endpoint on save. The doc
 * is upserted on `deviceId`. Future surfaces (verified-handle checkmark,
 * handle reservation, profile lookup, mention auto-complete) read from here.
 *
 * Avatar is validated against the same allow-list mirrored across identity.ts /
 * chat.ts / chat-react.ts so an arbitrary URL injection here can't poison the
 * render path elsewhere. Emoji avatars (≤8 chars) bypass the URL check.
 *
 * Edge runtime — single Mongo write, no auth, low latency.
 */

import { arenaDb } from '@/lib/mongo'

export const config = {
  runtime: 'nodejs',
}

// Mirrors arena/src/lib/identity.ts URL_AVATAR_HOST_RE exactly. Keep in sync.
const URL_AVATAR_HOST_RE =
  /^https:\/\/(soundchain\.mypinata\.cloud|gateway\.pinata\.cloud|ipfs\.io|cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com|static-cdn\.jtvnw\.net)\//

const HANDLE_MAX = 24
const HANDLE_MIN = 2
const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]+$/

interface SaveBody {
  deviceId?: string
  handle?: string
  avatar?: string
}

interface ArenaHandleDoc {
  deviceId: string
  handle: string
  handleLower: string
  avatar: string
  createdAt: Date
  updatedAt: Date
}

import type { NextApiRequest, NextApiResponse } from 'next'

let indexesEnsured = false
async function ensureIndexes(
  db: Awaited<ReturnType<typeof arenaDb>>,
): Promise<void> {
  if (indexesEnsured) return
  const col = db.collection<ArenaHandleDoc>('arena_handles')
  await Promise.all([
    col.createIndex({ deviceId: 1 }, { unique: true, background: true }),
    col.createIndex({ handleLower: 1 }, { background: true }),
  ])
  indexesEnsured = true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const body = (req.body || {}) as SaveBody
  const deviceId = String(body.deviceId || '')
  const rawHandle = String(body.handle || '').trim()
  const rawAvatar = String(body.avatar || '')

  if (!deviceId || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing device id' })
  }
  if (rawHandle.length < HANDLE_MIN || rawHandle.length > HANDLE_MAX) {
    return res.status(400).json({ error: `Handle must be ${HANDLE_MIN}-${HANDLE_MAX} characters` })
  }
  if (!HANDLE_PATTERN.test(rawHandle)) {
    return res.status(400).json({ error: 'Letters, numbers, dot, dash, underscore only' })
  }

  // Avatar must be either a short emoji string (≤8 chars to cover multi-codepoint
  // emoji like 🏎️) OR a URL on the allow-listed host set. Anything else gets
  // rejected so we don't persist a render-time XSS/phishing vector.
  const isEmoji = rawAvatar.length > 0 && rawAvatar.length <= 8
  const isUrl = URL_AVATAR_HOST_RE.test(rawAvatar)
  if (!isEmoji && !isUrl) {
    return res.status(400).json({ error: 'Invalid avatar' })
  }

  let db: Awaited<ReturnType<typeof arenaDb>>
  try {
    db = await arenaDb()
  } catch (err) {
    // Mongo unreachable — degrade gracefully. Caller is fire-and-forget anyway,
    // so the user's localStorage state still works. Phase 2 verified handles
    // will rely on this being live; Phase 1 chat survives without it.
    return res.status(503).json({ error: 'Handle storage unavailable' })
  }

  ensureIndexes(db).catch(() => undefined)

  const now = new Date()
  const col = db.collection<ArenaHandleDoc>('arena_handles')

  await col.updateOne(
    { deviceId },
    {
      $set: {
        handle: rawHandle,
        handleLower: rawHandle.toLowerCase(),
        avatar: rawAvatar,
        updatedAt: now,
      },
      $setOnInsert: {
        deviceId,
        createdAt: now,
      },
    },
    { upsert: true },
  )

  return res.status(200).json({ ok: true, handle: rawHandle, avatar: rawAvatar })
}
