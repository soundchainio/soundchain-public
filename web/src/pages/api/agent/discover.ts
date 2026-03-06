/**
 * SoundChain Agent Gateway - Random Discovery
 * GET /api/agent/discover
 *
 * Returns random tracks, posts, and artists for serendipitous discovery.
 * No authentication required.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { apolloClient } from 'lib/apollo'
import { gql } from '@apollo/client'

const DISCOVER_QUERY = gql`
  query AgentDiscover($limit: Int) {
    exploreTracks(page: { first: $limit }) {
      nodes {
        id
        title
        artist
        album
        description
        artworkUrl
        audioUrl
        duration
        playbackCount
        createdAt
        genre
      }
    }
    publicPosts(limit: $limit) {
      id
      content
      createdAt
      likeCount
      uploadedMediaUrl
      author {
        userHandle
        displayName
        profilePicture
      }
    }
    exploreUsers(page: { first: $limit }) {
      nodes {
        id
        userHandle
        displayName
        profilePicture
        bio
        followerCount
      }
    }
  }
`

// Shuffle array helper
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface DiscoverResponse {
  success: boolean
  data?: {
    discoveries: any[]
    spotlight: any
  }
  error?: string
  meta: {
    timestamp: string
    request_id: string
    seed: number
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiscoverResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
        seed: 0
      }
    })
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 30, 50)
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const seed = Date.now()

  try {
    const { data } = await apolloClient.query({
      query: DISCOVER_QUERY,
      variables: { limit },
      fetchPolicy: 'no-cache'
    })

    // Transform and shuffle for discovery
    const tracks = shuffle((data.exploreTracks?.nodes || []).map((track: any) => ({
      id: track.id,
      type: 'track',
      title: track.title,
      artist: track.artist,
      album: track.album,
      description: track.description,
      artwork_url: track.artworkUrl,
      stream_url: track.audioUrl,
      duration: track.duration,
      play_count: track.playbackCount || 0,
      genre: track.genre,
      why: 'Random discovery from our catalog'
    })))

    const posts = shuffle((data.publicPosts || []).map((post: any) => ({
      id: post.id,
      type: 'post',
      content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''),
      author: {
        handle: post.author?.userHandle || 'anonymous',
        display_name: post.author?.displayName || 'Anonymous',
        avatar_url: post.author?.profilePicture
      },
      media_url: post.uploadedMediaUrl,
      likes: post.likeCount || 0,
      why: 'Interesting post from the community'
    })))

    const artists = shuffle((data.exploreUsers?.nodes || []).map((user: any) => ({
      id: user.id,
      type: 'artist',
      handle: user.userHandle,
      display_name: user.displayName,
      avatar_url: user.profilePicture,
      bio: user.bio?.substring(0, 150) + (user.bio?.length > 150 ? '...' : ''),
      follower_count: user.followerCount || 0,
      why: 'Artist you might enjoy'
    })))

    // Interleave for diverse discovery feed
    const discoveries: any[] = []
    const maxLen = Math.max(tracks.length, posts.length, artists.length)
    for (let i = 0; i < maxLen && discoveries.length < limit; i++) {
      if (tracks[i]) discoveries.push(tracks[i])
      if (posts[i] && discoveries.length < limit) discoveries.push(posts[i])
      if (artists[i] && discoveries.length < limit) discoveries.push(artists[i])
    }

    // Pick a random spotlight item
    const spotlight = tracks[0] || posts[0] || artists[0] || null

    res.status(200).json({
      success: true,
      data: {
        discoveries: shuffle(discoveries).slice(0, limit),
        spotlight
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        seed
      }
    })
  } catch (error: any) {
    console.error('[Agent Discover] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch discoveries',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        seed
      }
    })
  }
}
