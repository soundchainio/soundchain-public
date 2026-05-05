/**
 * Passkey login — phase 2: verify the WebAuthn assertion + issue session.
 *
 * Frontend POSTs the raw output of `navigator.credentials.get(...)`. We look
 * up the credential by `credentialId`, verify the signature against the
 * stored public key, bump the counter, and issue the arena session cookie.
 *
 * The `arena_handles` row's persisted `handle` + `avatar` are returned so
 * the frontend can mirror them into localStorage — same flow as Apple/Google
 * callback. Cross-device handle restore in one round-trip + Face ID.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { ObjectId } from 'mongodb'
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
  _id?: ObjectId
  deviceId?: string
  passkeyUserId?: string
  passkeyCredentials?: { credentialId: string; publicKey: string; counter: number; transports?: string[] }[]
  handle?: string
  avatar?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!getProviderConfig().passkey) {
    return res.status(503).json({ error: 'Passkey not configured.' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { response } = (req.body || {}) as { response?: any }
  if (!response?.id) {
    return res.status(400).json({ error: 'Missing assertion response' })
  }

  const challengeToken = readPasskeyChallengeCookie(req)
  if (!challengeToken) {
    return res.status(400).json({ error: 'No active passkey ceremony — start over' })
  }
  const stored = await verifyPasskeyChallenge(challengeToken)
  if (!stored || stored.ceremony !== 'login') {
    return res.status(400).json({ error: 'Invalid ceremony state' })
  }

  let doc: ArenaHandleDoc | null = null
  try {
    const db = await arenaDb()
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    doc = await col.findOne({ 'passkeyCredentials.credentialId': response.id })
  } catch {
    return res.status(503).json({ error: 'Storage unavailable' })
  }
  if (!doc || !doc.passkeyUserId) {
    return res.status(404).json({ error: 'No matching passkey — register first?' })
  }

  const cred = (doc.passkeyCredentials || []).find((c) => c.credentialId === response.id)
  if (!cred) {
    return res.status(404).json({ error: 'No matching credential' })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: PASSKEY_ORIGIN,
      expectedRPID: PASSKEY_RP_ID,
      credential: {
        id: cred.credentialId,
        publicKey: Buffer.from(cred.publicKey, 'base64url'),
        counter: cred.counter,
        transports: cred.transports as ('internal' | 'hybrid' | 'usb' | 'nfc' | 'ble' | 'cable' | 'smart-card')[] | undefined,
      },
      requireUserVerification: false,
    })
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error)?.message || 'Authentication verification failed' })
  }

  if (!verification.verified) {
    return res.status(400).json({ error: 'Authentication not verified' })
  }

  // Bump the credential counter (replay-attack defense).
  try {
    const db = await arenaDb()
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    await col.updateOne(
      { _id: doc._id, 'passkeyCredentials.credentialId': cred.credentialId },
      { $set: { 'passkeyCredentials.$.counter': verification.authenticationInfo.newCounter } },
    )
  } catch {
    // Counter bump is best-effort — auth still succeeded.
  }

  const identityKey = identityKeyFor('passkey', doc.passkeyUserId)
  const sessionToken = await signSession(identityKey, 'passkey')
  if (!sessionToken) {
    return res.status(503).json({ error: 'Session signing not configured.' })
  }

  clearPasskeyChallengeCookie(res)
  setSessionCookie(res, sessionToken)
  return res.status(200).json({
    ok: true,
    provider: 'passkey',
    identityKey,
    handle: doc.handle ?? null,
    avatar: doc.avatar ?? null,
  })
}
