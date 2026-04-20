/**
 * GET  /api/nodeverse/buildables?parcelX=0&parcelZ=0  → placements on a parcel
 * GET  /api/nodeverse/buildables?ownerId=...          → all placements by owner
 * POST /api/nodeverse/buildables  → place or update a buildable (auth required)
 * DELETE /api/nodeverse/buildables?id=...             → remove a placement (auth, owner-only)
 *
 * Placements live in Mongo collection `nodeverse_buildables`. One parcel can
 * hold up to 200 items (guard against runaway spam). Only the parcel owner can
 * place/remove. Non-owners get 403 on write.
 *
 * The parcel owner check hits `nodeverse_squares` (same collection as the land
 * purchase flow). If no one owns the parcel, no one can place there.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { getBuildable, type PlacedBuildable } from 'lib/nodeverse/buildables'

const MAX_PER_PARCEL = 200

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const buildables = db.collection('nodeverse_buildables')
  const squares = db.collection('nodeverse_squares')

  if (req.method === 'GET') {
    const parcelX = req.query.parcelX !== undefined ? parseInt(req.query.parcelX as string) : null
    const parcelZ = req.query.parcelZ !== undefined ? parseInt(req.query.parcelZ as string) : null
    const ownerId = (req.query.ownerId as string) || ''
    // BBox: minParcelX/maxParcelX/minParcelZ/maxParcelZ — used by Explore3DScene
    // to fetch all buildables in the visible render range (±3 parcels by default).
    const minX = req.query.minParcelX !== undefined ? parseInt(req.query.minParcelX as string) : null
    const maxX = req.query.maxParcelX !== undefined ? parseInt(req.query.maxParcelX as string) : null
    const minZ = req.query.minParcelZ !== undefined ? parseInt(req.query.minParcelZ as string) : null
    const maxZ = req.query.maxParcelZ !== undefined ? parseInt(req.query.maxParcelZ as string) : null
    const query: any = {}
    if (parcelX !== null && parcelZ !== null) {
      query.parcelX = parcelX
      query.parcelZ = parcelZ
    } else if (minX !== null && maxX !== null && minZ !== null && maxZ !== null) {
      query.parcelX = { $gte: minX, $lte: maxX }
      query.parcelZ = { $gte: minZ, $lte: maxZ }
    } else if (ownerId) {
      try { query.ownerId = new ObjectId(ownerId) } catch { return res.status(400).json({ error: 'bad ownerId' }) }
    } else {
      return res.status(400).json({ error: 'parcelX+parcelZ, bbox, or ownerId required' })
    }
    // Bbox can return many items across parcels; cap at 2000 (10 parcels × 200).
    const docs = await buildables.find(query).limit(2000).toArray()
    return res.status(200).json({
      buildables: docs.map((d) => ({
        ...d,
        _id: d._id.toString(),
        ownerId: (d.ownerId as ObjectId)?.toString?.() || d.ownerId,
      })),
    })
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const body = req.body as Partial<PlacedBuildable>
    const {
      id,
      buildableId,
      parcelX,
      parcelZ,
      localX,
      localY = 0,
      localZ,
      rotY = 0,
      color,
      scale = 1,
      boundAssetType,
      boundAssetId,
      boundAssetImageUrl,
      boundAssetTitle,
      boundAssetAudioUrl,
    } = body

    if (!buildableId || !getBuildable(buildableId)) return res.status(400).json({ error: 'invalid buildableId' })
    if (typeof parcelX !== 'number' || typeof parcelZ !== 'number') return res.status(400).json({ error: 'parcelX/Z required' })
    if (typeof localX !== 'number' || typeof localZ !== 'number') return res.status(400).json({ error: 'localX/Z required' })
    if (Math.abs(localX) > 8.5 || Math.abs(localZ) > 8.5) return res.status(400).json({ error: 'localX/Z must be within [-8, 8]' })
    if (scale < 0.4 || scale > 3) return res.status(400).json({ error: 'scale out of range' })

    // Verify caller owns the parcel
    const parcel = await squares.findOne({ x: parcelX, z: parcelZ })
    if (!parcel) return res.status(403).json({ error: 'parcel not owned — buy it first' })
    if (!auth.profileId.equals(parcel.ownerId)) return res.status(403).json({ error: 'not your parcel' })

    // Enforce per-parcel cap (skip when updating an existing item)
    if (!id) {
      const count = await buildables.countDocuments({ parcelX, parcelZ })
      if (count >= MAX_PER_PARCEL) return res.status(400).json({ error: `max ${MAX_PER_PARCEL} items per parcel` })
    }

    const doc = {
      id: id || `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      buildableId,
      ownerId: auth.profileId,
      parcelX,
      parcelZ,
      localX,
      localY,
      localZ,
      rotY,
      color: color || null,
      scale,
      boundAssetType: boundAssetType || null,
      boundAssetId: boundAssetId || null,
      boundAssetImageUrl: boundAssetImageUrl || null,
      boundAssetTitle: boundAssetTitle || null,
      boundAssetAudioUrl: boundAssetAudioUrl || null,
      placedAt: new Date(),
    }

    if (id) {
      const existing = await buildables.findOne({ id, parcelX, parcelZ })
      if (!existing) return res.status(404).json({ error: 'placement not found' })
      if (!auth.profileId.equals(existing.ownerId)) return res.status(403).json({ error: 'not yours' })
      await buildables.updateOne({ _id: existing._id }, { $set: doc })
      return res.status(200).json({ buildable: { ...doc, _id: existing._id.toString(), ownerId: auth.profileId.toString() } })
    }

    const result = await buildables.insertOne(doc as any)
    return res.status(200).json({ buildable: { ...doc, _id: result.insertedId.toString(), ownerId: auth.profileId.toString() } })
  }

  if (req.method === 'DELETE') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })
    const id = (req.query.id as string) || ''
    if (!id) return res.status(400).json({ error: 'id required' })
    const existing = await buildables.findOne({ id })
    if (!existing) return res.status(404).json({ error: 'not found' })
    if (!auth.profileId.equals(existing.ownerId)) return res.status(403).json({ error: 'not yours' })
    await buildables.deleteOne({ _id: existing._id })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
