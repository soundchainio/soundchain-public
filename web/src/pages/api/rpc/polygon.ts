/**
 * /api/rpc/polygon
 *
 * Proxy for Polygon mainnet RPC calls.
 *
 * Why this exists:
 * - polygon-rpc.com blocks browser CORS preflight
 * - polygon-bor-rpc.publicnode.com is blocked by Magic SDK's injected CSP
 * - Browsers can't talk directly to most public Polygon RPCs from soundchain.io
 *
 * This proxy:
 * - Same-origin → no CORS issues
 * - Server-side fetch → no CSP issues
 * - 60s edge cache for read-only methods (eth_call, eth_getBalance, eth_blockNumber)
 * - Forwards POST body to a real RPC that allows server-side calls
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// Real upstream RPC — server-to-server, no CORS/CSP constraints
const UPSTREAM = process.env.POLYGON_RPC_URL || 'https://1rpc.io/matic'

// Cacheable read methods — no state changes, safe to memoize
const CACHEABLE_METHODS = new Set([
  'eth_blockNumber',
  'eth_chainId',
  'eth_gasPrice',
  'net_version',
])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Always allow same-origin POST
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  // Cache control — short TTL for cacheable methods
  const method = req.body?.method
  if (method && CACHEABLE_METHODS.has(method)) {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30')
  }

  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const response = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (err: any) {
    return res.status(502).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: `RPC proxy failed: ${err.message}` },
    })
  }
}
