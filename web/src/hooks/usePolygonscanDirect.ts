/**
 * Phase 7e — Vercel-direct replacement for `usePolygonscanQuery` +
 * `usePolygonscanInternalTrxQuery`.
 *
 * GET /api/wallet/polygonscan?wallet=&kind=tx|internal&page=
 */
import { useEffect, useState } from 'react'

type TxResult = {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string
  gas: string
  isError: string
  input: string
  contractAddress: string
  gasUsed: string
  date: string
}

type PolygonscanShape = {
  getTransactionHistory: {
    nextPage: string | null
    result: (TxResult & { nonce: string; blockHash: string; transactionIndex: string; gasPrice: string; txreceipt_status: string; cumulativeGasUsed: string; confirmations: string; method: string | null })[]
  }
}

type InternalShape = {
  getInternalTransactionHistory: {
    nextPage: string | null
    result: TxResult[]
  }
}

const fetchPolygonscan = async (wallet: string, kind: 'tx' | 'internal', page: number, offset: number): Promise<any | null> => {
  try {
    const r = await fetch(`/api/wallet/polygonscan?wallet=${encodeURIComponent(wallet)}&kind=${kind}&page=${page}&offset=${offset}`, { credentials: 'include' })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export const usePolygonscan = (opts?: {
  variables?: { wallet?: string; page?: { first?: number; pageNumber?: number } }
  skip?: boolean
  fetchPolicy?: string
}): {
  data: PolygonscanShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { pageNumber?: number; first?: number } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const wallet = opts?.variables?.wallet || ''
  const first = opts?.variables?.page?.first ?? 20
  const skip = !!opts?.skip || !wallet
  const [pageNum, setPageNum] = useState(1)
  const [results, setResults] = useState<any[]>([])
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPolygonscan(wallet, 'tx', 1, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('polygonscan load failed')); setLoading(false); return }
      setResults(res.result || [])
      setNextPage(res.nextPage)
      setPageNum(1)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [wallet, first, skip, bust])
  const data: PolygonscanShape | undefined = results.length > 0 || !loading ? {
    getTransactionHistory: { nextPage, result: results },
  } : undefined
  const fetchMore = async (args?: { variables?: { page?: { pageNumber?: number; first?: number } } }) => {
    const nextNum = args?.variables?.page?.pageNumber ?? pageNum + 1
    const res = await fetchPolygonscan(wallet, 'tx', nextNum, first)
    if (!res) return
    setResults((cur) => [...cur, ...(res.result || [])])
    setNextPage(res.nextPage)
    setPageNum(nextNum)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

export const usePolygonscanInternalTrx = (opts?: {
  variables?: { wallet?: string; page?: { first?: number; pageNumber?: number } }
  skip?: boolean
}): {
  data: InternalShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: (args?: { variables?: { page?: { pageNumber?: number; first?: number } } }) => Promise<void>
  refetch: () => Promise<void>
} => {
  const wallet = opts?.variables?.wallet || ''
  const first = opts?.variables?.page?.first ?? 20
  const skip = !!opts?.skip || !wallet
  const [pageNum, setPageNum] = useState(1)
  const [results, setResults] = useState<any[]>([])
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPolygonscan(wallet, 'internal', 1, first).then((res) => {
      if (cancelled) return
      if (!res) { setError(new Error('polygonscan internal load failed')); setLoading(false); return }
      setResults(res.result || [])
      setNextPage(res.nextPage)
      setPageNum(1)
      setError(null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [wallet, first, skip, bust])
  const data: InternalShape | undefined = results.length > 0 || !loading ? {
    getInternalTransactionHistory: { nextPage, result: results },
  } : undefined
  const fetchMore = async (args?: { variables?: { page?: { pageNumber?: number; first?: number } } }) => {
    const nextNum = args?.variables?.page?.pageNumber ?? pageNum + 1
    const res = await fetchPolygonscan(wallet, 'internal', nextNum, first)
    if (!res) return
    setResults((cur) => [...cur, ...(res.result || [])])
    setNextPage(res.nextPage)
    setPageNum(nextNum)
  }
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}
