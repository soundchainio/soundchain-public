/**
 * GET /api/price/matic — Vercel-direct replacement for useMaticUsdQuery
 *
 * Returns POL/USD price from CoinGecko. 60s cache.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

let cache: { price: number; ts: number } | null = null
const CACHE_TTL = 60_000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return res.status(200).json({ maticUsd: String(cache.price) })
  }

  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd', {
      headers: { 'Accept': 'application/json' },
    })
    const data = await cgRes.json()
    const price = data?.['matic-network']?.usd || 0.45

    cache = { price, ts: Date.now() }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json({ maticUsd: String(price) })
  } catch {
    return res.status(200).json({ maticUsd: cache ? String(cache.price) : '0.45' })
  }
}
