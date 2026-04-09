import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/trader/trade — Manual buy/sell commands from trader page
 * GET  /api/trader/trade — Bot polls for pending commands
 *
 * In-memory queue — bot picks up commands and clears them
 */

interface TradeCommand {
  action: 'BUY' | 'SELL' | 'PAUSE' | 'RESUME'
  mode: 'ALL_IN'
  ts: number
  source: 'manual'
}

let pendingCommand: TradeCommand | null = null
let botPaused = false
const BOT_TOKEN = process.env.TRADER_BOT_TOKEN || 'ogun-razor-v12'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers['x-bot-token'] || req.query.token
  if (token !== BOT_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (req.method === 'POST') {
    const { action } = req.body
    if (!['BUY', 'SELL', 'PAUSE', 'RESUME'].includes(action)) {
      return res.status(400).json({ error: 'action must be BUY, SELL, PAUSE, or RESUME' })
    }

    if (action === 'PAUSE') {
      botPaused = true
      return res.status(200).json({ ok: true, paused: true })
    }
    if (action === 'RESUME') {
      botPaused = false
      return res.status(200).json({ ok: true, paused: false })
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
    // Bot polls — return command and pause state
    const cmd = pendingCommand
    pendingCommand = null
    return res.status(200).json({ command: cmd, paused: botPaused })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
