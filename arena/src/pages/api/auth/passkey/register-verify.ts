/**
 * Passkey registration — phase 2: verify the WebAuthn registration response.
 *
 * Frontend POSTs `{ deviceId, response }` where `response` is the raw output
 * of `navigator.credentials.create({ publicKey: options })`. We verify it
 * against the challenge stored in the signed cookie from phase 1, then store
 * the credential public key on `arena_handles` and issue the session JWT.
 *
 * After this succeeds, the user can sign in on any device with iCloud
 * Keychain / Google Password Manager sync, OR use the same device's Face ID
 * after history wipes.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { arenaDb } from '@/lib/mongo'
import {
  PASSKEY_RP_ID,
  PASSKEY_ORIGIN,
  readPasskeyChallengeCookie,
  verifyPasskeyChallenge,
  clearPasskeyChallengeCookie,
  signSession,
  setSessionCookie,
  identityKeyFor,
  getProviderConfig,
} from '@/lib/auth'

export const config = { runtime: 'nodejs' }

interface ArenaHandleDoc {
  deviceId?: string
  appleSub?: string
  googleSub?: string
  passkeyUserId?: string
  passkeyCredentials?: { credentialId: string; publicKey: string; counter: number; transports?: string[] }[]
  handle?: string
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
    col.createIndex({ passkeyUserId: 1 }, { unique: true, sparse: true, background: true }),
    col.createIndex({ 'passkeyCredentials.credentialId': 1 }, { sparse: true, background: true }),
    col.createIndex({ handleLower: 1 }, { background: true }),
  ])
  indexesEnsured = true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!getProviderConfig().passkey) {
    return res.status(503).json({ error: 'Passkey not configured.' })
  }

  const { deviceId, response } = (req.body || {}) as {
    deviceId?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response?: any
  }
  if (!deviceId || !response) {
    return res.status(400).json({ error: 'Missing deviceId or registration response' })
  }

  const challengeToken = readPasskeyChallengeCookie(req)
  if (!challengeToken) {
    return res.status(400).json({ error: 'No active passkey ceremony — start over' })
  }
  const stored = await verifyPasskeyChallenge(challengeToken)
  if (!stored || stored.ceremony !== 'register') {
    return res.status(400).json({ error: 'Invalid ceremony state' })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: PASSKEY_ORIGIN,
      expectedRPID: PASSKEY_RP_ID,
      requireUserVerification: false, // platform UV signal varies; rely on origin + challenge binding
    })
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error)?.message || 'Registration verification failed' })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'Registration not verified' })
  }

  const { credential } = verification.registrationInfo
  const credentialId = credential.id
  const publicKey = Buffer.from(credential.publicKey).toString('base64url')
  const counter = credential.counter
  const transports = (response.response?.transports as string[] | undefined) || ['internal', 'hybrid']

  const passkeyUserId = stored.passkeyUserId || randomUserId()
  const identityKey = identityKeyFor('passkey', passkeyUserId)
  const sessionToken = await signSession(identityKey, 'passkey')
  if (!sessionToken) {
    return res.status(503).json({ error: 'Session signing not configured.' })
  }

  let existingHandle: { handle?: string; avatar?: string } = {}
  try {
    const db = await arenaDb()
    ensureIndexes(db).catch(() => undefined)
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    const now = new Date()

    // First check if this passkey is being added to an existing deviceId row.
    const existing = await col.findOne(
      { $or: [{ passkeyUserId }, { deviceId }] },
      { projection: { handle: 1, avatar: 1, passkeyCredentials: 1 } },
    )
    existingHandle = { handle: existing?.handle, avatar: existing?.avatar }
    const existingCreds = existing?.passkeyCredentials || []
    const newCredEntry = { credentialId, publicKey, counter, transports }

    if (existing) {
      // Augment existing row with passkey identity + new credential.
      await col.updateOne(
        { _id: existing._id },
        {
          $set: {
            passkeyUserId,
            passkeyCredentials: [...existingCreds.filter((c) => c.credentialId !== credentialId), newCredEntry],
            updatedAt: now,
          },
        },
      )
    } else {
      await col.insertOne({
        deviceId,
        passkeyUserId,
        passkeyCredentials: [newCredEntry],
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (e) {
    return res.status(503).json({ error: 'Storage unavailable' })
  }

  clearPasskeyChallengeCookie(res)
  setSessionCookie(res, sessionToken)
  return res.status(200).json({
    ok: true,
    provider: 'passkey',
    identityKey,
    handle: existingHandle.handle ?? null,
    avatar: existingHandle.avatar ?? null,
  })
}

function randomUserId(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Buffer.from(bytes).toString('base64url')
}
