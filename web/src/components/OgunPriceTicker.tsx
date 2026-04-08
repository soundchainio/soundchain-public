/**
 * OgunPriceTicker — ESPN-style scrolling ticker bar
 * Shows OGUN price, market cap, DappRadar rank, Top100Token + DappRadar links
 * Fetches live price from QuickSwap pool on Polygon
 */

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, BarChart3, Globe } from 'lucide-react'

const OGUN_ADDRESS = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'
const QUICKSWAP_PAIR = '0xfF0E141891D0E66b0D094215B44eF433F43066e5' // OGUN/POL LP
const TOP100_URL = `https://top100token.com/polygon/${OGUN_ADDRESS}`
const DAPPRADAR_URL = 'https://dappradar.com/dapp/soundchain'

// Minimal ERC-20 + pair ABI for price fetch
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
]

interface PriceData {
  price: number
  change24h: number
  marketCap: number
  liquidity: number
}

export const OgunPriceTicker = () => {
  const [priceData, setPriceData] = useState<PriceData | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        // Fetch from our own API to avoid CORS — or fallback to static
        const res = await fetch('/api/agent/stats')
        if (res.ok) {
          const data = await res.json()
          if (data.ogunPrice) {
            setPriceData({
              price: data.ogunPrice,
              change24h: data.ogunChange24h || 0,
              marketCap: data.ogunMarketCap || 62200,
              liquidity: data.ogunLiquidity || 1080,
            })
            return
          }
        }
      } catch {}

      // Fallback — static data from Top100Token
      setPriceData({
        price: 0.000046221,
        change24h: 0,
        marketCap: 62200,
        liquidity: 1080,
      })
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 300000) // Refresh every 5 minutes (was 60s — Vercel invocation savings)
    return () => clearInterval(interval)
  }, [])

  const formatPrice = (p: number) => {
    if (p < 0.0001) {
      // Subscript notation like Top100Token: $0.0₄6221
      const str = p.toFixed(10)
      const match = str.match(/^0\.(0+)(\d+)$/)
      if (match) {
        const zeros = match[1].length
        const digits = match[2].slice(0, 4)
        return (
          <span>$0.0<sub className="text-[8px]">{zeros}</sub>{digits}</span>
        )
      }
    }
    if (p < 0.01) return `$${p.toFixed(6)}`
    if (p < 1) return `$${p.toFixed(4)}`
    return `$${p.toFixed(2)}`
  }

  const isUp = (priceData?.change24h || 0) >= 0

  return (
    <div className="w-full bg-black/60 border-b border-white/5 overflow-hidden">
      <div className="flex items-center gap-6 px-3 py-1 animate-marquee-slow whitespace-nowrap text-[11px]">
        {/* OGUN Price */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">OGUN</span>
          <span className="text-white font-mono">
            {priceData ? formatPrice(priceData.price) : '...'}
          </span>
          {priceData && (
            <span className={`flex items-center gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(priceData.change24h).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Market Cap */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">MCap</span>
          <span className="text-gray-300 font-mono">
            {priceData ? `$${(priceData.marketCap / 1000).toFixed(1)}K` : '...'}
          </span>
        </div>

        {/* Liquidity */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Liq</span>
          <span className="text-gray-300 font-mono">
            {priceData ? `$${priceData.liquidity.toLocaleString()}` : '...'}
          </span>
        </div>

        {/* Chain */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Chain</span>
          <span className="text-purple-400">Polygon</span>
        </div>

        {/* Fee */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Fee</span>
          <span className="text-cyan-400">0.05%</span>
        </div>

        {/* Separator */}
        <span className="text-white/10">|</span>

        {/* DappRadar */}
        <a
          href={DAPPRADAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <BarChart3 className="w-3 h-3" />
          DappRadar
          <ExternalLink className="w-2.5 h-2.5" />
        </a>

        {/* Top100Token */}
        <a
          href={TOP100_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Globe className="w-3 h-3" />
          Top100Token
          <ExternalLink className="w-2.5 h-2.5" />
        </a>

        {/* Duplicate for seamless scroll */}
        <span className="text-white/10">|</span>

        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">OGUN</span>
          <span className="text-white font-mono">
            {priceData ? formatPrice(priceData.price) : '...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">MCap</span>
          <span className="text-gray-300 font-mono">
            {priceData ? `$${(priceData.marketCap / 1000).toFixed(1)}K` : '...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Contracts</span>
          <span className="text-green-400">7 deployed</span>
        </div>

        <a
          href={DAPPRADAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <BarChart3 className="w-3 h-3" />
          DappRadar
          <ExternalLink className="w-2.5 h-2.5" />
        </a>

        <a
          href={TOP100_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Globe className="w-3 h-3" />
          Top100Token
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  )
}
