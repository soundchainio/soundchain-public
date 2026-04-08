/**
 * OGUN Trader — Live Status Page
 * Real-time view of the trading bot on any device
 * Reads from /api/trader/status which reads the bot's state.json
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import { TrendingUp, TrendingDown, Target, Trophy, Clock, Zap, BarChart3, RefreshCw } from 'lucide-react'

interface TraderStatus {
  portfolio: number
  cash: number
  solQty: number
  solPrice: number
  entryPrice: number
  pnlPerSol: number
  pnlTotal: number
  pnlPct: number
  rsi1m: number
  rsi1h: number
  high24h: number
  low24h: number
  posInRange: number
  btcPrice: number
  btcChange24h: number
  fearGreed: number
  fearGreedLabel: string
  winRate: number
  wins: number
  losses: number
  totalPnl: number
  todayCycles: number
  todayProfit: number
  dailyTarget: number
  dailyPct: number
  bonusRound: boolean
  holding: boolean
  lastAction: string
  uptime: string
}

export default function TraderPage() {
  const [status, setStatus] = useState<TraderStatus | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/trader/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
          setLastUpdate(new Date())
          setError('')
        } else {
          setError('Bot offline')
        }
      } catch {
        setError('Cannot reach bot')
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const isUp = status && status.pnlPerSol >= 0
  const dailyPct = status?.dailyPct || 0

  return (
    <>
      <Head>
        <title>OGUN Trader | SoundChain</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <div className="min-h-screen bg-black text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight">OGUN TRADER</h1>
            <p className="text-[10px] text-gray-500">THE RAZOR v12 • LIVE</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-400">{lastUpdate ? `${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago` : '...'}</span>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {status && (
          <div className="p-4 space-y-3">
            {/* Daily Target Progress */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/30 to-amber-800/10 border border-amber-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-400">Daily Target</span>
                <span className={`text-lg font-black ${status.bonusRound ? 'text-green-400' : 'text-white'}`}>
                  ${status.todayProfit.toFixed(2)} / ${status.dailyTarget}
                </span>
              </div>
              <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${status.bonusRound ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
                  style={{ width: `${Math.min(100, dailyPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">{dailyPct.toFixed(0)}%</span>
                {status.bonusRound && (
                  <span className="text-xs font-bold text-green-400 animate-pulse">🎰 BONUS ROUND</span>
                )}
              </div>
            </div>

            {/* Portfolio */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Portfolio</span>
                <span className="text-xl font-black">${status.portfolio.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Cash: ${status.cash.toFixed(2)}</span>
                <span className="text-xs text-gray-500">SOL: {status.solQty.toFixed(2)}</span>
              </div>
            </div>

            {/* Position */}
            {status.holding && (
              <div className={`p-4 rounded-2xl border ${isUp ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-400">Position</span>
                    <p className="text-lg font-black">{status.solQty.toFixed(2)} SOL @ ${status.entryPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{status.pnlTotal.toFixed(2)}
                    </span>
                    <p className={`text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{status.pnlPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!status.holding && (
              <div className="p-4 rounded-2xl bg-cyan-900/20 border border-cyan-500/30 text-center">
                <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                <p className="text-sm text-cyan-400 font-bold">Waiting for entry</p>
                <p className="text-xs text-gray-400">1m RSI ≤ 45 triggers buy</p>
              </div>
            )}

            {/* SOL Price + Range */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black">${status.solPrice.toFixed(2)}</span>
                <div className="text-right">
                  <span className="text-xs text-gray-500">24H Range</span>
                  <p className="text-sm text-gray-300">${status.low24h.toFixed(2)} — ${status.high24h.toFixed(2)}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-black/50 rounded-full mt-2 overflow-hidden relative">
                <div className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 w-full opacity-30" />
                <div
                  className="absolute h-full w-1.5 bg-white rounded-full top-0"
                  style={{ left: `${Math.max(0, Math.min(100, status.posInRange))}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                <span>Low</span>
                <span>Pos: {status.posInRange.toFixed(0)}%</span>
                <span>High</span>
              </div>
            </div>

            {/* RSI Gauges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">1m RSI</span>
                <p className={`text-2xl font-black mt-1 ${status.rsi1m <= 45 ? 'text-green-400' : status.rsi1m >= 64 ? 'text-red-400' : 'text-white'}`}>
                  {status.rsi1m.toFixed(0)}
                </p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {status.rsi1m <= 45 ? 'BUY ZONE' : status.rsi1m >= 64 ? 'SELL ZONE' : 'NEUTRAL'}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">1h RSI</span>
                <p className={`text-2xl font-black mt-1 ${status.rsi1h <= 30 ? 'text-green-400' : status.rsi1h >= 70 ? 'text-red-400' : 'text-white'}`}>
                  {status.rsi1h.toFixed(0)}
                </p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {status.rsi1h <= 30 ? 'OVERSOLD' : status.rsi1h >= 70 ? 'OVERBOUGHT' : 'NEUTRAL'}
                </p>
              </div>
            </div>

            {/* Market Intel */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-gray-300">Market Intel</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">BTC</span>
                  <span className="text-white">${(status.btcPrice / 1000).toFixed(1)}K <span className={status.btcChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>{status.btcChange24h >= 0 ? '+' : ''}{status.btcChange24h.toFixed(1)}%</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">F&G</span>
                  <span className={`${status.fearGreed <= 25 ? 'text-red-400' : status.fearGreed >= 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {status.fearGreed} ({status.fearGreedLabel})
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase">Win Rate</span>
                  <p className="text-lg font-black text-green-400">{status.winRate.toFixed(0)}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase">Cycles</span>
                  <p className="text-lg font-black">{status.todayCycles}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase">Total P&L</span>
                  <p className={`text-lg font-black ${status.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${status.totalPnl.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Razor Status */}
            <div className="p-3 rounded-2xl bg-purple-900/20 border border-purple-500/30 text-center">
              <p className="text-xs text-purple-400 font-mono">{status.lastAction}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-6 text-center">
          <p className="text-[10px] text-gray-600">THE RAZOR v12 • 1m RSI Buy ≤45 Sell ≥64 • Never sell at a loss</p>
        </div>
      </div>
    </>
  )
}
