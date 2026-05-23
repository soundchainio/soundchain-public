/**
 * GET /api/cron/process-pending — Vercel Cron (Phase 7h)
 *
 * Replaces soundchain-api-production-processpending AWS Lambda.
 * Runs every 5 minutes (per vercel.json).
 *
 * Two responsibilities:
 * 1) Reset tracks + editions where pendingRequest != None and pendingTime
 *    is older than 1 hour. The on-chain tx either confirmed (cron picks
 *    that up via blockchainwatcher) or timed out (we clear stale state).
 * 2) Process unprocessed PendingTrack records — match by transactionHash
 *    to fill in tokenId + contract on the track's nftData, then mark
 *    the PendingTrack as processed.
 *
 * Pure Mongo writes via the official driver. No Mongoose, no Lambda calls.
 *
 * Vercel auth via x-vercel-cron header so this can't be triggered by
 * external requests.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const PENDING_TIMEOUT_HOURS = 1

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel Cron sets x-vercel-cron header; reject external POST/GET
  if (!req.headers['x-vercel-cron'] && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Cron only' })
  }

  const stats = {
    pendingTracksReset: 0,
    pendingEditionsReset: 0,
    pendingTrackRecordsProcessed: 0,
    pendingTrackRecordsSkipped: 0,
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const nowMinusOneHour = new Date()
    nowMinusOneHour.setHours(nowMinusOneHour.getHours() - PENDING_TIMEOUT_HOURS)

    // 1a. Reset stale pending tracks
    const tracksResult = await db.collection('tracks').updateMany(
      {
        'nftData.pendingRequest': { $ne: 'None', $exists: true, $nin: [null, ''] },
        'nftData.pendingTime': { $lte: nowMinusOneHour },
      },
      {
        $set: { 'nftData.pendingRequest': 'None', updatedAt: new Date() },
      }
    )
    stats.pendingTracksReset = tracksResult.modifiedCount

    // 1b. Reset stale pending editions
    const editionsResult = await db.collection('trackeditions').updateMany(
      {
        'editionData.pendingRequest': { $ne: 'None', $exists: true, $nin: [null, ''] },
        'editionData.pendingTime': { $lte: nowMinusOneHour },
      },
      {
        $set: { 'editionData.pendingRequest': 'None', updatedAt: new Date() },
      }
    )
    stats.pendingEditionsReset = editionsResult.modifiedCount

    // 2. Process PendingTrack records — fill tokenId/contract by tx hash
    const pendingTracks = await db.collection('pendingtracks')
      .find({ processed: { $ne: true } })
      .limit(100)
      .toArray()

    for (const pt of pendingTracks) {
      const { transactionHash, tokenId, contract, _id } = pt as any
      if (!transactionHash) {
        stats.pendingTrackRecordsSkipped += 1
        continue
      }
      const updateResult = await db.collection('tracks').updateOne(
        { 'nftData.transactionHash': transactionHash },
        {
          $set: {
            'nftData.tokenId': tokenId,
            'nftData.contract': contract,
            'nftData.pendingRequest': 'None',
            updatedAt: new Date(),
          },
        }
      )
      if (updateResult.matchedCount > 0) {
        await db.collection('pendingtracks').updateOne(
          { _id },
          { $set: { processed: true, processedAt: new Date() } }
        )
        stats.pendingTrackRecordsProcessed += 1
      } else {
        stats.pendingTrackRecordsSkipped += 1
      }
    }

    return res.status(200).json({
      success: true,
      runAt: new Date().toISOString(),
      stats,
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stats,
    })
  }
}
