/**
 * Persist `{deviceId, handle, avatar}` to the `arena_handles` Mongo collection.
 *
 * Phase 1 (deviceId-keyed): Pseudonymous device-keyed identity. Handle + avatar
 * lived ONLY in localStorage and as denormalized snapshots on each chat
 * message. Clearing localStorage = total identity loss.
 *
 * Phase 2 (auth-keyed): If the request carries a valid arena session cookie
 * (Sign in with Apple / Google), we upsert keyed on `appleSub` / `googleSub`
 * INSTEAD of `deviceId`. Same identity follows the user across devices and
 * survives history wipes — they just sign in again on the new device.
 *
 * The frontend resolves which key to use:
 *   - Authed: backend reads session cookie → keys on auth sub
 *   - Guest: backend keys on deviceId (today's flow)
 *
 * Avatar is validated against the same allow-list mirrored across identity.ts /
 * chat.ts / chat-react.ts — single source-of-truth regex prevents render-time
 * XSS / phishing vectors regardless of which identity key wrote the row.
 *
 * Edge runtime — single Mongo write, low latency.
 */

import { arenaDb } from '@/lib/mongo'
import { readSession } from '@/lib/auth'

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
  deviceId?: string
  appleSub?: string
  googleSub?: string
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
    col.createIndex({ deviceId: 1 }, { unique: true, sparse: true, background: true }),
    col.createIndex({ appleSub: 1 }, { unique: true, sparse: true, background: true }),
    col.createIndex({ googleSub: 1 }, { unique: true, sparse: true, background: true }),
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

  if (rawHandle.length < HANDLE_MIN || rawHandle.length > HANDLE_MAX) {
    return res.status(400).json({ error: `Handle must be ${HANDLE_MIN}-${HANDLE_MAX} characters` })
  }
  if (!HANDLE_PATTERN.test(rawHandle)) {
    return res.status(400).json({ error: 'Letters, numbers, dot, dash, underscore only' })
  }

  // Avatar must be either a short emoji string (≤8 chars to cover multi-codepoint
  // emoji like 🏎️) OR a URL on the allow-listed host set.
  const isEmoji = rawAvatar.length > 0 && rawAvatar.length <= 8
  const isUrl = URL_AVATAR_HOST_RE.test(rawAvatar)
  if (!isEmoji && !isUrl) {
    return res.status(400).json({ error: 'Invalid avatar' })
  }

  // Phase 2: prefer the session cookie identity if present. Falls back to
  // deviceId for guests. Either way, exactly one identity field is set on
  // the doc — sparse unique indexes guarantee no cross-row collisions.
  const session = await readSession(req)
  let filter: Record<string, string>
  let setOnInsert: Partial<ArenaHandleDoc>
  if (session?.provider === 'apple') {
    const sub = session.identityKey.slice('apple:'.length)
    filter = { appleSub: sub }
    setOnInsert = { appleSub: sub, deviceId: deviceId.length >= 8 ? deviceId : undefined }
  } else if (session?.provider === 'google') {
    const sub = session.identityKey.slice('google:'.length)
    filter = { googleSub: sub }
    setOnInsert = { googleSub: sub, deviceId: deviceId.length >= 8 ? deviceId : undefined }
  } else {
    if (!deviceId || deviceId.length < 8) {
      return res.status(400).json({ error: 'Missing device id' })
    }
    filter = { deviceId }
    setOnInsert = { deviceId }
  }

  let db: Awaited<ReturnType<typeof arenaDb>>
  try {
    db = await arenaDb()
  } catch (err) {
    return res.status(503).json({ error: 'Handle storage unavailable' })
  }

  ensureIndexes(db).catch(() => undefined)

  const now = new Date()
  const col = db.collection<ArenaHandleDoc>('arena_handles')

  await col.updateOne(
    filter,
    {
      $set: {
        handle: rawHandle,
        handleLower: rawHandle.toLowerCase(),
        avatar: rawAvatar,
        updatedAt: now,
      },
      $setOnInsert: {
        ...setOnInsert,
        createdAt: now,
      },
    },
    { upsert: true },
  )

  return res.status(200).json({
    ok: true,
    handle: rawHandle,
    avatar: rawAvatar,
    provider: session?.provider ?? 'guest',
  })
}
