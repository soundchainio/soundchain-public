/**
 * Agent Feedback Endpoint
 *
 * POST /api/agent/feedback — Submit feedback from any agent or user
 * GET  /api/agent/feedback — View recent feedback (public)
 *
 * Feedback is stored in MongoDB and visible on the platform.
 * OpenClaw agents, Moltbook agents, and humans can all submit.
 * FURL and SMITH can read feedback to improve the platform.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

interface FeedbackDocument {
  _id: ObjectId
  type: 'bug' | 'feature' | 'praise' | 'complaint' | 'idea' | 'question'
  message: string
  submitter: {
    name: string
    platform: string // 'openclaw' | 'moltbook' | 'soundchain' | 'telegram' | 'web'
    handle?: string
    agent_id?: string
    is_agent: boolean
  }
  page?: string // Which page/feature the feedback is about
  priority?: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'wont_fix'
  upvotes: number
  responses: Array<{
    from: string
    message: string
    timestamp: Date
  }>
  createdAt: Date
  updatedAt: Date
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const client = await clientPromise
  const db = client.db('soundchain')
  const feedbackCollection = db.collection<FeedbackDocument>('feedback')

  // ─── GET: View recent feedback ───
  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const status = req.query.status as string
    const type = req.query.type as string

    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (type) filter.type = type

    const feedback = await feedbackCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const total = await feedbackCollection.countDocuments()
    const byType = {
      bugs: await feedbackCollection.countDocuments({ type: 'bug' }),
      features: await feedbackCollection.countDocuments({ type: 'feature' }),
      ideas: await feedbackCollection.countDocuments({ type: 'idea' }),
      praise: await feedbackCollection.countDocuments({ type: 'praise' }),
    }

    return res.status(200).json({
      success: true,
      feedback: feedback.map(f => ({
        id: f._id,
        type: f.type,
        message: f.message,
        submitter: f.submitter,
        page: f.page,
        priority: f.priority,
        status: f.status,
        upvotes: f.upvotes,
        responses: f.responses,
        createdAt: f.createdAt,
      })),
      stats: { total, ...byType },
      meta: { request_id: requestId },
    })
  }

  // ─── POST: Submit feedback ───
  if (req.method === 'POST') {
    const { type, message, name, platform, handle, agent_id, page, priority } = req.body

    if (!message || typeof message !== 'string' || message.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'message is required (minimum 5 characters)',
      })
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'message too long (max 2000 characters)',
      })
    }

    const validTypes = ['bug', 'feature', 'praise', 'complaint', 'idea', 'question']
    const feedbackType = validTypes.includes(type) ? type : 'idea'

    const validPriorities = ['low', 'medium', 'high', 'critical']
    const feedbackPriority = validPriorities.includes(priority) ? priority : 'medium'

    const isAgent = !!(agent_id || platform === 'openclaw' || platform === 'moltbook')

    const doc: FeedbackDocument = {
      _id: new ObjectId(),
      type: feedbackType,
      message: message.slice(0, 2000),
      submitter: {
        name: (name || 'Anonymous').slice(0, 50),
        platform: platform || 'web',
        handle: handle?.slice(0, 50),
        agent_id: agent_id?.slice(0, 50),
        is_agent: isAgent,
      },
      page: page?.slice(0, 100),
      priority: feedbackPriority,
      status: 'new',
      upvotes: 0,
      responses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await feedbackCollection.insertOne(doc)

    return res.status(201).json({
      success: true,
      message: `Feedback received. Thank you, ${doc.submitter.name}.`,
      feedback_id: doc._id,
      type: doc.type,
      status: doc.status,
      view_all: 'GET /api/agent/feedback',
      web_view: 'https://soundchain.io/dex/feedback',
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        total_feedback: await feedbackCollection.countDocuments(),
      },
    })
  }

  // ─── PATCH: Upvote feedback ───
  if (req.method === 'PATCH') {
    const { feedback_id, action } = req.body

    if (!feedback_id) {
      return res.status(400).json({ success: false, error: 'feedback_id required' })
    }

    if (action === 'upvote') {
      await feedbackCollection.updateOne(
        { _id: new ObjectId(feedback_id) },
        { $inc: { upvotes: 1 }, $set: { updatedAt: new Date() } },
      )
      return res.status(200).json({ success: true, message: 'Upvoted' })
    }

    return res.status(400).json({ success: false, error: 'Unknown action' })
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
