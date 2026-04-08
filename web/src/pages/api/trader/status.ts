import type { NextApiRequest, NextApiResponse } from 'next'
import { readFileSync } from 'fs'
import path from 'path'

/**
 * /api/trader/status — Returns live OGUN trader bot status
 * Reads from the bot's state.json + current Coinbase data
 * Polled every 5 seconds by the /trader page
 */

const STATE_PATH = path.join(process.env.HOME || '/Users/soundchain', 'ogun-trader/state.json')
const LOG_PATH = path.join(process.env.HOME || '/Users/soundchain', 'ogun-trader/trader.log')
const CHART_PATH = path.join(process.env.HOME || '/Users/soundchain', 'ogun-trader/chart.json')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  try {
    // Read bot state
    let state: any = {}
    try {
      state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'))
    } catch { /* no state file */ }

    // Read chart data
    let chartData: any = { prices: [], trades: [] }
    try {
      chartData = JSON.parse(readFileSync(CHART_PATH, 'utf-8'))
    } catch { /* no chart file yet */ }

    // Read last 50 lines of log for current data
    let lastLines: string[] = []
    try {
      const log = readFileSync(LOG_PATH, 'utf-8')
      lastLines = log.split('\n').slice(-50)
    } catch { /* no log */ }

    // Parse current data from log
    let solPrice = 0, rsi1m = 50, rsi1h = 50, high24h = 0, low24h = 0, posInRange = 50
    let btcPrice = 0, btcChange24h = 0, fearGreed = 50, fearGreedLabel = 'Neutral'
    let portfolio = 0, cash = 0, solQty = 0, entryPrice = 0
    let pnlPerSol = 0, pnlTotal = 0, pnlPct = 0
    let lastAction = 'Starting...'
    let uptime = '0.0h'

    for (const line of lastLines) {
      // Parse SOL price and RSI from scan line
      const solMatch = line.match(/SOL-USD \$(\d+\.\d+)/)
      if (solMatch) solPrice = parseFloat(solMatch[1])

      const rsi1mMatch = line.match(/1m RSI:(\d+)/)
      if (rsi1mMatch) rsi1m = parseInt(rsi1mMatch[1])

      const rsi1hMatch = line.match(/1h RSI:(\d+)/)
      if (rsi1hMatch) rsi1h = parseInt(rsi1hMatch[1])

      const rangeMatch = line.match(/24H:\$(\d+\.\d+)-\$(\d+\.\d+) pos:(\d+)%/)
      if (rangeMatch) {
        low24h = parseFloat(rangeMatch[1])
        high24h = parseFloat(rangeMatch[2])
        posInRange = parseInt(rangeMatch[3])
      }

      // Parse portfolio
      const portMatch = line.match(/Portfolio: \$(\d+\.\d+)/)
      if (portMatch) portfolio = parseFloat(portMatch[1])

      const cashMatch = line.match(/Cash: \$(\d+\.\d+)/)
      if (cashMatch) cash = parseFloat(cashMatch[1])

      const solQtyMatch = line.match(/SOL: (\d+\.\d+)/)
      if (solQtyMatch) solQty = parseFloat(solQtyMatch[1])

      // Parse position
      const posMatch = line.match(/@ \$(\d+\.\d+) → \$(\d+\.\d+) \(([+-]?\$?\d+\.\d+) \/ ([+-]?\d+\.\d+)%\)/)
      if (posMatch) {
        entryPrice = parseFloat(posMatch[1])
        pnlTotal = parseFloat(posMatch[3].replace('$', ''))
        pnlPct = parseFloat(posMatch[4])
        pnlPerSol = solQty > 0 ? pnlTotal / solQty : 0
      }

      // Parse BTC
      const btcMatch = line.match(/BTC: \$(\d+\.\d+)K ([+-]?\d+\.\d+)%/)
      if (btcMatch) {
        btcPrice = parseFloat(btcMatch[1]) * 1000
        btcChange24h = parseFloat(btcMatch[2])
      }

      // Parse F&G
      const fgMatch = line.match(/F&G: (\d+) \(([^)]+)\)/)
      if (fgMatch) {
        fearGreed = parseInt(fgMatch[1])
        fearGreedLabel = fgMatch[2]
      }

      // Parse uptime
      const uptimeMatch = line.match(/Uptime: (\d+\.\d+h)/)
      if (uptimeMatch) uptime = uptimeMatch[1]

      // Last action (razor line)
      if (line.includes('🔪') || line.includes('🔴') || line.includes('🟢')) {
        const actionMatch = line.match(/📒 \| (.+)$/)
        if (actionMatch) lastAction = actionMatch[1].trim()
      }
    }

    // Cycle data from state
    const cycles = state.cycles || []
    const todayCycles = cycles.filter((c: any) => c.sellTime && new Date(c.sellTime).toDateString() === new Date().toDateString())
    const todayProfit = Math.max(
      todayCycles.reduce((s: number, c: any) => s + (c.pnl || 0), 0),
      state.stats?.totalPnl || 0
    )
    const dailyTarget = 150
    const totalWins = state.stats?.wins || 0
    const totalLosses = state.stats?.losses || 0
    const winRate = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0

    return res.status(200).json({
      portfolio,
      cash,
      solQty,
      solPrice,
      entryPrice,
      pnlPerSol,
      pnlTotal,
      pnlPct,
      rsi1m,
      rsi1h,
      high24h,
      low24h,
      posInRange,
      btcPrice,
      btcChange24h,
      fearGreed,
      fearGreedLabel,
      winRate,
      wins: totalWins,
      losses: totalLosses,
      totalPnl: state.stats?.totalPnl || 0,
      todayCycles: todayCycles.length,
      todayProfit,
      dailyTarget,
      dailyPct: Math.min(100, (todayProfit / dailyTarget) * 100),
      bonusRound: todayProfit >= dailyTarget,
      holding: solQty > 0.5,
      lastAction,
      uptime,
      chart: chartData.prices || [],
      recentTrades: chartData.trades || [],
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
