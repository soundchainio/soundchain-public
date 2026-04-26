import type { NextApiRequest, NextApiResponse } from 'next'
import { apolloClient } from 'lib/apollo'
import { gql } from '@apollo/client'
import type { AgentSkill } from 'types/AgentSkill'
import { trendingMeta } from 'skills/music/trending.meta'

const TRENDING_QUERY = gql`
  query AgentTrending {
    exploreTracks(sort: PLAYBACK_COUNT, page: { first: 10 }) {
      nodes {
        id
        title
        artist
        album
        artworkUrl
        audioUrl
        playbackCount
        favoriteCount
        createdAt
      }
    }
    trendingStories(limit: 10) {
      id
      mediaUrl
      mediaType
      viewCount
      creatorDisplayName
      creatorUserHandle
      isPermanent
    }
    exploreUsers(page: { first: 10 }) {
      nodes {
        id
        userHandle
        displayName
        profilePicture
        followerCount
        verified
        bio
      }
    }
  }
`

async function trendingHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    })
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { data } = await apolloClient.query({
      query: TRENDING_QUERY,
      fetchPolicy: 'no-cache',
    })

    const hotTracks = (data.exploreTracks?.nodes || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork_url: track.artworkUrl,
      stream_url: track.audioUrl,
      play_count: track.playbackCount || 0,
      favorite_count: track.favoriteCount || 0,
      trend_score: Math.floor((track.playbackCount || 0) * 0.7 + (track.favoriteCount || 0) * 0.3),
    }))

    const trendingStories = (data.trendingStories || []).map((story: any) => ({
      id: story.id,
      media_url: story.mediaUrl,
      media_type: story.mediaType,
      view_count: story.viewCount || 0,
      creator: {
        handle: story.creatorUserHandle || 'anonymous',
        display_name: story.creatorDisplayName || 'Anonymous',
      },
      is_permanent: story.isPermanent || false,
    }))

    const risingArtists = (data.exploreUsers?.nodes || []).map((user: any) => ({
      id: user.id,
      handle: user.userHandle,
      display_name: user.displayName,
      avatar_url: user.profilePicture,
      follower_count: user.followerCount || 0,
      verified: user.verified || false,
      bio: user.bio,
    }))

    res.status(200).json({
      success: true,
      data: {
        hot_tracks: hotTracks,
        trending_stories: trendingStories,
        rising_artists: risingArtists,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    })
  } catch (error: any) {
    console.error('[Agent Trending] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending content',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    })
  }
}

export const trendingSkill: AgentSkill = {
  ...trendingMeta,
  handler: trendingHandler,
}
