import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { normalizeAndHash } from 'lib/api/phoneHash'

// POST { phone: "+15551234567" }
// Hashes the user's cell # with the server pepper and stores it on their
// User row keyed as phoneHash. Sparse unique index ensures the same phone
// can't register against two different user IDs.
//
// Raw phone is NOT stored anywhere persistent — only the hash. The legacy
// `phoneNumber` field on User remains for users who registered pre-hash;
// this endpoint will overwrite it with null (opt out of plaintext storage)
// unless the caller explicitly opts in via { keepPlaintext: true }.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { phone, keepPlaintext } = req.body || {}
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'phone required' })
  }

  const normalized = normalizeAndHash(phone)
  if (!normalized) {
    return res.status(400).json({ error: 'Invalid phone number — include country code (+1 for US/CA)' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const users = db.collection('users')

    // Lazy-create the sparse-unique index on first call. Cheap and idempotent.
    try {
      await users.createIndex({ phoneHash: 1 }, { unique: true, sparse: true, name: 'phoneHash_unique' })
    } catch (e: any) {
      // Ignore "index already exists with same options" errors.
      if (!String(e?.message || '').includes('already exists')) throw e
    }

    // Block claiming a phone hash already registered to a different user.
    const existing = await users.findOne(
      { phoneHash: normalized.hash, _id: { $ne: new ObjectId(auth.userId) } },
      { projection: { _id: 1 } }
    )
    if (existing) {
      return res.status(409).json({ error: 'This number is already linked to another account' })
    }

    const updateFields: any = { phoneHash: normalized.hash, phoneRegisteredAt: new Date() }
    if (!keepPlaintext) updateFields.phoneNumber = null

    await users.updateOne({ _id: new ObjectId(auth.userId) }, { $set: updateFields })

    return res.status(200).json({ ok: true, phoneHash: normalized.hash })
  } catch (err: any) {
    console.error('[register-phone]', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
