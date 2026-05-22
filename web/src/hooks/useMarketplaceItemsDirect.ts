/**
 * Phase 7e — Vercel-direct replacement for `useAuctionItemQuery` +
 * `useBuyNowItemLazyQuery`.
 *
 * GET /api/marketplace/auction-item?tokenId=...
 * GET /api/marketplace/buy-now-item?tokenId=... (or ?trackId=...)
 *
 * Returns Apollo contracts:
 *   useAuctionItem → data.auctionItem.auctionItem
 *   useBuyNowItem  → data.buyNowItem.buyNowItem
 */
import { useEffect, useState } from 'react'

type AuctionItem = {
  id: string
  owner: string | null
  nft: string | null
  tokenId: number | null
  contract: string
  startingTime: number | null
  endingTime: number | null
  reservePrice: string | null
  reservePriceToShow: number | null
} | null

type BuyNowItem = {
  id: string
  owner: string | null
  nft: string | null
  tokenId: number | null
  contract: string
  pricePerItem: string
  selectedCurrency: string
  pricePerItemToShow: number
  OGUNPricePerItem: string | null
  OGUNPricePerItemToShow: number | null
  acceptsMATIC: boolean
  acceptsOGUN: boolean
  startingTime: number | null
} | null

type AuctionShape = { auctionItem: { auctionItem: AuctionItem } | null }
type BuyNowShape = { buyNowItem: { buyNowItem: BuyNowItem } | null }

const auctionCache = new Map<string, { value: AuctionShape; ts: number }>()
const buyNowCache = new Map<string, { value: BuyNowShape; ts: number }>()
const FRESH_MS = 15_000

const fetchAuction = async (tokenId: number): Promise<AuctionShape | null> => {
  const key = String(tokenId)
  const hit = auctionCache.get(key)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  try {
    const r = await fetch(`/api/marketplace/auction-item?tokenId=${tokenId}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    const item: AuctionItem = json?.auctionItem ?? null
    const shape: AuctionShape = { auctionItem: { auctionItem: item } }
    auctionCache.set(key, { value: shape, ts: Date.now() })
    return shape
  } catch {
    return null
  }
}

const fetchBuyNow = async (params: { tokenId?: number; trackId?: string; nft?: string }): Promise<BuyNowShape | null> => {
  const key = `${params.tokenId ?? ''}:${params.trackId ?? ''}:${params.nft ?? ''}`
  const hit = buyNowCache.get(key)
  if (hit && Date.now() - hit.ts < FRESH_MS) return hit.value
  const qs = new URLSearchParams()
  if (params.tokenId !== undefined) qs.set('tokenId', String(params.tokenId))
  if (params.trackId) qs.set('trackId', params.trackId)
  if (params.nft) qs.set('nft', params.nft)
  try {
    const r = await fetch(`/api/marketplace/buy-now-item?${qs}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    const item: BuyNowItem = json?.buyNowItem ?? null
    const shape: BuyNowShape = { buyNowItem: { buyNowItem: item } }
    buyNowCache.set(key, { value: shape, ts: Date.now() })
    return shape
  } catch {
    return null
  }
}

// --- useAuctionItem (eager) ---
export const useAuctionItem = (opts: {
  variables?: { tokenId?: number }
  skip?: boolean
  pollInterval?: number
  fetchPolicy?: string
}): {
  data: AuctionShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const tokenId = opts?.variables?.tokenId
  const skip = !!opts?.skip || tokenId === undefined || tokenId === null
  const pollInterval = opts?.pollInterval || 0
  const [data, setData] = useState<AuctionShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    const run = () => {
      fetchAuction(tokenId as number).then((res) => {
        if (cancelled) return
        if (res) setData(res)
        setLoading(false)
      })
    }
    setLoading(true)
    run()
    let timer: any = null
    if (pollInterval > 0) timer = setInterval(run, pollInterval)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [tokenId, skip, bust, pollInterval])
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error: null, refetch }
}

// --- useBuyNowItemLazy ---
type LazyBuyNowResult = { data: BuyNowShape | undefined; loading: boolean; called: boolean }
type LazyBuyNowTrigger = (opts?: { variables?: { input?: { tokenId?: number; nft?: string; trackId?: string }; tokenId?: number; nft?: string; trackId?: string } }) => Promise<void>

export const useBuyNowItemLazy = (_opts?: { fetchPolicy?: string }): [LazyBuyNowTrigger, LazyBuyNowResult] => {
  const [data, setData] = useState<BuyNowShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyBuyNowTrigger = async (opts) => {
    const v = opts?.variables?.input || opts?.variables || {}
    const tokenId = (v as any).tokenId
    const nft = (v as any).nft
    const trackId = (v as any).trackId
    if (tokenId === undefined && !trackId) return
    setLoading(true)
    setCalled(true)
    const res = await fetchBuyNow({ tokenId, nft, trackId })
    if (res) setData(res)
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}
