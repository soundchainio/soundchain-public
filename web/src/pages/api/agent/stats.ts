/**
 * SoundChain Agent Gateway - Platform Stats
 * GET /api/agent/stats
 *
 * Returns real counts from Atlas directly (no Lambda proxy).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

interface StatsResponse {
  success: boolean
  data?: {
    total_tracks: number
    total_profiles: number
    ipfs_audio_tracks: number
    ipfs_artwork_tracks: number
    nft_tracks: number
    scid_enabled_tracks: number
    sample_size: number
    estimated_totals: {
      ipfs_audio: number
      ipfs_artwork: number
      nfts: number
      scid_enabled: number
    }
  }
  error?: string
  meta: {
    timestamp: string
    request_id: string
    note?: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  const requestId = `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      meta: { timestamp: new Date().toISOString(), request_id: requestId }
    })
  }

  // Edge cache 5 minutes — stats don't change rapidly, M0 protection
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const [totalTracks, totalProfiles, ipfsAudioCount, ipfsArtworkCount, scidCount] = await Promise.all([
      db.collection('tracks').countDocuments({ deleted: { $ne: true } }),
      db.collection('profiles').countDocuments({}),
      db.collection('tracks').countDocuments({
        deleted: { $ne: true },
        assetUrl: { $exists: true, $ne: null, $regex: /ipfs|pinata/i },
      }),
      db.collection('tracks').countDocuments({
        deleted: { $ne: true },
        artworkUrl: { $exists: true, $ne: null, $regex: /ipfs|pinata/i },
      }),
      db.collection('scids').countDocuments({}),
    ])

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')

    return res.status(200).json({
      success: true,
      data: {
        total_tracks: totalTracks,
        total_profiles: totalProfiles,
        ipfs_audio_tracks: ipfsAudioCount,
        ipfs_artwork_tracks: ipfsArtworkCount,
        nft_tracks: ipfsAudioCount,
        scid_enabled_tracks: scidCount,
        sample_size: totalTracks,
        estimated_totals: {
          ipfs_audio: ipfsAudioCount,
          ipfs_artwork: ipfsArtworkCount,
          nfts: ipfsAudioCount,
          scid_enabled: scidCount,
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        note: `Exact counts from Atlas (no sampling).`
      }
    })
  } catch (error: any) {
    console.error('[Agent Stats] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch platform stats',
      meta: { timestamp: new Date().toISOString(), request_id: requestId }
    })
  }
}
