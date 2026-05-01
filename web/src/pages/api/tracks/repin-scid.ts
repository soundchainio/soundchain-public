/**
 * Repin SCid — backfills IPFS pinning for tracks created during the Phase-5 window
 * (commit 813c293) where the SCid Vercel-direct port dropped the IPFS pinning step.
 *
 * POST { trackId }            — repin a single track by its Mongo _id (owner only)
 * POST { all: true }          — sweep up to 50 of caller's S3-only tracks
 * POST { fleet: true }        — admin-only fleet-wide sweep of ALL S3-only tracks
 * POST { fleet: true, dryRun: true } — admin-only count without writes
 *
 * Admin = caller's user.email matches process.env.ADMIN_EMAIL (default frank@soundchain.io).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export const config = {
  maxDuration: 300,
}

const S3_HOST_FRAGMENT = 'soundchain-api-production-uploads.s3'

async function pinAssetToIPFS(fileUrl: string, fileName: string): Promise<string | null> {
  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) return null

  try {
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) return null
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer]), fileName)
    formData.append('pinataMetadata', JSON.stringify({ name: fileName }))
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
      body: formData,
    })
    if (!pinResponse.ok) return null
    const pinResult = await pinResponse.json()
    return pinResult.IpfsHash || null
  } catch {
    return null
  }
}

async function repinOne(db: any, track: any): Promise<{ ok: boolean; cid?: string; error?: string }> {
  const url = track.assetUrl || track.playbackUrl
  if (!url || typeof url !== 'string') return { ok: false, error: 'no asset url' }
  if (!url.includes(S3_HOST_FRAGMENT)) return { ok: false, error: 'already pinned or non-S3' }

  const cid = await pinAssetToIPFS(url, track.title || `track-${track._id}`)
  if (!cid) return { ok: false, error: 'pin failed' }

  await db.collection('tracks').updateOne(
    { _id: track._id },
    { $set: { playbackUrl: `https://soundchain.mypinata.cloud/ipfs/${cid}`, ipfsCid: cid, updatedAt: new Date() } }
  )
  return { ok: true, cid }
}

async function isAdmin(db: any, userId: string): Promise<boolean> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'frank@soundchain.io').toLowerCase()
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { email: 1 } })
  return !!user?.email && user.email.toLowerCase() === adminEmail
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { trackId, all, fleet, dryRun } = req.body || {}

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Fleet-wide sweep — admin-only. Walks all tracks with S3 playbackUrl regardless of owner.
    if (fleet === true) {
      if (!(await isAdmin(db, auth.userId))) {
        return res.status(403).json({ error: 'admin only' })
      }

      const filter = { playbackUrl: { $regex: S3_HOST_FRAGMENT } }
      const total = await db.collection('tracks').countDocuments(filter)

      if (dryRun === true) {
        const sample = await db.collection('tracks')
          .find(filter)
          .project({ title: 1, profileId: 1, createdAt: 1 })
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray()
        return res.status(200).json({
          totalBroken: total,
          sample: sample.map(t => ({
            trackId: t._id.toString(),
            title: t.title,
            profileId: t.profileId?.toString(),
            createdAt: t.createdAt,
          })),
          note: 'Pass {"fleet":true} (no dryRun) to actually repin. Each pin takes 5-15s.',
        })
      }

      // Real sweep — process in chunks so we don't blow past maxDuration
      const tracks = await db.collection('tracks').find(filter).limit(100).toArray()
      const results = []
      let pinned = 0, failed = 0
      for (const t of tracks) {
        const r = await repinOne(db, t)
        if (r.ok) pinned++; else failed++
        results.push({ trackId: t._id.toString(), title: t.title, ...r })
      }
      return res.status(200).json({
        totalBroken: total,
        processedThisRun: tracks.length,
        pinned,
        failed,
        remaining: Math.max(0, total - pinned),
        results,
        note: total > tracks.length
          ? `Re-run the same call to process the next chunk of ${Math.min(100, total - pinned)} tracks.`
          : 'All broken SCids repinned.',
      })
    }

    if (all === true) {
      const tracks = await db.collection('tracks')
        .find({ profileId: auth.profileId, playbackUrl: { $regex: S3_HOST_FRAGMENT } })
        .limit(50)
        .toArray()

      const results = []
      for (const t of tracks) {
        const r = await repinOne(db, t)
        results.push({ trackId: t._id.toString(), title: t.title, ...r })
      }
      return res.status(200).json({ scanned: tracks.length, results })
    }

    if (!trackId) return res.status(400).json({ error: 'trackId, all, or fleet required' })

    let oid: ObjectId
    try { oid = new ObjectId(trackId) } catch { return res.status(400).json({ error: 'invalid trackId' }) }

    const track = await db.collection('tracks').findOne({ _id: oid })
    if (!track) return res.status(404).json({ error: 'track not found' })
    if (track.profileId.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ error: 'not your track' })
    }

    const result = await repinOne(db, track)
    return res.status(result.ok ? 200 : 400).json({ trackId, title: track.title, ...result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
