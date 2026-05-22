/**
 * Phase 7e — Vercel-direct replacement for `useBidsWithInfoQuery` +
 * `useBidsWithInfoLazyQuery`.
 *
 * GET /api/marketplace/bids?auctionId=<auctionId>
 * Returns Apollo contract `data.bidsWithInfo.bids`.
 */
import { useEffect, useState } from 'react'

type BidsShape = {
  bidsWithInfo: {
    bids: any[]
  }
}

const fetchBids = async (auctionId: string): Promise<any[] | null> => {
  if (!auctionId) return null
  try {
    const r = await fetch(`/api/marketplace/bids?auctionId=${encodeURIComponent(auctionId)}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return Array.isArray(json?.bids) ? json.bids : []
  } catch {
    return null
  }
}

export const useBidsWithInfo = (opts: {
  variables?: { auctionId?: string }
  skip?: boolean
  pollInterval?: number
  fetchPolicy?: string
}): {
  data: BidsShape | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const auctionId = opts?.variables?.auctionId || ''
  const skip = !!opts?.skip || !auctionId
  const pollInterval = opts?.pollInterval || 0
  const [data, setData] = useState<BidsShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    const run = () => {
      fetchBids(auctionId).then((bids) => {
        if (cancelled) return
        if (bids) setData({ bidsWithInfo: { bids } })
        setLoading(false)
      })
    }
    run()
    let timer: any = null
    if (pollInterval > 0) timer = setInterval(run, pollInterval)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [auctionId, skip, bust, pollInterval])
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error: null, refetch }
}

type LazyBidsResult = { data: BidsShape | undefined; loading: boolean; called: boolean }
type LazyBidsTrigger = (opts?: { variables?: { auctionId?: string } }) => Promise<void>

export const useBidsWithInfoLazy = (_opts?: { fetchPolicy?: string }): [LazyBidsTrigger, LazyBidsResult] => {
  const [data, setData] = useState<BidsShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyBidsTrigger = async (opts) => {
    const auctionId = opts?.variables?.auctionId || ''
    if (!auctionId) return
    setLoading(true)
    setCalled(true)
    const bids = await fetchBids(auctionId)
    if (bids) setData({ bidsWithInfo: { bids } })
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}
