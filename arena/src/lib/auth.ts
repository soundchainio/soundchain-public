/**
 * Arena auth — native-first identity layer (Phase 2).
 *
 * Per `feedback_arena_identity_separate_from_sc.md` + `feedback_arena_native_ready_from_day_one.md`:
 * arena identity is COMPLETELY separate from soundchain.io. No SC-JWT cross-use,
 * no Magic SDK, no shared OAuth client. Sign in with Apple + Sign in with Google
 * + Continue as Guest (deviceId pseudonymous fallback). Phone/SMS skipped per
 * the SoundChain global "no Twilio/SMS" rule (CLAUDE.md).
 *
 * Architecture:
 *   1. Frontend renders Apple/Google sign-in buttons via the providers' own JS
 *      libraries (Apple JS, Google Identity Services). NO third-party auth SDK.
 *   2. Provider returns an `id_token` JWT to the frontend.
 *   3. Frontend POSTs `id_token` to `/api/auth/{apple,google}/callback`.
 *   4. Server verifies the JWT signature against the provider's public JWKS
 *      (Apple: appleid.apple.com/auth/keys, Google: googleapis.com/oauth2/v3/certs).
 *   5. Server upserts `arena_handles` keyed by `appleSub` / `googleSub` and
 *      issues an arena-scoped session JWT in an httpOnly cookie.
 *   6. Subsequent API calls read the session cookie via `readSession(req)`.
 *
 * Native trajectory (Capacitor): Apple JS API → @capacitor-community/apple-sign-in
 * (returns same id_token shape, posts to same callback). Google GIS → @codetrix-studio/capacitor-google-auth
 * (same id_token shape). The /api/auth/* server routes are unchanged across web + native.
 *
 * Required env vars on Vercel:
 *   - ARENA_SESSION_SECRET: 32+ bytes random (JWT signing key, base64 or hex)
 *   - APPLE_CLIENT_ID: the Services ID, e.g. "com.soundchain.arena.signin"
 *   - GOOGLE_CLIENT_ID: OAuth 2.0 Web Client ID from Google Cloud Console
 *
 * If any of these are unset, the relevant sign-in pill renders disabled with a
 * "Coming soon — provider not configured" toast. Continue as Guest always works.
 */

import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose'
import type { NextApiRequest, NextApiResponse } from 'next'

const SESSION_COOKIE = 'arena_session'
const SESSION_TTL_DAYS = 90 // long-lived; user can sign out anytime

export type IdentityProvider = 'apple' | 'google' | 'guest'

export interface ArenaSession {
  identityKey: string // e.g. "apple:001234.abcdef" or "google:11335577..." or "guest:<deviceId>"
  provider: IdentityProvider
  iat: number
  exp: number
}

function getSessionSecret(): Uint8Array | null {
  const secret = process.env.ARENA_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return new TextEncoder().encode(secret)
}

export function getAppleClientId(): string | null {
  return process.env.APPLE_CLIENT_ID || null
}

export function getGoogleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID || null
}

/**
 * Provider configuration status — frontend reads this to enable/disable pills
 * gracefully when env vars haven't been provisioned yet.
 */
export function getProviderConfig() {
  return {
    apple: !!getAppleClientId() && !!getSessionSecret(),
    google: !!getGoogleClientId() && !!getSessionSecret(),
    sessionReady: !!getSessionSecret(),
  }
}

export async function signSession(identityKey: string, provider: IdentityProvider): Promise<string | null> {
  const secret = getSessionSecret()
  if (!secret) return null
  return new SignJWT({ identityKey, provider })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .setIssuer('arena.soundchain.io')
    .setAudience('arena')
    .sign(secret)
}

export async function verifySession(token: string): Promise<ArenaSession | null> {
  const secret = getSessionSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'arena.soundchain.io',
      audience: 'arena',
    })
    if (!payload.identityKey || typeof payload.identityKey !== 'string') return null
    if (payload.provider !== 'apple' && payload.provider !== 'google' && payload.provider !== 'guest') return null
    return {
      identityKey: payload.identityKey,
      provider: payload.provider as IdentityProvider,
      iat: payload.iat as number,
      exp: payload.exp as number,
    }
  } catch {
    return null
  }
}

export async function readSession(req: NextApiRequest): Promise<ArenaSession | null> {
  const raw = req.cookies?.[SESSION_COOKIE]
  if (!raw) return null
  return verifySession(raw)
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  // httpOnly so JS can't exfiltrate; secure for HTTPS only; SameSite=Lax so the
  // OAuth redirect flow can land back with the cookie attached.
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60
  const cookie = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ')
  res.setHeader('Set-Cookie', cookie)
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  )
}

/**
 * Verify an Apple-signed id_token JWT.
 * Returns the stable Apple `sub` (user ID) or null on failure.
 *
 * Apple's JWKS: https://appleid.apple.com/auth/keys
 * id_token claims: { iss: "https://appleid.apple.com", sub, aud, email?, ... }
 */
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

export async function verifyAppleIdToken(idToken: string): Promise<{ sub: string; email?: string } | null> {
  const clientId = getAppleClientId()
  if (!clientId) return null
  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: clientId,
    })
    if (!payload.sub) return null
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Verify a Google-signed id_token JWT.
 * Returns the stable Google `sub` (user ID) or null on failure.
 *
 * Google's JWKS: https://www.googleapis.com/oauth2/v3/certs
 * id_token claims: { iss: "https://accounts.google.com" or "accounts.google.com", sub, aud, email?, ... }
 */
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email?: string } | null> {
  const clientId = getGoogleClientId()
  if (!clientId) return null
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      // Google issues both with and without https:// — accept either.
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    if (!payload.sub) return null
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    }
  } catch {
    return null
  }
}

export function identityKeyFor(provider: IdentityProvider, sub: string): string {
  return `${provider}:${sub}`
}
