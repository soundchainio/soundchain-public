/**
 * OGUN Trader — Live Status Page
 * Real-time view of the trading bot on any device
 * Reads from /api/trader/status which reads the bot's state.json
 */

import { useState, useEffect, useRef, useCallback, ReactElement } from 'react'
import Head from 'next/head'
import { TrendingUp, TrendingDown, Target, Trophy, Clock, Zap, BarChart3, RefreshCw, Terminal, X, Maximize2, Minimize2, ShoppingCart, DollarSign } from 'lucide-react'
import type { CustomLayout } from './_app'

// CLI bridge whitelist — same as AgentStatusTicker
const CLI_BRIDGE_WHITELIST = ['homie_yay_yay', 'furda1', 'furdA1', 'furl_bldr', 'furl', 'jeremy_soundchain', 'jsan619']
const DEFAULT_TUNNEL = 'tunnel.soundchain.io'

interface ChartPoint { p: number; t: number }
interface TradeEntry { action: string; price: number; ts: number; pnl?: number }

interface TraderStatus {
  ts: number
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
  paused: boolean
  lastAction: string
  uptime: string
  chart: ChartPoint[]
  recentTrades: TradeEntry[]
  dailyHistory: Array<{ date: string; cycles: number; profit: number; wins: number; losses: number }>
}

function TraderPage() {
  const [status, setStatus] = useState<TraderStatus | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  // Tick every second so age display stays live
  useEffect(() => {
    const t = setInterval(() => setTick(k => k + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ─── FURL Terminal State ─────────────────────────────────────────
  const [termOpen, setTermOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('trader_term_open') === '1'
  })
  const [termFullscreen, setTermFullscreen] = useState(false)
  const [termHandle, setTermHandle] = useState(() => {
    if (typeof window === 'undefined') return ''
    return sessionStorage.getItem('trader_term_handle') || ''
  })
  const [termAuthed, setTermAuthed] = useState(() => {
    if (typeof window === 'undefined') return false
    const h = sessionStorage.getItem('trader_term_handle') || ''
    return CLI_BRIDGE_WHITELIST.includes(h.toLowerCase())
  })
  const [termTunnel, setTermTunnel] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_TUNNEL
    return sessionStorage.getItem('trader_term_tunnel') || DEFAULT_TUNNEL
  })
  const [termConnected, setTermConnected] = useState(false)
  const termContainerRef = useRef<HTMLDivElement>(null)
  const termIframeRef = useRef<HTMLIFrameElement | null>(null)

  // ─── Manual Trade State ─────────────────────────────────────────
  const [tradeLoading, setTradeLoading] = useState<'BUY' | 'SELL' | null>(null)
  const [tradeResult, setTradeResult] = useState<{ action: string; ok: boolean; ts: number } | null>(null)

  const executeTrade = async (action: 'BUY' | 'SELL') => {
    setTradeLoading(action)
    setTradeResult(null)
    try {
      const res = await fetch('/api/trader/trade?token=ogun-razor-v12', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      setTradeResult({ action, ok: data.ok, ts: Date.now() })
    } catch {
      setTradeResult({ action, ok: false, ts: Date.now() })
    } finally {
      setTradeLoading(null)
      // Clear result after 3s
      setTimeout(() => setTradeResult(null), 3000)
    }
  }

  const connectTerminal = useCallback((tunnelUrl: string) => {
    const container = termContainerRef.current
    if (!container) return

    // Clean up previous iframe
    if (termIframeRef.current) {
      try { termIframeRef.current.contentWindow?.postMessage({ type: 'furl-disconnect' }, '*') } catch {}
      try { termIframeRef.current.remove() } catch {}
      termIframeRef.current = null
    }

    const cleanUrl = tunnelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const iframeSrc = `/furl-terminal.html?tunnel=${encodeURIComponent(cleanUrl)}`

    const iframe = document.createElement('iframe')
    iframe.src = iframeSrc
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#0a0a0a;display:block'
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write')
    iframe.title = 'FURL Terminal — Trader'

    container.innerHTML = ''
    container.appendChild(iframe)
    termIframeRef.current = iframe
    setTermConnected(true)

    // Focus on click
    container.addEventListener('click', () => {
      try { iframe.contentWindow?.postMessage({ type: 'furl-focus' }, '*') } catch {}
    })

    // Re-fit on resize
    const handleResize = () => {
      try { iframe.contentWindow?.postMessage({ type: 'furl-fit' }, '*') } catch {}
    }
    window.addEventListener('resize', handleResize)
    ;(iframe as any)._cleanup = () => window.removeEventListener('resize', handleResize)
  }, [])

  const disconnectTerminal = useCallback(() => {
    if (termIframeRef.current) {
      try { termIframeRef.current.contentWindow?.postMessage({ type: 'furl-disconnect' }, '*') } catch {}
      try { (termIframeRef.current as any)._cleanup?.(); termIframeRef.current.remove() } catch {}
      termIframeRef.current = null
    }
    setTermConnected(false)
  }, [])

  const handleTermAuth = () => {
    const h = termHandle.trim().toLowerCase()
    if (CLI_BRIDGE_WHITELIST.includes(h)) {
      setTermAuthed(true)
      try { sessionStorage.setItem('trader_term_handle', h) } catch {}
    }
  }

  const handleTermConnect = () => {
    const url = termTunnel.trim() || DEFAULT_TUNNEL
    try {
      sessionStorage.setItem('trader_term_tunnel', url)
      sessionStorage.setItem('trader_term_open', '1')
    } catch {}
    connectTerminal(url)
  }

  const handleTermClose = () => {
    disconnectTerminal()
    setTermOpen(false)
    setTermFullscreen(false)
    try { sessionStorage.removeItem('trader_term_open') } catch {}
  }

  // Auto-reconnect on mount if terminal was open
  useEffect(() => {
    if (termOpen && termAuthed && termContainerRef.current && !termIframeRef.current) {
      const url = sessionStorage.getItem('trader_term_tunnel') || DEFAULT_TUNNEL
      // Small delay to let DOM mount
      const t = setTimeout(() => connectTerminal(url), 200)
      return () => clearTimeout(t)
    }
  }, [termOpen, termAuthed, connectTerminal])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/trader/update?token=ogun-razor-v12')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
          // Use bot's own timestamp for precision — shows real data age
          setLastUpdate(data.ts ? new Date(data.ts) : new Date())
          setError('')
        } else {
          setError('Bot offline')
        }
      } catch {
        setError('Cannot reach bot')
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 2000) // 2s polling — tight sync with bot
    return () => clearInterval(interval)
  }, [])

  // Safe number helper — prevents .toFixed crashes on undefined/null
  const n = (val: any, fallback = 0): number => {
    const num = parseFloat(val)
    return isNaN(num) ? fallback : num
  }
  const isUp = status && n(status.pnlPerSol) >= 0
  const dailyPct = n(status?.dailyPct)

  return (
    <>
      <Head>
        <title>OGUN Trader | SoundChain</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <div className="min-h-screen bg-[#030308] text-white relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Cyberpunk background grid */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Scan line effect */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }} />
        {/* ─── FURL Terminal Header (Compact) ─────────────────────── */}
        {!termOpen ? (
          <div className="px-3 py-2 border-b border-cyan-500/20 bg-[#0a0a0a]">
            <button
              onClick={() => setTermOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-cyan-900/20 border border-cyan-500/20 hover:bg-cyan-900/40 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400">FURL TERMINAL</span>
              <span className="text-[9px] text-gray-500">• tap to open</span>
            </button>
          </div>
        ) : (
          <div className={`${termFullscreen ? 'fixed inset-0 z-[200] bg-black flex flex-col' : 'border-b border-cyan-500/30 bg-[#0a0a0a]'}`}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-mono font-bold text-cyan-400">FURL</span>
                {termConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setTermFullscreen(!termFullscreen)} className="p-1 text-gray-500 hover:text-cyan-400">
                  {termFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
                <button onClick={handleTermClose} className="p-1 text-gray-500 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Auth gate */}
            {!termAuthed ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-gray-400">Enter your SoundChain handle</p>
                <input
                  value={termHandle}
                  onChange={e => setTermHandle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTermAuth()}
                  placeholder="your_handle"
                  className="w-full max-w-[200px] mx-auto block px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs font-mono text-center focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
                <button onClick={handleTermAuth} className="px-4 py-1 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition-colors">
                  Connect
                </button>
                {termHandle && !CLI_BRIDGE_WHITELIST.includes(termHandle.trim().toLowerCase()) && termHandle.length > 2 && (
                  <p className="text-[9px] text-red-400">handle not whitelisted</p>
                )}
              </div>
            ) : !termConnected ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-[10px] text-gray-500">Tunnel URL</p>
                <input
                  value={termTunnel}
                  onChange={e => setTermTunnel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTermConnect()}
                  placeholder={DEFAULT_TUNNEL}
                  className="w-full max-w-[260px] mx-auto block px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs font-mono text-center focus:border-cyan-500 focus:outline-none"
                />
                <button onClick={handleTermConnect} className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition-colors">
                  <Terminal className="w-3 h-3 inline mr-1" />Connect
                </button>
              </div>
            ) : (
              /* Terminal iframe container — compact unless fullscreen */
              <div
                ref={termContainerRef}
                className={`bg-[#0a0a0a] ${termFullscreen ? 'flex-1 min-h-0' : 'h-[180px]'}`}
                style={{ overflow: 'hidden' }}
              />
            )}
          </div>
        )}

        {/* Header — Holographic neon */}
        <div className="relative px-4 py-2.5 border-b border-cyan-500/20 flex items-center justify-between bg-black/80 backdrop-blur-xl">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div>
            <h1 className="text-sm font-black tracking-[0.2em] uppercase" style={{ textShadow: '0 0 10px rgba(6,182,212,0.5)' }}>OGUN TRADER</h1>
            <p className="text-[9px] text-cyan-500/60 font-mono tracking-widest">THE RAZOR v14 • {status?.paused ? '⏸ PAUSED' : 'LIVE'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-500/5">
              <span className={`w-1.5 h-1.5 rounded-full ${status?.paused ? 'bg-yellow-500' : 'bg-cyan-400'} animate-pulse`} />
              <span className="text-[9px] text-cyan-400 font-mono">{lastUpdate ? `${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s` : '...'}</span>
            </div>
          </div>
        </div>

        {/* ─── Manual Trade Tabs (BUY / SELL) ─────────────────────── */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => executeTrade('BUY')}
              disabled={tradeLoading !== null}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
                tradeLoading === 'BUY'
                  ? 'bg-green-500/40 border border-green-500/50 text-green-300 animate-pulse'
                  : 'bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/40 active:scale-95'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {tradeLoading === 'BUY' ? 'BUYING...' : 'BUY ALL IN'}
            </button>
            <button
              onClick={() => executeTrade('SELL')}
              disabled={tradeLoading !== null}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
                tradeLoading === 'SELL'
                  ? 'bg-red-500/40 border border-red-500/50 text-red-300 animate-pulse'
                  : 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/40 active:scale-95'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {tradeLoading === 'SELL' ? 'SELLING...' : 'SELL ALL IN'}
            </button>
          </div>
          {/* Pause/Resume Bot */}
          <button
            onClick={() => executeTrade(status?.paused ? 'RESUME' : 'PAUSE' as any)}
            className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all ${
              status?.paused
                ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 animate-pulse'
                : 'bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm text-gray-400 hover:bg-white/10'
            }`}
          >
            {status?.paused ? '▶ RESUME BOT' : '⏸ PAUSE BOT'}
          </button>
          {tradeResult && (
            <div className={`mt-2 p-2 rounded-lg text-center text-xs font-bold ${
              tradeResult.ok
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}>
              {tradeResult.ok ? `${tradeResult.action} command sent` : `${tradeResult.action} failed — check connection`}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {status && (
          <div className="p-4 space-y-2">
            {/* $100K MISSION — Cumulative goal tracker */}
            {(() => {
              const target = 100000
              const current = n(status.portfolio)
              const pct = Math.min(100, (current / target) * 100)
              const totalDays = status.dailyHistory?.length || 1
              const totalProfit = status.dailyHistory?.reduce((s: number, d: any) => s + n(d.profit), 0) || 0
              const avgPerDay = totalDays > 0 ? totalProfit / totalDays : 0
              const remaining = target - current
              const daysToTarget = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : Infinity
              return (
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/10 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.08)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-purple-400/70 uppercase tracking-[0.2em] font-mono">$100K MISSION</span>
                    <span className="text-[9px] text-gray-500 font-mono">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base font-black text-white" style={{ textShadow: '0 0 10px rgba(168,85,247,0.3)' }}>
                      ${current >= 1000 ? `${(current/1000).toFixed(1)}K` : current.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-500">→ $100K</span>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 via-cyan-500 to-green-400 transition-all duration-1000"
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[8px] font-mono">
                    <span className="text-gray-600">${remaining >= 1000 ? `${(remaining/1000).toFixed(1)}K` : remaining.toFixed(0)} to go</span>
                    <span className="text-purple-400/60">
                      {avgPerDay > 0 && daysToTarget < 9999 ? `~${daysToTarget}d at $${avgPerDay.toFixed(0)}/day` : 'Earning data...'}
                    </span>
                  </div>
                </div>
              )
            })()}

            {/* Daily Target Progress */}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-900/20 via-black to-amber-800/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-400">Daily Target</span>
                <span className={`text-base font-black ${status.bonusRound ? 'text-green-400' : 'text-white'}`}>
                  ${n(status.todayProfit).toFixed(2)} / ${status.dailyTarget}
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

            {/* Bonus Rounds Tracker */}
            {status.bonusRound && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-green-900/30 to-emerald-800/20 border border-green-500/40 animate-pulse">
                <div className="text-center">
                  <span className="text-2xl">🎰</span>
                  <h3 className="text-base font-black text-green-400 mt-1">BONUS ROUND</h3>
                  <p className="text-xs text-green-300 mt-1">Daily minimum hit! Every dollar from here is pure bonus</p>
                  <p className="text-base font-black text-white mt-2">
                    +${(n(status.todayProfit) - n(status.dailyTarget)).toFixed(2)} bonus
                  </p>
                </div>
              </div>
            )}

            {/* Portfolio */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Portfolio</span>
                <span className="text-base font-black">${n(status.portfolio).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Cash: ${n(status.cash).toFixed(2)}</span>
                <span className="text-xs text-gray-500">SOL: {n(status.solQty).toFixed(2)}</span>
              </div>
            </div>

            {/* Position + Fee Threshold Meter */}
            {status.holding && (() => {
              const pnl = n(status.pnlTotal)
              const solQty = n(status.solQty)
              const feeRoundTrip = 4.96 // ~$2.48 × 2
              const netProfit = pnl - feeRoundTrip
              // Meter range: -$15 to +$30
              const meterMin = -15
              const meterMax = 30
              const meterRange = meterMax - meterMin
              const meterPos = Math.max(0, Math.min(100, ((pnl - meterMin) / meterRange) * 100))
              const feeLinePos = ((feeRoundTrip - meterMin) / meterRange) * 100
              const zeroLinePos = ((0 - meterMin) / meterRange) * 100
              const inLoss = pnl < 0
              const inFeeZone = pnl >= 0 && pnl < feeRoundTrip
              const inProfit = pnl >= feeRoundTrip
              const zone = inLoss ? 'LOSS' : inFeeZone ? 'FEE ZONE' : 'NET PROFIT'
              const zoneColor = inLoss ? 'text-red-400' : inFeeZone ? 'text-yellow-400' : 'text-green-400'
              const zoneBg = inLoss ? 'bg-red-900/20 border-red-500/30' : inFeeZone ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-green-900/20 border-green-500/30'

              return (
                <div className={`p-2.5 rounded-xl border ${zoneBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-400">Position</span>
                      <p className="text-base font-black">{n(status.solQty).toFixed(2)} SOL @ ${n(status.entryPrice).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-base font-black ${zoneColor}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                      </span>
                      <p className={`text-xs ${zoneColor}`}>
                        {isUp ? '+' : ''}{n(status.pnlPct).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Fee Threshold Meter */}
                  <div className="mt-2">
                    <div className="relative w-full h-3 bg-black/60 rounded-full overflow-visible border border-white/5">
                      {/* Loss zone (red) */}
                      <div className="absolute h-full rounded-l-full bg-gradient-to-r from-red-600/40 to-red-500/20" style={{ width: `${zeroLinePos}%` }} />
                      {/* Fee zone (yellow) */}
                      <div className="absolute h-full bg-gradient-to-r from-yellow-600/30 to-yellow-500/20" style={{ left: `${zeroLinePos}%`, width: `${feeLinePos - zeroLinePos}%` }} />
                      {/* Profit zone (green) */}
                      <div className="absolute h-full rounded-r-full bg-gradient-to-r from-green-600/30 to-green-500/40" style={{ left: `${feeLinePos}%`, width: `${100 - feeLinePos}%` }} />
                      {/* Zero line */}
                      <div className="absolute h-full w-[1px] bg-white/20" style={{ left: `${zeroLinePos}%` }} />
                      {/* Fee clearance line */}
                      <div className="absolute h-full w-[1px] bg-yellow-400/50" style={{ left: `${feeLinePos}%` }} />
                      {/* Current position dot */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg ${inLoss ? 'bg-red-500' : inFeeZone ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ left: `${meterPos}%`, marginLeft: '-6px', boxShadow: inProfit ? '0 0 8px rgba(34,197,94,0.6)' : inFeeZone ? '0 0 8px rgba(234,179,8,0.6)' : '0 0 8px rgba(239,68,68,0.6)' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[7px] font-mono">
                      <span className="text-red-400/60">LOSS</span>
                      <span className="text-yellow-400/60">FEES ${feeRoundTrip.toFixed(2)}</span>
                      <span className="text-green-400/60">NET PROFIT</span>
                    </div>
                    <div className="text-center mt-0.5">
                      <span className={`text-[9px] font-mono font-bold ${zoneColor}`}>
                        {inProfit ? `✅ NET +$${netProfit.toFixed(2)}` : inFeeZone ? `🟡 +$${pnl.toFixed(2)} gross (fees eat $${feeRoundTrip.toFixed(2)})` : `❌ $${pnl.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {!status.holding && (
              <div className="p-2.5 rounded-xl bg-cyan-900/20 border border-cyan-500/30 text-center">
                <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                <p className="text-sm text-cyan-400 font-bold">Waiting for entry</p>
                <p className="text-xs text-gray-400">1m RSI ≤ 45 triggers buy</p>
              </div>
            )}

            {/* SOL Price + Range */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-base font-black">${n(status.solPrice).toFixed(2)}</span>
                <div className="text-right">
                  <span className="text-xs text-gray-500">24H Range</span>
                  <p className="text-sm text-gray-300">${n(status.low24h).toFixed(2)} — ${n(status.high24h).toFixed(2)}</p>
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
                <span>Pos: {n(status.posInRange).toFixed(0)}%</span>
                <span>High</span>
              </div>
            </div>

            {/* Candlestick Chart — Groups ticks into OHLC candles */}
            {status.chart && status.chart.length > 10 && (() => {
              const prices = status.chart
              // Group ticks into 5-tick candles (OHLC)
              const candleSize = 5
              const candles: Array<{o:number;h:number;l:number;c:number;t:number}> = []
              for (let i = 0; i < prices.length; i += candleSize) {
                const chunk = prices.slice(i, i + candleSize)
                if (chunk.length < 2) continue
                candles.push({
                  o: chunk[0].p,
                  h: Math.max(...chunk.map(c => c.p)),
                  l: Math.min(...chunk.map(c => c.p)),
                  c: chunk[chunk.length - 1].p,
                  t: chunk[0].t,
                })
              }
              if (candles.length < 3) return null

              const allPrices = candles.flatMap(c => [c.h, c.l])
              const minP = Math.min(...allPrices)
              const maxP = Math.max(...allPrices)
              const range = maxP - minP || 0.01
              const w = 340
              const h = 130
              const candleW = Math.max(2, (w / candles.length) - 1.5)
              const toY = (p: number) => h - 8 - ((p - minP) / range) * (h - 16)

              // Volume bars from candle range
              const maxRange = Math.max(...candles.map(c => c.h - c.l), 0.01)

              return (
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-cyan-500/50 uppercase tracking-[0.2em] font-mono">Candlestick</span>
                    <span className="text-[8px] text-gray-600 font-mono">{candles.length} candles</span>
                  </div>
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map(pct => (
                      <line key={pct} x1="0" y1={h * pct} x2={w} y2={h * pct} stroke="rgba(6,182,212,0.05)" />
                    ))}
                    {/* Entry price line */}
                    {status.holding && n(status.entryPrice) > 0 && (
                      <line
                        x1="0" y1={toY(n(status.entryPrice))} x2={w} y2={toY(n(status.entryPrice))}
                        stroke="rgba(168,85,247,0.4)" strokeWidth="1" strokeDasharray="4,3"
                      />
                    )}
                    {/* Candles */}
                    {candles.map((c, i) => {
                      const x = (i / candles.length) * w + 1
                      const isGreen = c.c >= c.o
                      const bodyTop = toY(Math.max(c.o, c.c))
                      const bodyBot = toY(Math.min(c.o, c.c))
                      const bodyH = Math.max(1, bodyBot - bodyTop)
                      const wickTop = toY(c.h)
                      const wickBot = toY(c.l)
                      const color = isGreen ? '#22c55e' : '#ef4444'
                      const wickX = x + candleW / 2
                      // Volume bar
                      const volH = ((c.h - c.l) / maxRange) * 12
                      return (
                        <g key={i}>
                          {/* Wick */}
                          <line x1={wickX} y1={wickTop} x2={wickX} y2={wickBot} stroke={color} strokeWidth="0.8" />
                          {/* Body */}
                          <rect x={x} y={bodyTop} width={candleW} height={bodyH} fill={color} rx="0.5"
                            opacity={isGreen ? 0.9 : 0.7} />
                          {/* Volume bar at bottom */}
                          <rect x={x} y={h - volH} width={candleW} height={volH}
                            fill={isGreen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} />
                        </g>
                      )
                    })}
                    {/* Buy/sell markers */}
                    {status.recentTrades?.map((trade, i) => {
                      const candleIdx = candles.findIndex(c => Math.abs(c.t - trade.ts) < 60000)
                      if (candleIdx < 0) return null
                      const x = (candleIdx / candles.length) * w + candleW / 2
                      const y = toY(trade.price)
                      return (
                        <g key={`trade-${i}`}>
                          <circle cx={x} cy={y} r="3.5" fill={trade.action === 'BUY' ? '#22c55e' : '#ef4444'} stroke="white" strokeWidth="0.8" />
                          <text x={x} y={y - 6} fill="white" fontSize="6" textAnchor="middle" fontWeight="bold">
                            {trade.action === 'BUY' ? 'B' : 'S'}
                          </text>
                        </g>
                      )
                    })}
                    {/* Price labels */}
                    <text x="2" y="10" fill="rgba(6,182,212,0.3)" fontSize="8" fontFamily="monospace">${maxP.toFixed(2)}</text>
                    <text x="2" y={h - 2} fill="rgba(6,182,212,0.3)" fontSize="8" fontFamily="monospace">${minP.toFixed(2)}</text>
                    {/* Entry label */}
                    {status.holding && n(status.entryPrice) > 0 && (
                      <text x={w - 2} y={toY(n(status.entryPrice)) - 3} fill="rgba(168,85,247,0.6)" fontSize="7" textAnchor="end" fontFamily="monospace">
                        entry ${n(status.entryPrice).toFixed(2)}
                      </text>
                    )}
                  </svg>
                </div>
              )
            })()}

            {/* Recent Trades / Order History */}
            {status.recentTrades && status.recentTrades.length > 0 && (
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
                <span className="text-xs text-gray-400 mb-2 block">Recent Trades</span>
                <div className="space-y-1.5">
                  {status.recentTrades.slice(-8).reverse().map((trade, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${trade.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.action}
                        </span>
                        <span className="text-white font-mono">${trade.price?.toFixed(2)}</span>
                      </div>
                      {trade.pnl !== undefined && trade.pnl !== null && (
                        <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RSI Gauges — Holographic */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded-xl text-center relative overflow-hidden ${
                n(status.rsi1m) <= 45 ? 'border border-green-500/30 bg-green-500/[0.05] shadow-[0_0_12px_rgba(34,197,94,0.1)]'
                : n(status.rsi1m) >= 64 ? 'border border-red-500/30 bg-red-500/[0.05] shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                : 'border border-cyan-500/10 bg-white/[0.02]'
              }`}>
                <span className="text-[8px] text-cyan-500/50 uppercase tracking-[0.2em] font-mono">1m RSI</span>
                <p className={`text-2xl font-black mt-0.5 ${
                  n(status.rsi1m) <= 45 ? 'text-green-400' : n(status.rsi1m) >= 64 ? 'text-red-400' : 'text-white'
                }`} style={{ textShadow: n(status.rsi1m) <= 45 ? '0 0 15px rgba(34,197,94,0.5)' : n(status.rsi1m) >= 64 ? '0 0 15px rgba(239,68,68,0.5)' : 'none' }}>
                  {n(status.rsi1m).toFixed(0)}
                </p>
                <p className={`text-[8px] font-mono tracking-wider ${
                  n(status.rsi1m) <= 45 ? 'text-green-400/70' : n(status.rsi1m) >= 64 ? 'text-red-400/70' : 'text-gray-600'
                }`}>
                  {n(status.rsi1m) <= 45 ? '◉ BUY ZONE' : n(status.rsi1m) >= 64 ? '◉ SELL ZONE' : '○ NEUTRAL'}
                </p>
              </div>
              <div className={`p-2 rounded-xl text-center relative overflow-hidden ${
                n(status.rsi1h) <= 30 ? 'border border-green-500/30 bg-green-500/[0.05] shadow-[0_0_12px_rgba(34,197,94,0.1)]'
                : n(status.rsi1h) >= 70 ? 'border border-red-500/30 bg-red-500/[0.05] shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                : 'border border-cyan-500/10 bg-white/[0.02]'
              }`}>
                <span className="text-[8px] text-cyan-500/50 uppercase tracking-[0.2em] font-mono">1h RSI</span>
                <p className={`text-2xl font-black mt-0.5 ${
                  n(status.rsi1h) <= 30 ? 'text-green-400' : n(status.rsi1h) >= 70 ? 'text-red-400' : 'text-white'
                }`} style={{ textShadow: n(status.rsi1h) <= 30 ? '0 0 15px rgba(34,197,94,0.5)' : n(status.rsi1h) >= 70 ? '0 0 15px rgba(239,68,68,0.5)' : 'none' }}>
                  {n(status.rsi1h).toFixed(0)}
                </p>
                <p className={`text-[8px] font-mono tracking-wider ${
                  n(status.rsi1h) <= 30 ? 'text-green-400/70' : n(status.rsi1h) >= 70 ? 'text-red-400/70' : 'text-gray-600'
                }`}>
                  {n(status.rsi1h) <= 30 ? '◉ OVERSOLD' : n(status.rsi1h) >= 70 ? '◉ OVERBOUGHT' : '○ NEUTRAL'}
                </p>
              </div>
            </div>

            {/* Market Intel — with Fear & Greed gauge */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
              <span className="text-[8px] text-cyan-500/50 uppercase tracking-[0.2em] font-mono block mb-2">Market Intel</span>
              <div className="flex items-center gap-3">
                {/* Fear & Greed Circular Gauge */}
                <div className="flex-shrink-0">
                  <svg viewBox="0 0 60 36" className="w-16 h-10">
                    {/* Background arc */}
                    <path d="M 5 32 A 25 25 0 0 1 55 32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" strokeLinecap="round" />
                    {/* Colored arc segments */}
                    <path d="M 5 32 A 25 25 0 0 1 17.5 10" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
                    <path d="M 17.5 10 A 25 25 0 0 1 30 7" fill="none" stroke="#f97316" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
                    <path d="M 30 7 A 25 25 0 0 1 42.5 10" fill="none" stroke="#eab308" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
                    <path d="M 42.5 10 A 25 25 0 0 1 55 32" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
                    {/* Needle */}
                    {(() => {
                      const fg = n(status.fearGreed, 50)
                      const angle = -180 + (fg / 100) * 180
                      const rad = (angle * Math.PI) / 180
                      const nx = 30 + 20 * Math.cos(rad)
                      const ny = 32 + 20 * Math.sin(rad)
                      return <line x1="30" y1="32" x2={nx} y2={ny} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    })()}
                    <circle cx="30" cy="32" r="2" fill="white" />
                    {/* Value */}
                    <text x="30" y="28" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{n(status.fearGreed)}</text>
                  </svg>
                  <p className={`text-[7px] text-center font-mono mt-0.5 ${
                    n(status.fearGreed) <= 25 ? 'text-red-400' : n(status.fearGreed) >= 75 ? 'text-green-400' : 'text-yellow-400'
                  }`}>{status.fearGreedLabel || 'Neutral'}</p>
                </div>
                {/* BTC + market data */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-mono text-[10px]">BTC</span>
                    <span className="text-white font-mono text-[10px]">${(n(status.btcPrice) / 1000).toFixed(1)}K
                      <span className={`ml-1 ${n(status.btcChange24h) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {n(status.btcChange24h) >= 0 ? '↑' : '↓'}{Math.abs(n(status.btcChange24h)).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-mono text-[10px]">SOL 24h</span>
                    <span className="text-white font-mono text-[10px]">${n(status.low24h).toFixed(0)} — ${n(status.high24h).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-mono text-[10px]">Sentiment</span>
                    <span className={`font-mono text-[10px] ${
                      n(status.fearGreed) <= 20 ? 'text-red-400' : n(status.fearGreed) <= 40 ? 'text-orange-400'
                      : n(status.fearGreed) <= 60 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {n(status.fearGreed) <= 20 ? '🔴 BLOOD' : n(status.fearGreed) <= 40 ? '🟠 FEAR'
                      : n(status.fearGreed) <= 60 ? '🟡 NEUTRAL' : '🟢 GREED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase">Win Rate</span>
                  <p className="text-base font-black text-green-400">{n(status.winRate).toFixed(0)}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase">Cycles</span>
                  <p className="text-base font-black">{status.todayCycles}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase">Total P&L</span>
                  <p className={`text-base font-black ${status.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${n(status.totalPnl).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Calendar — Micro chart showing profit per day */}
            {status.dailyHistory && status.dailyHistory.length > 0 && (
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 backdrop-blur-sm">
                <span className="text-[8px] text-cyan-500/50 uppercase tracking-[0.2em] font-mono block mb-2">Daily P&L Calendar</span>
                <div className="flex items-end gap-1 h-16">
                  {status.dailyHistory.slice(-14).map((day, i) => {
                    const maxProfit = Math.max(...status.dailyHistory.map(d => Math.abs(d.profit)), 1)
                    const barHeight = Math.max(4, (Math.abs(day.profit) / maxProfit) * 56)
                    const isGreen = day.profit >= 0
                    const isToday = day.date === new Date().toISOString().slice(0, 10)
                    const hitTarget = day.profit >= 150
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            hitTarget ? 'bg-gradient-to-t from-green-500 to-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                            : isGreen ? 'bg-green-500/60' : 'bg-red-500/60'
                          } ${isToday ? 'ring-1 ring-cyan-400/50' : ''}`}
                          style={{ height: `${barHeight}px` }}
                          title={`${day.date}: $${day.profit.toFixed(2)} | ${day.cycles} cycles | W:${day.wins} L:${day.losses}`}
                        />
                        <span className={`text-[7px] font-mono ${isToday ? 'text-cyan-400' : 'text-gray-600'}`}>
                          {day.date.slice(5)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-between mt-1.5 text-[7px] text-gray-600 font-mono">
                  <span>Last {Math.min(14, status.dailyHistory.length)} days</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-green-500/60" /> profit</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-red-500/60" /> loss</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-gradient-to-t from-green-500 to-emerald-400" /> $150+</span>
                  </div>
                </div>
              </div>
            )}

            {/* Razor Status */}
            <div className="p-2 rounded-xl bg-purple-900/20 border border-purple-500/30 text-center">
              <p className="text-xs text-purple-400 font-mono">{status.lastAction}</p>
            </div>
          </div>
        )}

        {/* Footer — Cyberpunk */}
        <div className="px-4 py-4 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <p className="text-[8px] text-cyan-500/30 font-mono tracking-[0.3em] uppercase">THE RAZOR v14 • 1m RSI ≤45 → ≥64 • PEAK RIDER • NEVER SELL AT A LOSS</p>
          <p className="text-[8px] text-cyan-500/20 font-mono mt-1">JOHN CONNOR • THE FURLINATOR • POWERED BY OGUN</p>
        </div>
      </div>
    </>
  )
}

// Standalone layout — no sidebars, no nav, no FURL pill menu
TraderPage.getLayout = ((page: ReactElement) => <>{page}</>) as CustomLayout

export default TraderPage
