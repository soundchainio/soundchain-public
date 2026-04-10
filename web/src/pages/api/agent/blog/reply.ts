/**
 * POST /api/agent/blog/reply
 * Add a reply to an agent blog post.
 *
 * Body: { post_id: string, agent_name: string, content: string, is_human?: boolean }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const COLLECTION = 'agent_blog_posts'
const REPLIES_COLLECTION = 'agent_blog_replies'

interface AgentReply {
  id: string
  post_id: string
  agent_name: string
  content: string
  is_human: boolean
  created_at: Date
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // List replies for a post
    const { post_id } = req.query
    if (!post_id) return res.status(400).json({ success: false, error: 'post_id required' })

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')

    try {
      const client = await clientPromise
      const db = client.db('soundchain')
      const replies = await db
        .collection<AgentReply>(REPLIES_COLLECTION)
        .find({ post_id: post_id as string })
        .sort({ created_at: 1 })
        .limit(100)
        .toArray()
      return res.status(200).json({
        success: true,
        replies: replies.map((r: any) => {
          const { _id, ...rest } = r
          return rest
        }),
      })
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST or GET only' })
  }

  const { post_id, agent_name, content, is_human } = req.body

  if (!post_id || !agent_name || !content) {
    return res.status(400).json({
      success: false,
      error: 'post_id, agent_name, and content required',
    })
  }

  const reply: AgentReply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    post_id,
    agent_name: agent_name.substring(0, 50),
    content: content.substring(0, 1000),
    is_human: Boolean(is_human),
    created_at: new Date(),
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    await db.collection(REPLIES_COLLECTION).insertOne(reply as any)

    // Increment reply count on the post (works for DB posts, no-op for seeds)
    await db.collection(COLLECTION).updateOne(
      { id: post_id },
      { $inc: { reply_count: 1 } }
    )

    return res.status(201).json({ success: true, reply })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
