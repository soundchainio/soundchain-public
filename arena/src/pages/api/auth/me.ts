/**
 * GET /api/auth/me — current arena session info.
 *
 * Returns `{ authed: false }` if no valid session cookie. Returns
 * `{ authed: true, provider, identityKey, handle, avatar }` if signed in.
 *
 * Frontend calls this on mount to:
 *   - Show signed-in state in the IdentityModal
 *   - Restore handle/avatar to localStorage so the existing GameChat code
 *     (which reads from localStorage) sees the cross-device-persistent identity
 *     without rewiring the chat plumbing
 *
 * Also returns provider config status so the modal can disable pills when
 * env vars haven't been provisioned (Apple/Google client IDs).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { arenaDb } from '@/lib/mongo'
import { readSession, getProviderConfig } from '@/lib/auth'

export const config = { runtime: 'nodejs' }

interface ArenaHandleDoc {
  deviceId?: string
  appleSub?: string
  googleSub?: string
  passkeyUserId?: string
  handle?: string
  avatar?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  const providers = getProviderConfig()
  const session = await readSession(req)
  if (!session) {
    return res.status(200).json({ authed: false, providers })
  }

  // Resolve the handle/avatar from arena_handles for this identity.
  let handle: string | null = null
  let avatar: string | null = null
  try {
    const db = await arenaDb()
    const col = db.collection<ArenaHandleDoc>('arena_handles')
    const filter =
      session.provider === 'apple'
        ? { appleSub: session.identityKey.slice('apple:'.length) }
        : session.provider === 'google'
          ? { googleSub: session.identityKey.slice('google:'.length) }
          : session.provider === 'passkey'
            ? { passkeyUserId: session.identityKey.slice('passkey:'.length) }
            : { deviceId: session.identityKey.slice('guest:'.length) }
    const doc = await col.findOne(filter, { projection: { handle: 1, avatar: 1 } })
    if (doc) {
      handle = doc.handle ?? null
      avatar = doc.avatar ?? null
    }
  } catch {
    // Mongo down — return session info without handle so client can re-fetch later.
  }

  return res.status(200).json({
    authed: true,
    provider: session.provider,
    identityKey: session.identityKey,
    handle,
    avatar,
    providers,
  })
}
