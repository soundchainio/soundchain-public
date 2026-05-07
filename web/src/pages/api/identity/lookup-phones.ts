import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { hashes: string[] }   (max 200 per call)
//
// Find Friends — accept SHA-256 hashes the client computed locally from
// device contacts and return matching SoundChain users. Server never sees
// plaintext phone numbers, just hashes (Signal pattern).
//
// Auth required to prevent enumeration scrapers. Rate-limit-friendly: the
// hashes list is bounded at 200 per request.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { hashes } = req.body || {}
  if (!Array.isArray(hashes) || hashes.length === 0) {
    return res.status(400).json({ error: 'hashes array required' })
  }
  if (hashes.length > 200) {
    return res.status(400).json({ error: 'Max 200 hashes per call' })
  }

  // Validate all are 64-char hex (SHA-256). Silently drop anything malformed
  // rather than 400 — a single bad client entry shouldn't poison the batch.
  const validHashes = hashes.filter(
    (h: any) => typeof h === 'string' && /^[a-f0-9]{64}$/i.test(h)
  ).map((h: string) => h.toLowerCase())

  if (validHashes.length === 0) return res.status(200).json({ matches: [] })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const users = await db.collection('users').find(
      { phoneHash: { $in: validHashes } },
      { projection: { _id: 1, profileId: 1, phoneHash: 1, handle: 1 } }
    ).toArray()

    if (users.length === 0) return res.status(200).json({ matches: [] })

    // Hydrate display data from profiles for each match.
    const profileIds = users.map(u => u.profileId).filter(Boolean)
    const profiles = await db.collection('profiles').find(
      { _id: { $in: profileIds } },
      { projection: { _id: 1, displayName: 1, userHandle: 1, profilePicture: 1 } }
    ).toArray()

    const profileById = new Map(profiles.map(p => [String(p._id), p]))
    const matches = users.map(u => {
      const p = profileById.get(String(u.profileId))
      return {
        phoneHash: u.phoneHash,
        profileId: String(u.profileId || ''),
        handle: u.handle || p?.userHandle || '',
        displayName: p?.displayName || '',
        avatar: p?.profilePicture || null,
      }
    })

    return res.status(200).json({ matches })
  } catch (err: any) {
    console.error('[lookup-phones]', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
