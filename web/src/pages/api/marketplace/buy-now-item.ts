/**
 * GET /api/marketplace/buy-now-item — Vercel-direct (Phase 7e Apollo strip)
 *
 * ?tokenId=<number>     — find active buy-now listing by NFT tokenId
 * ?trackId=<ObjectId>   — find active buy-now listing by track _id
 * ?nft=<contract>       — optional contract filter
 *
 * Returns Apollo contract:
 *   { buyNowItem: { buyNowItem: { id, owner, nft, tokenId, contract,
 *                                  pricePerItem, selectedCurrency,
 *                                  pricePerItemToShow, OGUNPricePerItem,
 *                                  OGUNPricePerItemToShow, acceptsMATIC,
 *                                  acceptsOGUN, startingTime } } }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const tokenId = req.query.tokenId ? Number(req.query.tokenId) : null
  const trackId = req.query.trackId as string
  const nft = req.query.nft as string

  if (tokenId === null && !trackId) {
    return res.status(400).json({ error: 'tokenId or trackId required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { active: true }
    if (tokenId !== null) filter.tokenId = tokenId
    if (trackId) {
      try { filter.trackId = new ObjectId(trackId) } catch { return res.status(400).json({ error: 'Invalid trackId' }) }
    }
    if (nft) filter.contract = { $regex: new RegExp(`^${nft}$`, 'i') }

    const listing = await db.collection('listingitems').findOne(filter)
    if (!listing) {
      return res.status(200).json({ buyNowItem: null })
    }

    const item = {
      id: listing._id.toString(),
      owner: listing.sellerAddress || listing.owner || null,
      nft: listing.nft || listing.contract || null,
      tokenId: typeof listing.tokenId === 'number' ? listing.tokenId : (listing.tokenId ? Number(listing.tokenId) : null),
      contract: listing.contract || '',
      pricePerItem: String(listing.pricePerItem || '0'),
      selectedCurrency: listing.isPaymentOGUN ? 'OGUN' : (listing.selectedCurrency || 'POL'),
      pricePerItemToShow: listing.pricePerItemToShow ?? Number(listing.pricePerItem || 0),
      OGUNPricePerItem: listing.OGUNPricePerItem ? String(listing.OGUNPricePerItem) : null,
      OGUNPricePerItemToShow: listing.OGUNPricePerItemToShow ?? null,
      acceptsMATIC: listing.acceptsMATIC ?? !listing.isPaymentOGUN,
      acceptsOGUN: listing.acceptsOGUN ?? !!listing.isPaymentOGUN,
      startingTime: listing.startingTime ?? null,
    }

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    return res.status(200).json({ buyNowItem: item })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
