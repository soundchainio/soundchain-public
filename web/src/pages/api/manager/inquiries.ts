import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// ─── MANAGER inbox ────────────────────────────────────────────────────────────
// The pro reads the inquiries delivered to them (booking / collab / business /
// hire). Owner-only: a caller can only ever see inquiries addressed to their own
// profile. GET = list; POST { id, action } = mark read / archive.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const inquiries = db.collection('managerInquiries')

  if (req.method === 'GET') {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '100', 10) || 100, 200)
      const docs = await inquiries
        .find({ recipientProfileId: auth.profileId, status: { $ne: 'archived' } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray()

      const unread = docs.filter(d => !d.read).length
      const nodes = docs.map(d => ({
        id: d._id.toString(),
        type: d.type,
        name: d.name,
        email: d.email,
        fields: d.fields || {},
        message: d.message || '',
        visitorLang: d.visitorLang || '',
        read: !!d.read,
        status: d.status || 'new',
        createdAt: d.createdAt || null,
      }))
      return res.status(200).json({ inquiries: nodes, unread, total: docs.length })
    } catch (err: any) {
      console.error('[manager/inquiries] list error:', err)
      return res.status(500).json({ error: 'failed to load inquiries' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, action } = (req.body || {}) as { id?: string; action?: string }
      if (!id) return res.status(400).json({ error: 'id required' })
      let oid: ObjectId
      try { oid = new ObjectId(id) } catch { return res.status(400).json({ error: 'bad id' }) }

      // Scope every mutation to the owner — never let a caller touch another
      // pro's inbox.
      const filter = { _id: oid, recipientProfileId: auth.profileId }
      if (action === 'archive') {
        await inquiries.updateOne(filter, { $set: { status: 'archived', read: true, updatedAt: new Date() } })
      } else if (action === 'unread') {
        await inquiries.updateOne(filter, { $set: { read: false, updatedAt: new Date() } })
      } else {
        // default: mark read
        await inquiries.updateOne(filter, { $set: { read: true, updatedAt: new Date() } })
      }
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      console.error('[manager/inquiries] update error:', err)
      return res.status(500).json({ error: 'failed to update inquiry' })
    }
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
