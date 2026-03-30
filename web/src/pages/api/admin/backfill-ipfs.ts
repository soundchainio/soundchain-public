/**
 * Backfill IPFS URLs for tracks that only have S3 assetUrl
 *
 * GET /api/admin/backfill-ipfs?limit=10&dryRun=true
 * POST /api/admin/backfill-ipfs?limit=10
 *
 * Finds tracks with empty playbackUrl, downloads from S3,
 * pins to Pinata, updates playbackUrl in database.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_API_SECRET = process.env.PINATA_API_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = parseInt(req.query.limit as string) || 10
  const dryRun = req.method === 'GET' || req.query.dryRun === 'true'

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find tracks with empty or missing playbackUrl that have assetUrl
    const tracks = await db.collection('tracks').find({
      $and: [
        { assetUrl: { $exists: true, $ne: '', $ne: null } },
        { $or: [
          { playbackUrl: { $exists: false } },
          { playbackUrl: '' },
          { playbackUrl: null },
        ]}
      ]
    }).limit(limit).toArray()

    if (dryRun) {
      return res.status(200).json({
        mode: 'DRY RUN',
        tracksNeedingBackfill: tracks.length,
        tracks: tracks.map(t => ({
          id: t._id.toString(),
          title: t.title,
          assetUrl: t.assetUrl?.substring(0, 80),
          playbackUrl: t.playbackUrl || 'EMPTY',
        })),
      })
    }

    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      return res.status(500).json({ error: 'PINATA_API_KEY or PINATA_API_SECRET not configured' })
    }

    const results = []

    for (const track of tracks) {
      try {
        // Download from S3
        const s3Response = await fetch(track.assetUrl)
        if (!s3Response.ok) {
          results.push({ id: track._id.toString(), title: track.title, status: 'SKIP', reason: `S3 ${s3Response.status}` })
          continue
        }

        const audioBuffer = await s3Response.arrayBuffer()
        const contentType = s3Response.headers.get('content-type') || 'audio/mpeg'

        // Determine file extension
        const extMap: Record<string, string> = {
          'audio/mpeg': '.mp3',
          'audio/mp3': '.mp3',
          'audio/wav': '.wav',
          'audio/x-wav': '.wav',
          'audio/flac': '.flac',
          'audio/ogg': '.ogg',
          'audio/aac': '.aac',
          'audio/mp4': '.m4a',
        }
        const ext = extMap[contentType] || '.mp3'
        const fileName = `${(track.title || 'track').replace(/[^a-zA-Z0-9 ]/g, '_')}_${track._id}${ext}`

        // Pin to Pinata
        const formData = new FormData()
        const blob = new Blob([audioBuffer], { type: contentType })
        formData.append('file', blob, fileName)
        formData.append('pinataMetadata', JSON.stringify({
          name: fileName,
          keyvalues: {
            trackId: track._id.toString(),
            title: track.title,
            source: 'backfill',
          }
        }))

        const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_API_SECRET,
          },
          body: formData,
        })

        if (!pinResponse.ok) {
          const errText = await pinResponse.text()
          results.push({ id: track._id.toString(), title: track.title, status: 'PIN_FAILED', reason: errText.substring(0, 200) })
          continue
        }

        const pinData = await pinResponse.json()
        const ipfsHash = pinData.IpfsHash
        const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://soundchain.mypinata.cloud/ipfs/'
        const playbackUrl = `${gateway}${ipfsHash}`

        // Update track in database
        await db.collection('tracks').updateOne(
          { _id: track._id },
          { $set: { playbackUrl, ipfsHash, updatedAt: new Date() } }
        )

        results.push({
          id: track._id.toString(),
          title: track.title,
          status: 'SUCCESS',
          ipfsHash,
          playbackUrl,
          size: audioBuffer.byteLength,
        })

      } catch (err: any) {
        results.push({ id: track._id.toString(), title: track.title, status: 'ERROR', reason: err.message })
      }
    }

    const succeeded = results.filter(r => r.status === 'SUCCESS').length
    const failed = results.filter(r => r.status !== 'SUCCESS').length

    return res.status(200).json({
      mode: 'LIVE',
      total: tracks.length,
      succeeded,
      failed,
      results,
    })

  } catch (error: any) {
    return res.status(500).json({ error: 'Backfill failed', details: error.message })
  }
}
