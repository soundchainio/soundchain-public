/**
 * OgunPriceTicker — Bloomberg-style scrolling market ticker
 *
 * Frank's vision: "realtime token prices, wallstreet stock prices,
 * bigtech stocks, gold, silver, platinum, oil, cattle.. top ten crypto
 * tokens on the market cap rankings real time. rival bloomberg?"
 *
 * Fetches from /api/ticker/market-data (aggregates CoinGecko + OGUN stats).
 * Scrolls via CSS marquee animation. Green ↑ / Red ↓ per asset.
 */

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, BarChart3, Globe } from 'lucide-react'

interface Asset {
  symbol: string
  name: string
  price: number
  change24h: number
  marketCap?: number
  liquidity?: number
}

interface TickerData {
  ogun: Asset & { liquidity: number }
  crypto: Asset[]
  commodities: Asset[]
  stocks: Asset[]
  meta: { chain: string; fee: string; contracts: number; dappradar: string; top100token: string }
}

export const OgunPriceTicker = () => {
  const [data, setData] = useState<TickerData | null>(null)

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/ticker/market-data')
        .then(r => r.json())
        .then(setData)
        .catch(() => {})
    }
    fetchData()
    const interval = setInterval(fetchData, 60_000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [])

  const fmt = (p: number) => {
    if (p === 0) return '$0'
    if (p < 0.0001) {
      const str = p.toFixed(10)
      const match = str.match(/^0\.(0+)(\d+)$/)
      if (match) {
        const zeros = match[1].length
        const digits = match[2].slice(0, 4)
        return <span>$0.0<sub className="text-[7px]">{zeros}</sub>{digits}</span>
      }
    }
    if (p < 0.01) return `$${p.toFixed(6)}`
    if (p < 1) return `$${p.toFixed(4)}`
    if (p < 100) return `$${p.toFixed(2)}`
    if (p < 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
    return `$${(p / 1000).toFixed(1)}K`
  }

  const arrow = (change: number) => (
    <span className={`flex items-center gap-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  )

  const renderAsset = (a: Asset, color: string = 'text-white') => (
    <div key={a.symbol} className="flex items-center gap-1.5 flex-shrink-0">
      <span className={`${color} font-bold`}>{a.symbol}</span>
      <span className="text-white font-mono">{typeof a.price === 'number' ? fmt(a.price) : '...'}</span>
      {arrow(a.change24h)}
    </div>
  )

  // Build the full ticker content
  const items: React.ReactNode[] = []

  if (data) {
    // OGUN first (our token)
    items.push(renderAsset(data.ogun, 'text-amber-400'))

    // Separator
    items.push(<span key="s1" className="text-white/10 flex-shrink-0">│</span>)

    // Top 10 crypto
    const cryptoColors: Record<string, string> = {
      BTC: 'text-orange-400', ETH: 'text-blue-400', SOL: 'text-purple-400',
      BNB: 'text-yellow-400', XRP: 'text-gray-300', DOGE: 'text-yellow-300',
      ADA: 'text-blue-300', AVAX: 'text-red-400', DOT: 'text-pink-400',
      MATIC: 'text-purple-300', USDT: 'text-green-300', USDC: 'text-blue-200',
    }
    data.crypto.forEach(c => {
      items.push(renderAsset(c, cryptoColors[c.symbol] || 'text-cyan-400'))
    })

    // Separator
    items.push(<span key="s2" className="text-white/10 flex-shrink-0">│</span>)

    // Commodities
    data.commodities.forEach(c => {
      const colors: Record<string, string> = { GOLD: 'text-yellow-400', SILVER: 'text-gray-300', OIL: 'text-orange-300' }
      items.push(renderAsset(c, colors[c.symbol] || 'text-gray-400'))
    })

    // Separator
    items.push(<span key="s3" className="text-white/10 flex-shrink-0">│</span>)

    // Big Tech stocks
    if (data.stocks) {
      data.stocks.forEach(s => {
        const colors: Record<string, string> = {
          NVDA: 'text-green-400', META: 'text-blue-400', AAPL: 'text-gray-200',
          GOOGL: 'text-red-400', IBM: 'text-blue-300', MSFT: 'text-cyan-300',
          TSLA: 'text-red-300', COST: 'text-red-400',
        }
        items.push(renderAsset(s, colors[s.symbol] || 'text-white'))
      })
      items.push(<span key="s4" className="text-white/10 flex-shrink-0">│</span>)
    }

    // Chain data + links
    items.push(
      <div key="chain" className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-gray-500">Chain</span>
        <span className="text-purple-400">{data.meta.chain}</span>
      </div>
    )
    items.push(
      <div key="fee" className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-gray-500">Fee</span>
        <span className="text-cyan-400">{data.meta.fee}</span>
      </div>
    )
    items.push(
      <div key="mcap" className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-gray-500">OGUN MCap</span>
        <span className="text-gray-300 font-mono">${((data.ogun.marketCap || 0) / 1000).toFixed(1)}K</span>
      </div>
    )
    items.push(
      <div key="liq" className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-gray-500">Liq</span>
        <span className="text-gray-300 font-mono">${data.ogun.liquidity?.toLocaleString()}</span>
      </div>
    )
    items.push(
      <div key="contracts" className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-gray-500">Contracts</span>
        <span className="text-green-400">{data.meta.contracts} deployed</span>
      </div>
    )
    items.push(
      <a key="dappradar" href={data.meta.dappradar} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
        <BarChart3 className="w-2.5 h-2.5" /> DappRadar <ExternalLink className="w-2 h-2" />
      </a>
    )
    items.push(
      <a key="top100" href={data.meta.top100token} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0">
        <Globe className="w-2.5 h-2.5" /> Top100Token <ExternalLink className="w-2 h-2" />
      </a>
    )
  } else {
    items.push(<span key="loading" className="text-gray-500 font-mono">Loading market data...</span>)
  }

  return (
    <div className="w-full bg-black/80 border-b border-white/5 flex items-center overflow-hidden">
      {/* Static OGUN badge — pinned left */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-black/80 border-r border-white/10 z-10">
        <span className="text-amber-400 font-bold text-[10px]">📊 MARKETS</span>
      </div>
      {/* Scrolling data */}
      <div className="flex-1 overflow-hidden">
        <div className="inline-flex items-center gap-5 px-2 py-1 whitespace-nowrap text-[10px] w-max animate-marquee-slow">
          {items}
          <span className="text-white/10 flex-shrink-0">│</span>
          {items}
        </div>
      </div>
    </div>
  )
}
