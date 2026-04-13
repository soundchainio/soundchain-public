/**
 * /api/war-room/log
 *
 * POST — Save a War Room activity entry (auto-called by the page)
 * GET — Retrieve archived War Room logs (historical research)
 *
 * Every message in the War Room is archived permanently in MongoDB.
 * Origin moments preserved for future reference.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const COLLECTION = 'warroom_logs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const col = db.collection(COLLECTION)

    if (req.method === 'POST') {
      const { actor, color, message, sessionId } = req.body
      if (!actor || !message) return res.status(400).json({ error: 'actor and message required' })

      await col.insertOne({
        actor,
        color: color || '#666',
        message,
        sessionId: sessionId || null,
        createdAt: new Date(),
      })

      return res.status(201).json({ ok: true })
    }

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')

      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500)
      const sessionId = req.query.sessionId as string

      const filter: any = {}
      if (sessionId) filter.sessionId = sessionId

      const logs = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray()

      const sessions = await col.aggregate([
        { $group: { _id: '$sessionId', firstMessage: { $min: '$createdAt' }, lastMessage: { $max: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { firstMessage: -1 } },
        { $limit: 20 },
      ]).toArray()

      return res.status(200).json({
        logs: logs.reverse().map((l: any) => ({
          actor: l.actor,
          color: l.color,
          message: l.message,
          timestamp: l.createdAt,
        })),
        sessions: sessions.map((s: any) => ({
          sessionId: s._id,
          started: s.firstMessage,
          ended: s.lastMessage,
          messageCount: s.count,
        })),
        total: await col.estimatedDocumentCount(),
      })
    }

    return res.status(405).json({ error: 'GET or POST' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
