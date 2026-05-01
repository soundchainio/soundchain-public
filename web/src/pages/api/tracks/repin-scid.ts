/**
 * Repin SCid — backfills IPFS pinning for tracks created during the Phase-5 window
 * (commit 813c293) where the SCid Vercel-direct port dropped the IPFS pinning step.
 *
 * POST { trackId }     — repin a single track by its Mongo _id
 * POST { all: true }   — sweep all SCid tracks whose playbackUrl still points at the S3 bucket
 *
 * Auth required. Owner-only for single-track mode; sweep mode requires admin.
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { trackId, all } = req.body || {}

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

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

    if (!trackId) return res.status(400).json({ error: 'trackId or all required' })

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
