/**
 * GET /api/ticker/market-data — aggregated market data for Bloomberg ticker
 *
 * Fetches from CoinGecko (top crypto) + our stats endpoint (OGUN).
 * Cached server-side for 60s to respect free API rate limits.
 * Returns everything the OgunPriceTicker needs in one shot.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 60_000 // 60 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  try {
    // Fetch top 10 crypto from CoinGecko (free, no API key, 30 req/min)
    const [cryptoRes, ogunRes] = await Promise.allSettled([
      fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h', {
        headers: { 'Accept': 'application/json' },
      }).then(r => r.json()),
      fetch(`${req.headers.origin || 'https://soundchain.io'}/api/agent/stats`).then(r => r.json()),
    ])

    const cryptoData = cryptoRes.status === 'fulfilled' ? cryptoRes.value : []
    const ogunData = ogunRes.status === 'fulfilled' ? ogunRes.value : {}

    // Top 10 crypto
    const crypto = Array.isArray(cryptoData) ? cryptoData.map((c: any) => ({
      symbol: c.symbol?.toUpperCase(),
      name: c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h || 0,
      marketCap: c.market_cap,
      image: c.image,
    })) : []

    // OGUN from our stats
    const ogun = {
      symbol: 'OGUN',
      name: 'SoundChain',
      price: ogunData.ogunPrice || 0.000046221,
      change24h: ogunData.ogunChange24h || 0,
      marketCap: ogunData.ogunMarketCap || 62200,
      liquidity: ogunData.ogunLiquidity || 1080,
    }

    // Static commodity/stock data (placeholder — real API integration later)
    // Commodities (static — Alpha Vantage integration later for live)
    const commodities = [
      { symbol: 'GOLD', name: 'Gold', price: 3420, change24h: 0.3 },
      { symbol: 'SILVER', name: 'Silver', price: 32.8, change24h: -0.2 },
      { symbol: 'OIL', name: 'Crude Oil', price: 63.4, change24h: 1.1 },
      { symbol: 'PLATINUM', name: 'Platinum', price: 978, change24h: 0.5 },
    ]

    // Big Tech stocks (static — Yahoo Finance API integration later for live)
    const stocks = [
      { symbol: 'NVDA', name: 'NVIDIA', price: 892, change24h: 2.3 },
      { symbol: 'META', name: 'Meta', price: 512, change24h: 1.1 },
      { symbol: 'AAPL', name: 'Apple', price: 198, change24h: 0.4 },
      { symbol: 'GOOGL', name: 'Alphabet', price: 168, change24h: 0.8 },
      { symbol: 'IBM', name: 'IBM', price: 242, change24h: -0.3 },
      { symbol: 'MSFT', name: 'Microsoft', price: 428, change24h: 0.6 },
      { symbol: 'TSLA', name: 'Tesla', price: 245, change24h: -1.2 },
      { symbol: 'COST', name: 'Costco', price: 925, change24h: 0.7 },
      { symbol: 'RAVE', name: 'Token Rave', price: 0.042, change24h: 5.2 },
    ]

    const result = {
      ogun,
      crypto,
      commodities,
      stocks,
      meta: {
        chain: 'Polygon',
        fee: '0.05%',
        contracts: 7,
        dappradar: 'https://dappradar.com/dapp/soundchain',
        top100token: `https://top100token.com/polygon/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c`,
      },
      fetchedAt: new Date().toISOString(),
    }

    cache = { data: result, ts: Date.now() }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(result)
  } catch (err: any) {
    // Serve stale cache on error
    if (cache) return res.status(200).json(cache.data)
    return res.status(500).json({ error: err.message })
  }
}
