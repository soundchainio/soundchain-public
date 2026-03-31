/**
 * Re-pin existing IPFS CIDs that were unpinned during Pinata payment lapse
 *
 * GET /api/admin/repin-ipfs?limit=10  — dry run, shows tracks with pinata URLs needing repin
 * POST /api/admin/repin-ipfs?limit=1  — re-pins CIDs via Pinata pinByHash (no file upload needed)
 *
 * This handles tracks that HAVE a playbackUrl with a CID but the CID is no longer pinned.
 * Much faster than backfill-ipfs because it pins by hash — no S3 download/upload cycle.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_API_SECRET = process.env.PINATA_API_SECRET
const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://soundchain.mypinata.cloud/ipfs/'

function extractCid(url: string): string | null {
  // Extract CID from URLs like https://soundchain.mypinata.cloud/ipfs/QmXxx or ipfs://QmXxx
  const match = url.match(/(?:ipfs\/|ipfs:\/\/)(Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = parseInt(req.query.limit as string) || 10
  const dryRun = req.method === 'GET' || req.query.dryRun === 'true'

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find tracks with pinata/ipfs playbackUrl that need re-pinning
    // Skip tracks already processed by marking them with repinnedAt
    const tracks = await db.collection('tracks').find({
      playbackUrl: { $regex: /mypinata\.cloud|ipfs/ },
      repinnedAt: { $exists: false },
    }).limit(limit).toArray()

    // Also count total remaining
    const totalRemaining = await db.collection('tracks').countDocuments({
      playbackUrl: { $regex: /mypinata\.cloud|ipfs/ },
      repinnedAt: { $exists: false },
    })

    if (dryRun) {
      return res.status(200).json({
        mode: 'DRY RUN',
        tracksNeedingRepin: tracks.length,
        totalRemaining,
        tracks: tracks.map(t => {
          const cid = extractCid(t.playbackUrl || '')
          return {
            id: t._id.toString(),
            title: t.title,
            cid: cid || 'NO_CID',
            playbackUrl: t.playbackUrl?.substring(0, 80),
          }
        }),
      })
    }

    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      return res.status(500).json({ error: 'PINATA_API_KEY or PINATA_API_SECRET not configured' })
    }

    const results = []

    for (const track of tracks) {
      const cid = extractCid(track.playbackUrl || '')
      if (!cid) {
        // No valid CID — mark as processed so we don't retry
        await db.collection('tracks').updateOne(
          { _id: track._id },
          { $set: { repinnedAt: new Date(), repinStatus: 'no_cid' } }
        )
        results.push({ id: track._id.toString(), title: track.title, status: 'SKIP', reason: 'No CID in playbackUrl' })
        continue
      }

      try {
        // Pin by hash — Pinata will re-pin the CID from the IPFS network
        // This is MUCH faster than downloading from S3 and re-uploading
        const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_API_SECRET,
          },
          body: JSON.stringify({
            hashToPin: cid,
            pinataMetadata: {
              name: `${(track.title || 'track').replace(/[^a-zA-Z0-9 ]/g, '_').slice(0, 50)}_${track._id}`,
              keyvalues: {
                trackId: track._id.toString(),
                source: 'repin',
              }
            }
          }),
        })

        if (!pinResponse.ok) {
          const errText = await pinResponse.text()
          // If already pinned, that's a success
          if (errText.includes('DUPLICATE_OBJECT') || errText.includes('already pinned')) {
            await db.collection('tracks').updateOne(
              { _id: track._id },
              { $set: { repinnedAt: new Date(), repinStatus: 'already_pinned' } }
            )
            results.push({ id: track._id.toString(), title: track.title, cid, status: 'ALREADY_PINNED' })
          } else {
            await db.collection('tracks').updateOne(
              { _id: track._id },
              { $set: { repinnedAt: new Date(), repinStatus: 'failed', repinError: errText.substring(0, 200) } }
            )
            results.push({ id: track._id.toString(), title: track.title, cid, status: 'PIN_FAILED', reason: errText.substring(0, 200) })
          }
          continue
        }

        const pinData = await pinResponse.json()

        // Update playbackUrl to ensure it uses our gateway
        const playbackUrl = `${GATEWAY}${cid}`
        await db.collection('tracks').updateOne(
          { _id: track._id },
          { $set: { playbackUrl, ipfsHash: cid, repinnedAt: new Date(), repinStatus: 'success', updatedAt: new Date() } }
        )

        results.push({
          id: track._id.toString(),
          title: track.title,
          cid,
          status: 'SUCCESS',
          pinataId: pinData.id,
        })

      } catch (err: any) {
        await db.collection('tracks').updateOne(
          { _id: track._id },
          { $set: { repinnedAt: new Date(), repinStatus: 'error', repinError: err.message } }
        )
        results.push({ id: track._id.toString(), title: track.title, cid, status: 'ERROR', reason: err.message })
      }
    }

    const succeeded = results.filter(r => r.status === 'SUCCESS' || r.status === 'ALREADY_PINNED').length
    const failed = results.filter(r => r.status !== 'SUCCESS' && r.status !== 'ALREADY_PINNED').length

    return res.status(200).json({
      mode: 'LIVE',
      total: tracks.length,
      totalRemaining: totalRemaining - tracks.length,
      succeeded,
      failed,
      results,
    })

  } catch (error: any) {
    return res.status(500).json({ error: 'Repin failed', details: error.message })
  }
}
