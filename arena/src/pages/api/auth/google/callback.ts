/**
 * Sign in with Google — id_token verify + session issue.
 *
 * Frontend flow (web): Google Identity Services renders the One Tap or button,
 * returns `{ credential: id_token }`. Frontend POSTs the id_token here.
 *
 * Native trajectory (Capacitor Android): @codetrix-studio/capacitor-google-auth
 * returns the same id_token shape. POSTs to this same endpoint.
 *
 * No third-party SDK on server — pure JWT verify against Google's JWKS.
 * Server only needs `GOOGLE_CLIENT_ID` + `ARENA_SESSION_SECRET`.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import {
  verifyGoogleIdToken,
  signSession,
  setSessionCookie,
  identityKeyFor,
  getGoogleClientId,
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

  if (!getGoogleClientId()) {
    return res.status(503).json({ error: 'Google sign-in not configured. GOOGLE_CLIENT_ID env var missing.' })
  }

  const { id_token, deviceId } = (req.body || {}) as { id_token?: string; deviceId?: string }
  if (!id_token || typeof id_token !== 'string') {
    return res.status(400).json({ error: 'Missing id_token' })
  }

  const verified = await verifyGoogleIdToken(id_token)
  if (!verified) {
    return res.status(401).json({ error: 'Invalid Google id_token' })
  }

  const identityKey = identityKeyFor('google', verified.sub)
  const sessionToken = await signSession(identityKey, 'google')
  if (!sessionToken) {
    return res.status(503).json({ error: 'Session signing not configured. ARENA_SESSION_SECRET missing.' })
  }

  let existingHandle: { handle?: string; avatar?: string } = {}
  try {
    const db = await arenaDb()
    ensureIndexes(db).catch(() => undefined)
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    const now = new Date()
    const existing = await col.findOne({ googleSub: verified.sub })
    if (existing) {
      existingHandle = { handle: existing.handle, avatar: existing.avatar }
      await col.updateOne(
        { googleSub: verified.sub },
        { $set: { updatedAt: now } },
      )
    } else {
      await col.insertOne({
        googleSub: verified.sub,
        deviceId: typeof deviceId === 'string' && deviceId.length >= 8 ? deviceId : undefined,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch {
    // Same posture as Apple callback — issue session even if Mongo is down.
  }

  setSessionCookie(res, sessionToken)
  return res.status(200).json({
    ok: true,
    provider: 'google',
    identityKey,
    handle: existingHandle.handle ?? null,
    avatar: existingHandle.avatar ?? null,
  })
}
