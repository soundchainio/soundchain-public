/**
 * GET /api/marketplace/listings — Vercel-direct replacement for useListingItemsQuery
 *
 * ?sort=newest|cheapest|expensive — sort order
 * ?limit=20&cursor=xxx — pagination
 * ?profileId=xxx — listings by seller
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const sort = (req.query.sort as string) || 'newest'
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const cursor = req.query.cursor as string
  const profileId = req.query.profileId as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { active: true }
    if (profileId) {
      try { filter.profileId = new ObjectId(profileId) } catch {}
    }
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch {}
    }

    const sortObj: any = sort === 'cheapest' ? { pricePerItem: 1 }
      : sort === 'expensive' ? { pricePerItem: -1 }
      : { createdAt: -1 }

    const listings = await db.collection('listingitems')
      .find(filter)
      .sort(sortObj)
      .limit(limit + 1)
      .toArray()

    const hasNextPage = listings.length > limit
    if (hasNextPage) listings.pop()

    // Hydrate with track data
    const trackIds = listings.map(l => l.trackId).filter(Boolean)
    const tracks = trackIds.length > 0
      ? await db.collection('tracks').find({ _id: { $in: trackIds.map((id: any) => {
          try { return new ObjectId(id) } catch { return id }
        }) } }).toArray()
      : []
    const trackMap = new Map(tracks.map(t => [t._id.toString(), t]))

    const nodes = listings.map(l => {
      const track = trackMap.get(l.trackId?.toString())
      return {
        id: l._id.toString(),
        pricePerItem: l.pricePerItem || 0,
        pricePerItemToShow: l.pricePerItemToShow || l.pricePerItem || 0,
        isPaymentOGUN: l.isPaymentOGUN || false,
        quantity: l.quantity || 1,
        tokenId: l.tokenId || null,
        sellerAddress: l.sellerAddress || '',
        profileId: l.profileId?.toString() || null,
        active: l.active || false,
        createdAt: l.createdAt || null,
        track: track ? {
          id: track._id.toString(),
          title: track.title || '',
          artist: track.artist || '',
          artworkUrl: track.artworkUrl || '',
          playbackUrl: track.playbackUrl || '',
          nftData: track.nftData || null,
          editionSize: track.editionSize || null,
        } : null,
      }
    })

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      nodes,
      pageInfo: { hasNextPage, endCursor: listings.length > 0 ? listings[listings.length - 1]._id.toString() : null },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
