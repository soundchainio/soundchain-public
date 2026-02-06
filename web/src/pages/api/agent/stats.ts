/**
 * SoundChain Agent Gateway - Platform Stats
 * GET /api/agent/stats
 *
 * Returns real counts from the database:
 * - Total tracks
 * - Tracks with IPFS (audio)
 * - Tracks with IPFS artwork
 * - NFT tracks
 * - Total profiles/artists
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { apolloClient } from 'lib/apollo'
import { gql } from '@apollo/client'

// Query to sample tracks and count IPFS/NFTs
const SAMPLE_TRACKS_QUERY = gql`
  query SampleTracks($limit: Int) {
    exploreTracks(page: { first: $limit }) {
      nodes {
        id
        artworkUrl
        assetUrl
        nftData {
          ipfsCid
          tokenId
          contract
        }
      }
      pageInfo {
        totalCount
        hasNextPage
      }
    }
    explore {
      totalTracks
      totalProfiles
    }
  }
`

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

  try {
    // Sample tracks and get totals in one query
    const { data } = await apolloClient.query({
      query: SAMPLE_TRACKS_QUERY,
      variables: { limit: 500 },
      fetchPolicy: 'no-cache'
    })

    const totalTracks = data?.explore?.totalTracks ||
                        data?.exploreTracks?.pageInfo?.totalCount || 0
    const totalProfiles = data?.explore?.totalProfiles || 0

    const tracks = data?.exploreTracks?.nodes || []
    const actualSampleSize = tracks.length

    // Count IPFS and NFT tracks in sample
    let ipfsAudioCount = 0
    let ipfsArtworkCount = 0
    let nftCount = 0
    let scidCount = 0

    tracks.forEach((track: any) => {
      // NFT = has nftData with tokenId or contract
      if (track.nftData?.tokenId || track.nftData?.contract) nftCount++
      // IPFS audio = nftData.ipfsCid exists OR assetUrl contains ipfs/pinata
      if (track.nftData?.ipfsCid || track.assetUrl?.includes('ipfs') || track.assetUrl?.includes('pinata')) ipfsAudioCount++
      // IPFS artwork = artworkUrl contains ipfs/pinata
      if (track.artworkUrl?.includes('ipfs') || track.artworkUrl?.includes('pinata')) ipfsArtworkCount++
      // SCID = has nftData (on-chain registered)
      if (track.nftData) scidCount++
    })

    // Calculate percentages and estimate totals
    const ipfsAudioPercent = actualSampleSize > 0 ? ipfsAudioCount / actualSampleSize : 0
    const ipfsArtworkPercent = actualSampleSize > 0 ? ipfsArtworkCount / actualSampleSize : 0
    const nftPercent = actualSampleSize > 0 ? nftCount / actualSampleSize : 0
    const scidPercent = actualSampleSize > 0 ? scidCount / actualSampleSize : 0

    return res.status(200).json({
      success: true,
      data: {
        total_tracks: totalTracks,
        total_profiles: totalProfiles,
        ipfs_audio_tracks: ipfsAudioCount,
        ipfs_artwork_tracks: ipfsArtworkCount,
        nft_tracks: nftCount,
        scid_enabled_tracks: scidCount,
        sample_size: actualSampleSize,
        estimated_totals: {
          ipfs_audio: Math.round(totalTracks * ipfsAudioPercent),
          ipfs_artwork: Math.round(totalTracks * ipfsArtworkPercent),
          nfts: Math.round(totalTracks * nftPercent),
          scid_enabled: Math.round(totalTracks * scidPercent)
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        note: `Stats based on sample of ${actualSampleSize} tracks. Estimates extrapolated to total.`
      }
    })

  } catch (error: any) {
    console.error('[Agent Stats] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch platform stats',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    })
  }
}
