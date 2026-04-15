/**
 * Operator Uploads — persistent upload history
 * GET /api/operator/uploads — list user's uploads
 * POST /api/operator/uploads — record a new upload
 * Auth required.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const col = db.collection('operator_uploads')

  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
    const skip = parseInt(req.query.skip as string) || 0
    const uploads = await col
      .find({ profileId: auth.profileId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    const total = await col.countDocuments({ profileId: auth.profileId })
    return res.status(200).json({
      uploads: uploads.map(u => ({ ...u, id: u._id.toString(), _id: undefined })),
      total,
    })
  }

  if (req.method === 'POST') {
    const { cid, fileName, fileSize, mimeType, folder, provider } = req.body || {}
    if (!cid || !fileName) return res.status(400).json({ error: 'cid and fileName required' })

    const doc = {
      profileId: auth.profileId,
      cid,
      fileName,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/octet-stream',
      folder: folder || '/uploads/',
      provider: provider || 'pinata',
      gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
      createdAt: new Date(),
    }
    await col.insertOne(doc)
    return res.status(200).json({ ok: true, upload: { ...doc, id: doc.cid } })
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
