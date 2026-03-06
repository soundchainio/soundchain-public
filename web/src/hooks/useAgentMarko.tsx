/**
 * Agent MARKO — Markets, Crypto, NASDAQ, NYSE, Bloomberg Headlines
 * Real-time global market scanner. Crypto + traditional finance. Never sleeps.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const MARKO_MODE = {
  SCANNING: 'SCANNING',
  ALERTING: 'ALERTING',
  RESEARCHING: 'RESEARCHING',
  IDLE: 'IDLE',
} as const
export type MarkoMode = typeof MARKO_MODE[keyof typeof MARKO_MODE]

export const MARKET_SECTOR = {
  CRYPTO: 'CRYPTO',
  NASDAQ: 'NASDAQ',
  NYSE: 'NYSE',
  FOREX: 'FOREX',
  COMMODITIES: 'COMMODITIES',
  DEFI: 'DEFI',
  NFT_MARKETS: 'NFT_MARKETS',
  GLOBAL: 'GLOBAL',
} as const
export type MarketSector = typeof MARKET_SECTOR[keyof typeof MARKET_SECTOR]

export const HEADLINE_PRIORITY = {
  BREAKING: 'BREAKING',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const
export type HeadlinePriority = typeof HEADLINE_PRIORITY[keyof typeof HEADLINE_PRIORITY]

export const SIGNAL_TYPE = {
  BULLISH: 'BULLISH',
  BEARISH: 'BEARISH',
  NEUTRAL: 'NEUTRAL',
  VOLATILE: 'VOLATILE',
  BREAKOUT: 'BREAKOUT',
} as const
export type SignalType = typeof SIGNAL_TYPE[keyof typeof SIGNAL_TYPE]

export const ALERT_KIND = {
  PRICE_MOVE: 'PRICE_MOVE',
  VOLUME_SPIKE: 'VOLUME_SPIKE',
  NEWS_FLASH: 'NEWS_FLASH',
  WHALE_MOVE: 'WHALE_MOVE',
  LISTING: 'LISTING',
  REGULATION: 'REGULATION',
  OGUN_EVENT: 'OGUN_EVENT',
} as const
export type AlertKind = typeof ALERT_KIND[keyof typeof ALERT_KIND]

export const SCAN_INTERVAL = {
  REALTIME: 'REALTIME',
  MINUTE: 'MINUTE',
  FIVE_MINUTES: 'FIVE_MINUTES',
  HOURLY: 'HOURLY',
} as const
export type ScanInterval = typeof SCAN_INTERVAL[keyof typeof SCAN_INTERVAL]

// ─── Types ───────────────────────────────────────────────────────────

export interface MarketHeadline {
  id: string
  title: string
  source: string
  sector: MarketSector
  priority: HeadlinePriority
  signal: SignalType
  url?: string
  timestamp: number
  symbols: string[]
}

export interface MarketAlert {
  id: string
  kind: AlertKind
  sector: MarketSector
  symbol: string
  message: string
  priceChange?: number
  timestamp: number
}

export interface WatchlistItem {
  symbol: string
  sector: MarketSector
  alertThreshold: number
}

export interface MarketSnapshot {
  ogunPrice: number
  ogunChange24h: number
  polPrice: number
  polChange24h: number
  btcPrice: number
  btcChange24h: number
  ethPrice: number
  ethChange24h: number
  fearGreedIndex: number
  totalCryptoMcap: number
  timestamp: number
}

interface AgentMarkoContextValue {
  mode: MarkoMode
  setMode: (mode: MarkoMode) => void
  headlines: MarketHeadline[]
  alerts: MarketAlert[]
  watchlist: WatchlistItem[]
  snapshot: MarketSnapshot | null
  addToWatchlist: (symbol: string, sector: MarketSector, threshold: number) => void
  removeFromWatchlist: (symbol: string) => void
  scanSector: (sector: MarketSector) => void
  activeSectors: MarketSector[]
  setActiveSectors: (sectors: MarketSector[]) => void
  headlineCount: number
  alertCount: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentMarkoContext = createContext<AgentMarkoContextValue>({
  mode: MARKO_MODE.SCANNING,
  setMode: () => {},
  headlines: [],
  alerts: [],
  watchlist: [],
  snapshot: null,
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  scanSector: () => {},
  activeSectors: [MARKET_SECTOR.CRYPTO, MARKET_SECTOR.DEFI],
  setActiveSectors: () => {},
  headlineCount: 0,
  alertCount: 0,
})

export const useAgentMarko = () => useContext(AgentMarkoContext)

// ─── Default Watchlist ───────────────────────────────────────────────

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'OGUN', sector: MARKET_SECTOR.CRYPTO, alertThreshold: 5 },
  { symbol: 'POL', sector: MARKET_SECTOR.CRYPTO, alertThreshold: 10 },
  { symbol: 'BTC', sector: MARKET_SECTOR.CRYPTO, alertThreshold: 3 },
  { symbol: 'ETH', sector: MARKET_SECTOR.CRYPTO, alertThreshold: 5 },
]

// ─── Provider ────────────────────────────────────────────────────────

export function AgentMarkoProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<MarkoMode>(MARKO_MODE.SCANNING)
  const [headlines, setHeadlines] = useState<MarketHeadline[]>([])
  const [alerts, setAlerts] = useState<MarketAlert[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST)
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [activeSectors, setActiveSectors] = useState<MarketSector[]>([
    MARKET_SECTOR.CRYPTO,
    MARKET_SECTOR.DEFI,
    MARKET_SECTOR.NFT_MARKETS,
  ])
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addToWatchlist = useCallback((symbol: string, sector: MarketSector, threshold: number) => {
    setWatchlist((prev) => {
      const exists = prev.find((w) => w.symbol === symbol)
      if (exists) return prev
      return [...prev, { symbol, sector, alertThreshold: threshold }]
    })
  }, [])

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol))
  }, [])

  const scanSector = useCallback((sector: MarketSector) => {
    if (mode !== MARKO_MODE.SCANNING) return
    // Fetch from /api/agent/marko/scan
    try {
      fetch(`/api/agent/marko/scan?sector=${sector}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.headlines) {
            setHeadlines((prev) => {
              const combined = [...data.headlines, ...prev]
              return combined.slice(0, 100) // Keep last 100
            })
          }
          if (data.snapshot) setSnapshot(data.snapshot)
        })
        .catch(() => {}) // silent — MARKO never breaks the app
    } catch {
      // silent
    }
  }, [mode])

  // Auto-scan active sectors every 5 minutes
  useEffect(() => {
    if (mode !== MARKO_MODE.SCANNING) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      return
    }

    // Initial scan
    activeSectors.forEach((sector) => scanSector(sector))

    scanIntervalRef.current = setInterval(() => {
      activeSectors.forEach((sector) => scanSector(sector))
    }, 5 * 60 * 1000)

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [mode, activeSectors, scanSector])

  return (
    <AgentMarkoContext.Provider
      value={{
        mode, setMode, headlines, alerts, watchlist, snapshot,
        addToWatchlist, removeFromWatchlist, scanSector,
        activeSectors, setActiveSectors,
        headlineCount: headlines.length, alertCount: alerts.length,
      }}
    >
      {children}
    </AgentMarkoContext.Provider>
  )
}
