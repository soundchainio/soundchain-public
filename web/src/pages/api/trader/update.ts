import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/trader/update — Bot pushes its status here every 5 seconds
 * GET /api/trader/update — Trader page reads the latest status
 *
 * In-memory store on Vercel — persists across requests within same Lambda instance
 */

// Store latest bot status in memory (Vercel Lambda keeps this warm)
let latestStatus: any = null
let lastUpdateTime = 0

// Simple auth token to prevent random writes
const BOT_TOKEN = process.env.TRADER_BOT_TOKEN || 'ogun-razor-v12'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Bot pushes status
    const token = req.headers['x-bot-token'] || req.query.token
    if (token !== BOT_TOKEN) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    latestStatus = req.body
    lastUpdateTime = Date.now()
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    // Auth check — only commander can view
    const readToken = req.query.token || req.headers['x-bot-token']
    if (readToken !== BOT_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!latestStatus) {
      return res.status(200).json({ error: 'No data yet — bot hasn\'t reported', empty: true })
    }

    return res.status(200).json({
      ...latestStatus,
      age: Math.floor((Date.now() - lastUpdateTime) / 1000),
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
