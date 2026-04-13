/**
 * /api/agent/login-metrics
 *
 * POST — Record a login event (auth method, timing, success/fail)
 * GET — Summary of login metrics for War Room / agent_login
 *
 * Called by the login page on every attempt. agent_login uses
 * the GET endpoint to report metrics at War Room standups.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const COLLECTION = 'login_metrics'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const col = db.collection(COLLECTION)

    if (req.method === 'POST') {
      const {
        method,      // 'face_id' | 'email_bypass' | 'email_direct' | 'google_oauth' | 'wallet'
        success,     // true | false
        durationMs,  // time from page load to login complete (or failure)
        coldStart,   // true if first request 504'd
        error,       // error message if failed
        userAgent,   // browser info
      } = req.body

      if (!method) return res.status(400).json({ error: 'method required' })

      await col.insertOne({
        method,
        success: Boolean(success),
        durationMs: Number(durationMs) || 0,
        coldStart: Boolean(coldStart),
        error: error || null,
        userAgent: userAgent || req.headers['user-agent'] || null,
        createdAt: new Date(),
      })

      return res.status(201).json({ ok: true })
    }

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

      // Get metrics for last 24 hours and last 7 days
      const now = new Date()
      const day = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [total, last24h, last7d, byMethod, avgDuration, failRate] = await Promise.all([
        col.estimatedDocumentCount(),
        col.countDocuments({ createdAt: { $gte: day } }),
        col.countDocuments({ createdAt: { $gte: week } }),
        col.aggregate([
          { $match: { createdAt: { $gte: week } } },
          { $group: { _id: '$method', count: { $sum: 1 }, successes: { $sum: { $cond: ['$success', 1, 0] } } } },
          { $sort: { count: -1 } },
        ]).toArray(),
        col.aggregate([
          { $match: { createdAt: { $gte: week }, success: true } },
          { $group: { _id: null, avg: { $avg: '$durationMs' }, min: { $min: '$durationMs' }, max: { $max: '$durationMs' } } },
        ]).toArray(),
        col.aggregate([
          { $match: { createdAt: { $gte: week } } },
          { $group: { _id: null, total: { $sum: 1 }, failures: { $sum: { $cond: ['$success', 0, 1] } }, coldStarts: { $sum: { $cond: ['$coldStart', 1, 0] } } } },
        ]).toArray(),
      ])

      const avgMs = avgDuration[0]?.avg || 0
      const failData = failRate[0] || { total: 0, failures: 0, coldStarts: 0 }

      return res.status(200).json({
        agent: 'agent_login',
        summary: {
          totalLogins: total,
          last24h,
          last7d,
          avgLoginTimeMs: Math.round(avgMs),
          avgLoginTimeSec: (avgMs / 1000).toFixed(1),
          failRate: failData.total > 0 ? ((failData.failures / failData.total) * 100).toFixed(1) + '%' : '0%',
          coldStartRate: failData.total > 0 ? ((failData.coldStarts / failData.total) * 100).toFixed(1) + '%' : '0%',
          byMethod: byMethod.map((m: any) => ({
            method: m._id,
            count: m.count,
            successRate: m.count > 0 ? ((m.successes / m.count) * 100).toFixed(1) + '%' : '0%',
          })),
        },
        generatedAt: new Date().toISOString(),
      })
    }

    return res.status(405).json({ error: 'GET or POST' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
