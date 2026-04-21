/**
 * GET / POST /api/user/memory-backend
 *
 * User preference for where their agent memory lives.
 *   LOCAL_DEVICE  — client-side localStorage (default for new users)
 *   CLOUD_MONGO   — SoundChain Atlas (agent_memories collection)
 *   NOSTR         — NIP-44 self-encrypted events to Nostr relays (design complete, plumbing pending)
 *   BYOM          — user's own Mongo cluster (deferred)
 *
 * Stored on the users collection as `memoryBackend`.
 * Requires JWT auth.
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { MEMORY_BACKEND, type MemoryBackend } from 'lib/managed-agents/types'

const VALID_BACKENDS = Object.values(MEMORY_BACKEND)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const users = db.collection('users')

  if (req.method === 'GET') {
    const user = await users.findOne(
      { _id: new ObjectId(auth.userId) },
      { projection: { memoryBackend: 1 } },
    )
    const backend = (user?.memoryBackend as MemoryBackend) || MEMORY_BACKEND.LOCAL_DEVICE
    return res.status(200).json({
      backend,
      default: MEMORY_BACKEND.LOCAL_DEVICE,
      options: VALID_BACKENDS,
    })
  }

  if (req.method === 'POST') {
    const { backend } = req.body || {}
    if (!backend || !VALID_BACKENDS.includes(backend)) {
      return res.status(400).json({
        error: `Invalid backend. Must be one of: ${VALID_BACKENDS.join(', ')}`,
      })
    }

    // NOSTR and BYOM are reserved — server-side plumbing not yet wired.
    // UI can still surface the choice; at runtime the session will fall back to CLOUD_MONGO.
    const notice = (backend === MEMORY_BACKEND.NOSTR || backend === MEMORY_BACKEND.BYOM)
      ? `${backend} backend is reserved — plumbing ships in a follow-up. Until then, sessions fall back to CLOUD_MONGO.`
      : null

    await users.updateOne(
      { _id: new ObjectId(auth.userId) },
      { $set: { memoryBackend: backend, memoryBackendUpdatedAt: new Date() } },
    )

    return res.status(200).json({ backend, updated: 'YES', notice })
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
