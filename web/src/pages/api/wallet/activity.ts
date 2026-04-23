/**
 * GET /api/wallet/activity?address=0x...&page=1&limit=10
 *
 * Vercel-direct wallet transaction history — replaces usePolygonscanQuery (Apollo → Lambda).
 * Fetches from Polygonscan API v2 (Etherscan unified endpoint).
 *
 * Returns recent transactions for any Polygon address.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const POLYGONSCAN_API_KEY = process.env.POLYGON_SCAN_API_KEY || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const address = req.query.address as string
  if (!address) return res.status(400).json({ error: 'address required' })

  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

  try {
    // Try Polygonscan API (free tier: 5 req/sec)
    const apiKey = POLYGONSCAN_API_KEY ? `&apikey=${POLYGONSCAN_API_KEY}` : ''
    const url = `https://api.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${limit}&sort=desc${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && Array.isArray(data.result)) {
      const transactions = data.result.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value, // in wei
        valueFormatted: (parseFloat(tx.value) / 1e18).toFixed(4),
        timeStamp: tx.timeStamp,
        date: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        isError: tx.isError === '1',
        functionName: tx.functionName || '',
        isIncoming: tx.to?.toLowerCase() === address.toLowerCase(),
      }))

      return res.status(200).json({ transactions, total: transactions.length })
    }

    // Fallback: if Polygonscan API fails or no key, return empty with message
    return res.status(200).json({
      transactions: [],
      total: 0,
      note: data.message || 'No transactions found or API rate limited',
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
