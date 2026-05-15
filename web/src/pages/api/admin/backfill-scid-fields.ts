/**
 * POST /api/admin/backfill-scid-fields
 *
 * One-shot migration that renames non-canonical fields on SCid docs created
 * before the May 14, 2026 field-name bugfix. Vercel-direct create-scid wrote
 * docs with `code`, `totalOgunEarned`, `claimedOgun`, `isNFT` — the GraphQL
 * Mongoose schema and track-detail UI both read `scid`, `ogunRewardsEarned`,
 * `ogunRewardsClaimed`, `isNft`. Result: SCid pill never rendered.
 *
 * This endpoint is auth-gated to furdA1. The migration itself is collection-
 * wide so any user's broken SCid-only upload gets corrected in one pass.
 * Idempotent — running twice is a no-op once docs are clean.
 *
 * Returns: { migrated, found, sampleScids }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')

  // Gate to furdA1 — only Frank's account can trigger this. Legacy 2021 users
  // store handle on users.handle (not profiles.userHandle); check both.
  const { ObjectId } = await import('mongodb')
  const [profile, user] = await Promise.all([
    db.collection('profiles').findOne(
      { _id: auth.profileId },
      { projection: { userHandle: 1, displayName: 1 } }
    ),
    db.collection('users').findOne(
      { _id: new ObjectId(auth.userId) },
      { projection: { handle: 1 } }
    ),
  ])
  const handle = String(
    profile?.userHandle || user?.handle || profile?.displayName || ''
  ).toLowerCase()
  if (handle !== 'furda1') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Find legacy docs that have `code` but no canonical `scid` field.
  const broken = await db
    .collection('scids')
    .find({ code: { $exists: true }, scid: { $exists: false } })
    .toArray()

  if (broken.length === 0) {
    return res.status(200).json({ migrated: 0, found: 0, message: 'No legacy docs to migrate' })
  }

  // Build per-doc updates. Parse scidCode to derive artistHash + sequence so
  // the Mongoose schema's `required` fields are satisfied for any read that
  // hits the canonical model.
  const ops = broken.map((doc) => {
    const scidCode: string = doc.code || ''
    const parts = scidCode.split('-')
    const artistHash = doc.artistHash || parts[2] || ''
    const seqStr = parts[3] || '0'
    const sequence = doc.sequence ?? parseInt(seqStr, 10) ?? 0
    const createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date()
    const year = doc.year || String(createdAt.getFullYear()).slice(-2)

    return {
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            scid: scidCode,
            chainCode: doc.chainCode || 'POL',
            artistHash,
            year,
            sequence,
            status: doc.status || 'PENDING',
            ogunRewardsEarned: doc.ogunRewardsEarned ?? doc.totalOgunEarned ?? doc.ogunEarned ?? 0,
            ogunRewardsClaimed: doc.ogunRewardsClaimed ?? doc.claimedOgun ?? 0,
            dailyOgunEarned: doc.dailyOgunEarned ?? 0,
            isNft: doc.isNft ?? doc.isNFT ?? false,
            updatedAt: new Date(),
          },
          $unset: {
            code: '',
            totalOgunEarned: '',
            claimedOgun: '',
            unclaimedOgun: '',
            isNFT: '',
            ogunEarned: '',
          },
        },
      },
    }
  })

  const result = await db.collection('scids').bulkWrite(ops, { ordered: false })

  return res.status(200).json({
    migrated: result.modifiedCount,
    found: broken.length,
    sampleScids: broken.slice(0, 5).map((d) => d.code),
  })
}
