/**
 * GET /api/marketplace/auction-item — Vercel-direct (Phase 7e Apollo strip)
 *
 * ?tokenId=<number>     — find active auction by NFT tokenId
 * ?trackId=<ObjectId>   — find active auction by track _id (fallback)
 *
 * Returns Apollo contract:
 *   { auctionItem: { auctionItem: { id, owner, nft, tokenId, contract,
 *                                    startingTime, endingTime,
 *                                    reservePrice, reservePriceToShow } } }
 * (note the doubly-nested .auctionItem.auctionItem — Apollo shape)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const tokenId = req.query.tokenId ? Number(req.query.tokenId) : null
  const trackId = req.query.trackId as string

  if (tokenId === null && !trackId) {
    return res.status(400).json({ error: 'tokenId or trackId required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { active: true }
    if (tokenId !== null) {
      filter.tokenId = tokenId
    } else if (trackId) {
      try { filter.trackId = new ObjectId(trackId) } catch { return res.status(400).json({ error: 'Invalid trackId' }) }
    }

    const auction = await db.collection('auctions').findOne(filter)
    if (!auction) {
      return res.status(200).json({ auctionItem: null })
    }

    const item = {
      id: auction._id.toString(),
      owner: auction.owner || auction.sellerAddress || null,
      nft: auction.nft || auction.contract || null,
      tokenId: typeof auction.tokenId === 'number' ? auction.tokenId : null,
      contract: auction.contract || '',
      startingTime: auction.startingTime ?? null,
      endingTime: auction.endingTime ?? null,
      reservePrice: auction.reservePrice ? String(auction.reservePrice) : null,
      reservePriceToShow: auction.reservePriceToShow ?? null,
    }

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    return res.status(200).json({ auctionItem: item })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
