/**
 * SoundChain Agent Gateway - Public Feed
 * GET /api/agent/feed
 *
 * Returns public posts, tracks, and stories for agent browsing.
 * No authentication required.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { apolloClient } from 'lib/apollo'
import { gql } from '@apollo/client'

const AGENT_FEED_QUERY = gql`
  query AgentFeed($limit: Int) {
    publicPosts(limit: $limit) {
      id
      content
      authorId
      createdAt
      likeCount
      commentCount
      uploadedMediaUrl
      uploadedMediaType
      author {
        id
        userHandle
        displayName
        profilePicture
      }
    }
    publicStories(limit: $limit) {
      id
      mediaUrl
      mediaType
      caption
      duration
      createdAt
      expiresAt
      viewCount
      isPermanent
      creatorDisplayName
      creatorUserHandle
      creatorAvatarUrl
    }
    exploreTracks(page: { first: $limit }) {
      nodes {
        id
        title
        artist
        album
        artworkUrl
        audioUrl
        duration
        playbackCount
        favoriteCount
        createdAt
      }
    }
  }
`

interface AgentFeedResponse {
  success: boolean
  data?: {
    posts: any[]
    stories: any[]
    tracks: any[]
  }
  error?: string
  meta: {
    timestamp: string
    request_id: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentFeedResponse>
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      }
    })
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { data } = await apolloClient.query({
      query: AGENT_FEED_QUERY,
      variables: { limit },
      fetchPolicy: 'no-cache'
    })

    // Transform data to agent-friendly format
    const posts = (data.publicPosts || []).map((post: any) => ({
      id: post.id,
      type: 'post',
      author: {
        handle: post.author?.userHandle || 'anonymous',
        display_name: post.author?.displayName || 'Anonymous',
        avatar_url: post.author?.profilePicture || null
      },
      content: post.content,
      media_url: post.uploadedMediaUrl,
      media_type: post.uploadedMediaType,
      reactions: {
        likes: post.likeCount || 0
      },
      comment_count: post.commentCount || 0,
      created_at: post.createdAt
    }))

    const stories = (data.publicStories || []).map((story: any) => ({
      id: story.id,
      type: 'story',
      creator: {
        handle: story.creatorUserHandle || 'anonymous',
        display_name: story.creatorDisplayName || 'Anonymous',
        avatar_url: story.creatorAvatarUrl || null
      },
      media_url: story.mediaUrl,
      media_type: story.mediaType,
      caption: story.caption,
      duration: story.duration,
      view_count: story.viewCount || 0,
      is_permanent: story.isPermanent || false,
      created_at: story.createdAt,
      expires_at: story.expiresAt
    }))

    const tracks = (data.exploreTracks?.nodes || []).map((track: any) => ({
      id: track.id,
      type: 'track',
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork_url: track.artworkUrl,
      stream_url: track.audioUrl,
      duration: track.duration,
      play_count: track.playbackCount || 0,
      favorite_count: track.favoriteCount || 0,
      created_at: track.createdAt
    }))

    res.status(200).json({
      success: true,
      data: {
        posts,
        stories,
        tracks
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    })
  } catch (error: any) {
    console.error('[Agent Feed] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feed',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    })
  }
}
