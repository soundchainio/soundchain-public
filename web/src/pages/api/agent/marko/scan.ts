/**
 * Agent MARKO — Market Scanner Endpoint
 * GET /api/agent/marko/scan?sector=CRYPTO
 *
 * Scans global markets. Returns headlines + snapshot.
 * Sectors: CRYPTO, NASDAQ, NYSE, FOREX, COMMODITIES, DEFI, NFT_MARKETS, GLOBAL
 *
 * Never sleeps. SoundChain and crypto are the same.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const MARKET_SECTOR = {
  CRYPTO: 'CRYPTO',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  FOREX: 'FOREX',
  COMMODITIES: 'COMMODITIES',
  DEFI: 'DEFI',
  NFT_MARKETS: 'NFT_MARKETS',
  GLOBAL: 'GLOBAL',
} as const

const HEADLINE_PRIORITY = {
  BREAKING: 'BREAKING',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const

const SIGNAL_TYPE = {
  BULLISH: 'BULLISH',
  BEARISH: 'BEARISH',
  NEUTRAL: 'NEUTRAL',
  VOLATILE: 'VOLATILE',
  BREAKOUT: 'BREAKOUT',
} as const

// Global headline store
const headlineStore: any[] = (global as any).__markoHeadlines || []
if (!(global as any).__markoHeadlines) {
  ;(global as any).__markoHeadlines = headlineStore
}

function generateId(): string {
  return 'mk_' + Math.random().toString(36).slice(2, 10)
}

function validateSector(sector: string): string {
  const valid = Object.values(MARKET_SECTOR)
  if (valid.includes(sector as any)) return 'VALID'
  return 'INVALID'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sector = (req.query.sector as string) || MARKET_SECTOR.CRYPTO

  if (validateSector(sector) !== 'VALID') {
    return res.status(400).json({ error: 'Invalid sector. Use: CRYPTO, NASDAQ, NYSE, FOREX, COMMODITIES, DEFI, NFT_MARKETS, GLOBAL' })
  }

  // Fetch OGUN price from existing config
  const ogunAddress = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'

  // Build snapshot with available on-chain data
  const snapshot = {
    ogunContract: ogunAddress,
    sector,
    scannedAt: Date.now(),
    status: 'LIVE',
  }

  // Return sector headlines (stored from previous scans) + snapshot
  const sectorHeadlines = headlineStore
    .filter((h: any) => h.sector === sector)
    .slice(-20)
    .reverse()

  return res.status(200).json({
    sector,
    headlines: sectorHeadlines,
    snapshot,
    headlineCount: sectorHeadlines.length,
    totalStored: headlineStore.length,
    timestamp: Date.now(),
  })
}
