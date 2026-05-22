/**
 * GET /api/wallet/polygonscan — Vercel-direct (Phase 7e)
 * Proxies Polygonscan transaction-list and internal-transaction APIs.
 *
 * ?wallet=0x...&kind=tx|internal&page=1&offset=20
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const POLYGONSCAN_KEY = process.env.POLYGONSCAN_API_KEY || ''
const POLYGONSCAN_URL = 'https://api.polygonscan.com/api'

const SC_4BYTE: Record<string, string> = {
  '0xa9059cbb': 'Transfer',
  '0x095ea7b3': 'Approve',
  '0x40c10f19': 'Mint',
  '0x42842e0e': 'Safe Transfer From',
  '0x23b872dd': 'Transfer From',
  '0xfb0f3ee1': 'Buy',
  '0x919840ad': 'Place Bid',
}

const methodOf = (input: string | undefined): string | null => {
  if (!input || input.length < 10) return null
  const sig = input.slice(0, 10).toLowerCase()
  return SC_4BYTE[sig] || null
}

const dateOf = (ts: string | number): string => {
  const t = Number(ts) * 1000
  return new Date(t).toISOString()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const wallet = req.query.wallet as string
  if (!wallet) return res.status(400).json({ error: 'wallet required' })

  const kind = (req.query.kind as string) || 'tx'
  const page = parseInt(req.query.page as string) || 1
  const offset = Math.min(parseInt(req.query.offset as string) || 20, 100)

  const action = kind === 'internal' ? 'txlistinternal' : 'txlist'
  const url = `${POLYGONSCAN_URL}?module=account&action=${action}&address=${wallet}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc&apikey=${POLYGONSCAN_KEY}`

  try {
    const r = await fetch(url)
    const json = await r.json()
    if (json.status !== '1' && json.message !== 'No transactions found') {
      return res.status(200).json({ nextPage: null, result: [] })
    }
    const result = Array.isArray(json.result) ? json.result.map((tx: any) => {
      const base = {
        blockNumber: String(tx.blockNumber || ''),
        timeStamp: String(tx.timeStamp || ''),
        hash: String(tx.hash || ''),
        from: String(tx.from || ''),
        to: String(tx.to || ''),
        value: String(tx.value || '0'),
        gas: String(tx.gas || '0'),
        isError: String(tx.isError || '0'),
        input: String(tx.input || ''),
        contractAddress: String(tx.contractAddress || ''),
        gasUsed: String(tx.gasUsed || '0'),
        date: dateOf(tx.timeStamp),
      }
      if (kind === 'tx') {
        return {
          ...base,
          nonce: String(tx.nonce || ''),
          blockHash: String(tx.blockHash || ''),
          transactionIndex: String(tx.transactionIndex || ''),
          gasPrice: String(tx.gasPrice || '0'),
          txreceipt_status: String(tx.txreceipt_status || ''),
          cumulativeGasUsed: String(tx.cumulativeGasUsed || '0'),
          confirmations: String(tx.confirmations || '0'),
          method: methodOf(tx.input),
        }
      }
      return base
    }) : []

    const nextPage = result.length === offset ? String(page + 1) : null
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ nextPage, result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
