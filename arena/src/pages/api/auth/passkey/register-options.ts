/**
 * Passkey registration — phase 1: generate WebAuthn registration options.
 *
 * Frontend flow:
 *   1. User taps "Save as passkey" pill in IdentityModal
 *   2. POST /api/auth/passkey/register-options { deviceId }
 *   3. Server generates challenge + options, stores challenge in signed cookie
 *   4. Frontend calls navigator.credentials.create({ publicKey: options })
 *   5. iPhone Safari shows Face ID prompt → user authenticates
 *   6. Frontend POSTs the credential response to /register-verify
 *
 * RP ID = `arena.soundchain.io`. Passkeys are scoped to this exact origin —
 * cannot authenticate against soundchain.io or any other subdomain. Perfect
 * for the "arena identity stays separate from SC" architectural constraint.
 *
 * iCloud Keychain syncs the resulting passkey across all the user's Apple
 * devices automatically. Tap "Sign in with Passkey" on iPad → Face ID →
 * same arena handle restored.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import {
  PASSKEY_RP_ID,
  PASSKEY_RP_NAME,
  signPasskeyChallenge,
  setPasskeyChallengeCookie,
  getProviderConfig,
} from '@/lib/auth'
import { arenaDb } from '@/lib/mongo'

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

function randomUserId(): string {
  // 16 bytes of randomness — base64url. Stable per-user identifier the
  // browser/device passes back during authentication. NOT exposed to the
  // user in any UI; pure server-side handle.
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Buffer.from(bytes).toString('base64url')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!getProviderConfig().passkey) {
    return res.status(503).json({ error: 'Passkey not configured. ARENA_SESSION_SECRET env var missing.' })
  }

  const { deviceId } = (req.body || {}) as { deviceId?: string }
  if (!deviceId || deviceId.length < 8) {
    return res.status(400).json({ error: 'Missing device id' })
  }

  // If the deviceId already has a passkey-linked row, reuse the userId so the
  // browser can detect existing credentials. Otherwise create a fresh userId
  // — the row will be inserted on register-verify success.
  let passkeyUserId = randomUserId()
  let excludeCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = []
  try {
    const db = await arenaDb()
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    const existing = await col.findOne({ deviceId }, { projection: { passkeyUserId: 1, passkeyCredentials: 1 } })
    if (existing?.passkeyUserId) {
      passkeyUserId = existing.passkeyUserId
    }
    if (existing?.passkeyCredentials?.length) {
      excludeCredentials = existing.passkeyCredentials.map((c) => ({
        id: c.credentialId,
        transports: (c.transports || ['internal', 'hybrid']) as AuthenticatorTransportFuture[],
      }))
    }
  } catch {
    // Mongo down — proceed with fresh userId. Verify will retry storage.
  }

  const options = await generateRegistrationOptions({
    rpName: PASSKEY_RP_NAME,
    rpID: PASSKEY_RP_ID,
    userName: `arena-${passkeyUserId.slice(0, 8)}`,
    userDisplayName: 'Arena fan',
    userID: Buffer.from(passkeyUserId, 'utf8'),
    timeout: 60_000,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      // Prefer platform authenticators (Face ID / Touch ID / Windows Hello)
      // over roaming security keys for the native-app feel.
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    supportedAlgorithmIDs: [-7, -257], // ES256 + RS256 — broadest device support
  })

  const challengeToken = await signPasskeyChallenge({
    ceremony: 'register',
    challenge: options.challenge,
    deviceId,
    passkeyUserId,
  })
  if (!challengeToken) {
    return res.status(503).json({ error: 'Session signing not configured.' })
  }
  setPasskeyChallengeCookie(res, challengeToken)
  return res.status(200).json({ options, passkeyUserId })
}

// Re-export the type so the import above doesn't get tree-shaken away.
type AuthenticatorTransportFuture = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb'
