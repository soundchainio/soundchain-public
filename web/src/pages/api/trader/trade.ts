import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/trader/trade — Manual buy/sell commands from trader page
 * GET  /api/trader/trade — Bot polls for pending commands
 *
 * In-memory queue — bot picks up commands and clears them
 */

interface TradeCommand {
  action: 'BUY' | 'SELL'
  mode: 'ALL_IN'
  ts: number
  source: 'manual'
}

let pendingCommand: TradeCommand | null = null
const BOT_TOKEN = process.env.TRADER_BOT_TOKEN || 'ogun-razor-v12'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers['x-bot-token'] || req.query.token
  if (token !== BOT_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (req.method === 'POST') {
    const { action } = req.body
    if (action !== 'BUY' && action !== 'SELL') {
      return res.status(400).json({ error: 'action must be BUY or SELL' })
    }

    pendingCommand = {
      action,
      mode: 'ALL_IN',
      ts: Date.now(),
      source: 'manual',
    }

    return res.status(200).json({ ok: true, command: pendingCommand })
  }

  if (req.method === 'GET') {
    // Bot polls — return and clear
    const cmd = pendingCommand
    pendingCommand = null
    return res.status(200).json({ command: cmd })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
