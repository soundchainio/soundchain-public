/**
 * Sign in with Apple — id_token verify + session issue.
 *
 * Frontend flow (web): Apple JS API renders a native-feeling popup, returns
 * `{ authorization: { id_token, code, state }, user? }`. Frontend POSTs the
 * `id_token` here. We verify it against Apple's JWKS, extract the stable `sub`,
 * upsert `arena_handles` keyed on `appleSub`, and issue an arena session cookie.
 *
 * Native trajectory (Capacitor iOS): @capacitor-community/apple-sign-in returns
 * the same id_token shape. POSTs to this same endpoint. Zero server change.
 *
 * No cross-coupling with SoundChain auth — this lives entirely in the arena
 * project. Server only needs `APPLE_CLIENT_ID` (Services ID) + `ARENA_SESSION_SECRET`.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import {
  verifyAppleIdToken,
  signSession,
  setSessionCookie,
  identityKeyFor,
  getAppleClientId,
} from '@/lib/auth'

export const config = { runtime: 'nodejs' }

interface ArenaHandleDoc {
  deviceId?: string
  appleSub?: string
  googleSub?: string
  handle?: string
  handleLower?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

let indexesEnsured = false
async function ensureIndexes(db: Awaited<ReturnType<typeof arenaDb>>) {
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

  if (!getAppleClientId()) {
    return res.status(503).json({ error: 'Apple sign-in not configured. APPLE_CLIENT_ID env var missing.' })
  }

  const { id_token, deviceId } = (req.body || {}) as { id_token?: string; deviceId?: string }
  if (!id_token || typeof id_token !== 'string') {
    return res.status(400).json({ error: 'Missing id_token' })
  }

  const verified = await verifyAppleIdToken(id_token)
  if (!verified) {
    return res.status(401).json({ error: 'Invalid Apple id_token' })
  }

  const identityKey = identityKeyFor('apple', verified.sub)
  const sessionToken = await signSession(identityKey, 'apple')
  if (!sessionToken) {
    return res.status(503).json({ error: 'Session signing not configured. ARENA_SESSION_SECRET missing.' })
  }

  // Upsert by appleSub. If deviceId is provided AND no row exists yet for this
  // appleSub, link the deviceId so legacy guest takes can be claimed by this
  // identity going forward (best-effort, not load-bearing).
  let existingHandle: { handle?: string; avatar?: string } = {}
  try {
    const db = await arenaDb()
    ensureIndexes(db).catch(() => undefined)
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    const now = new Date()
    const existing = await col.findOne({ appleSub: verified.sub })
    if (existing) {
      existingHandle = { handle: existing.handle, avatar: existing.avatar }
      await col.updateOne(
        { appleSub: verified.sub },
        { $set: { updatedAt: now } },
      )
    } else {
      await col.insertOne({
        appleSub: verified.sub,
        deviceId: typeof deviceId === 'string' && deviceId.length >= 8 ? deviceId : undefined,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch {
    // Mongo unreachable — still issue the session so user can pick a handle.
    // Save flow will retry on Mongo reconnect.
  }

  setSessionCookie(res, sessionToken)
  return res.status(200).json({
    ok: true,
    provider: 'apple',
    identityKey,
    handle: existingHandle.handle ?? null,
    avatar: existingHandle.avatar ?? null,
  })
}
