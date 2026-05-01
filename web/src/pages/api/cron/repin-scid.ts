/**
 * SCid repin cron — drains the queue of S3-only SCid tracks left over from
 * the Phase-5 Vercel-direct port that dropped the IPFS pinning step.
 *
 * Auth: Vercel cron hits this with `Authorization: Bearer ${CRON_SECRET}`.
 *       Also accepts `?secret=<CRON_SECRET>` for manual triggers.
 *
 * Behavior: scans up to 50 broken tracks per invocation, pins each to Pinata,
 * rewrites playbackUrl + ipfsCid in Mongo. Becomes a cheap countDocuments
 * no-op once the queue drains. Safe to leave scheduled forever.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'GET or POST only' })
  }

  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.authorization || ''
  const isAuthed =
    !cronSecret ||
    auth === `Bearer ${cronSecret}` ||
    req.query.secret === cronSecret

  if (!isAuthed) return res.status(401).json({ error: 'unauthorized' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter = { playbackUrl: { $regex: S3_HOST_FRAGMENT } }
    const total = await db.collection('tracks').countDocuments(filter)

    if (total === 0) {
      return res.status(200).json({ ok: true, totalBroken: 0, processed: 0, note: 'queue drained' })
    }

    const tracks = await db.collection('tracks').find(filter).limit(50).toArray()
    const results: any[] = []
    let pinned = 0
    let failed = 0

    for (const t of tracks) {
      const url = t.assetUrl || t.playbackUrl
      if (!url || typeof url !== 'string' || !url.includes(S3_HOST_FRAGMENT)) {
        failed++
        results.push({ trackId: t._id.toString(), title: t.title, ok: false, error: 'no S3 url' })
        continue
      }

      const cid = await pinAssetToIPFS(url, t.title || `track-${t._id}`)
      if (!cid) {
        failed++
        results.push({ trackId: t._id.toString(), title: t.title, ok: false, error: 'pin failed' })
        continue
      }

      await db.collection('tracks').updateOne(
        { _id: t._id },
        { $set: { playbackUrl: `https://soundchain.mypinata.cloud/ipfs/${cid}`, ipfsCid: cid, updatedAt: new Date() } }
      )
      pinned++
      results.push({ trackId: t._id.toString(), title: t.title, ok: true, cid })
    }

    return res.status(200).json({
      ok: true,
      totalBroken: total,
      processedThisRun: tracks.length,
      pinned,
      failed,
      remaining: Math.max(0, total - pinned),
      results,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
