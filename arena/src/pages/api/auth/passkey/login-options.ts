/**
 * Passkey login — phase 1: generate WebAuthn assertion options.
 *
 * Discoverable credentials flow ("passkeys"): we don't pre-list allowedCredentials;
 * the browser shows whatever passkeys it has for the RP (arena.soundchain.io).
 * iOS Safari shows the Face ID prompt with the user's saved arena passkey, even
 * across iCloud Keychain-synced devices.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import {
  PASSKEY_RP_ID,
  signPasskeyChallenge,
  setPasskeyChallengeCookie,
  getProviderConfig,
} from '@/lib/auth'

export const config = { runtime: 'nodejs' }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!getProviderConfig().passkey) {
    return res.status(503).json({ error: 'Passkey not configured.' })
  }

  const options = await generateAuthenticationOptions({
    rpID: PASSKEY_RP_ID,
    timeout: 60_000,
    userVerification: 'preferred',
    // Empty allowCredentials = browser surfaces all passkeys for this RP.
    // Standard "discoverable credential" flow.
    allowCredentials: [],
  })

  const challengeToken = await signPasskeyChallenge({
    ceremony: 'login',
    challenge: options.challenge,
  })
  if (!challengeToken) {
    return res.status(503).json({ error: 'Session signing not configured.' })
  }
  setPasskeyChallengeCookie(res, challengeToken)
  return res.status(200).json({ options })
}
