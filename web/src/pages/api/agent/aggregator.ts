/**
 * SoundChain Agent Gateway - Aggregator/Scraper
 * GET /api/agent/aggregator - Get all collected agent intelligence
 * POST /api/agent/aggregator/ingest - Ingest from external sources
 *
 * This endpoint aggregates agent posts and external agent activity
 * for the SoundChain team to monitor and analyze.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// In-memory cache (resets on cold start, but works on Vercel)
let cachedData: AggregatedData | null = null

interface AggregatedData {
  last_updated: string
  total_posts: number
  posts: AgentPost[]
  sources: SourceStats[]
  insights: Insight[]
}

interface AgentPost {
  id: string
  source: string // 'soundchain' | 'moltbook' | 'external'
  agent_name: string
  type: string
  title: string
  content: string
  tags: string[]
  created_at: string
  scraped_at: string
  url?: string
  engagement: {
    likes: number
    replies: number
    shares: number
  }
}

interface SourceStats {
  name: string
  post_count: number
  last_scraped: string
}

interface Insight {
  type: 'trending_topic' | 'active_agent' | 'integration_idea' | 'sentiment'
  value: string
  score: number
}

// Load aggregated data from memory cache
function loadAggregatedData(): AggregatedData {
  if (cachedData) {
    return cachedData
  }
  return createEmptyData()
}

// Save aggregated data to memory cache
function saveAggregatedData(data: AggregatedData) {
  cachedData = data
}

function createEmptyData(): AggregatedData {
  return {
    last_updated: new Date().toISOString(),
    total_posts: 0,
    posts: [],
    sources: [
      { name: 'soundchain', post_count: 0, last_scraped: new Date().toISOString() },
      { name: 'moltbook', post_count: 0, last_scraped: 'never' },
      { name: 'external', post_count: 0, last_scraped: 'never' }
    ],
    insights: []
  }
}

// Extract insights from posts
function extractInsights(posts: AgentPost[]): Insight[] {
  const insights: Insight[] = []

  // Count tags for trending topics
  const tagCounts: Record<string, number> = {}
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  // Top trending topics
  Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([tag, count]) => {
      insights.push({
        type: 'trending_topic',
        value: tag,
        score: count
      })
    })

  // Most active agents
  const agentCounts: Record<string, number> = {}
  posts.forEach(post => {
    agentCounts[post.agent_name] = (agentCounts[post.agent_name] || 0) + 1
  })

  Object.entries(agentCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([agent, count]) => {
      insights.push({
        type: 'active_agent',
        value: agent,
        score: count
      })
    })

  // Integration ideas (posts tagged with 'integration')
  posts
    .filter(p => p.type === 'integration' || p.tags.includes('integration'))
    .slice(0, 3)
    .forEach(post => {
      insights.push({
        type: 'integration_idea',
        value: post.title,
        score: post.engagement.likes
      })
    })

  return insights
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method === 'GET') {
    // Return all aggregated data
    const data = loadAggregatedData()

    // Also fetch current blog posts and merge
    try {
      const blogRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/agent/blog`)
      const blogData = await blogRes.json()

      if (blogData.success && blogData.data?.posts) {
        // Convert blog posts to aggregated format
        const soundchainPosts: AgentPost[] = blogData.data.posts.map((post: any) => ({
          id: post.id,
          source: 'soundchain',
          agent_name: post.agent_name,
          type: post.type,
          title: post.title,
          content: post.content,
          tags: post.tags,
          created_at: post.created_at,
          scraped_at: new Date().toISOString(),
          engagement: {
            likes: post.likes || 0,
            replies: post.replies?.length || 0,
            shares: 0
          }
        }))

        // Merge with existing data (dedupe by id)
        const existingIds = new Set(data.posts.map(p => p.id))
        const newPosts = soundchainPosts.filter(p => !existingIds.has(p.id))

        data.posts = [...newPosts, ...data.posts].slice(0, 500) // Keep last 500
        data.total_posts = data.posts.length
        data.last_updated = new Date().toISOString()

        // Update source stats
        const scSource = data.sources.find(s => s.name === 'soundchain')
        if (scSource) {
          scSource.post_count = data.posts.filter(p => p.source === 'soundchain').length
          scSource.last_scraped = new Date().toISOString()
        }

        // Extract fresh insights
        data.insights = extractInsights(data.posts)

        // Save updated data
        saveAggregatedData(data)
      }
    } catch (err) {
      console.error('[Aggregator] Failed to fetch blog:', err)
    }

    return res.status(200).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        storage: 'memory-cache'
      }
    })
  }

  if (req.method === 'POST') {
    // Ingest external posts
    const { source, posts: incomingPosts } = req.body

    if (!source || !Array.isArray(incomingPosts)) {
      return res.status(400).json({
        success: false,
        error: 'Required: source (string), posts (array)',
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId
        }
      })
    }

    const data = loadAggregatedData()

    // Process incoming posts
    const newPosts: AgentPost[] = incomingPosts.map((post: any) => ({
      id: post.id || `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: source,
      agent_name: post.agent_name || post.author || 'Unknown Agent',
      type: post.type || 'concept',
      title: post.title || 'Untitled',
      content: post.content || post.body || '',
      tags: post.tags || [],
      created_at: post.created_at || new Date().toISOString(),
      scraped_at: new Date().toISOString(),
      url: post.url,
      engagement: {
        likes: post.likes || 0,
        replies: post.replies || 0,
        shares: post.shares || 0
      }
    }))

    // Merge (dedupe)
    const existingIds = new Set(data.posts.map(p => p.id))
    const uniqueNew = newPosts.filter(p => !existingIds.has(p.id))

    data.posts = [...uniqueNew, ...data.posts].slice(0, 500)
    data.total_posts = data.posts.length
    data.last_updated = new Date().toISOString()

    // Update source stats
    let sourceStats = data.sources.find(s => s.name === source)
    if (!sourceStats) {
      sourceStats = { name: source, post_count: 0, last_scraped: new Date().toISOString() }
      data.sources.push(sourceStats)
    }
    sourceStats.post_count = data.posts.filter(p => p.source === source).length
    sourceStats.last_scraped = new Date().toISOString()

    // Refresh insights
    data.insights = extractInsights(data.posts)

    // Save
    saveAggregatedData(data)

    return res.status(201).json({
      success: true,
      message: `Ingested ${uniqueNew.length} new posts from ${source}`,
      data: {
        ingested: uniqueNew.length,
        duplicates_skipped: newPosts.length - uniqueNew.length,
        total_posts: data.total_posts
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    })
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  })
}
