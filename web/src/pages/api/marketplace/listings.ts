/**
 * GET /api/marketplace/listings — Vercel-direct (Phase 7e Apollo strip)
 *
 * Returns Apollo `listingItems` shape: each node is a TrackWithListingItem,
 * meaning track fields are at the top level + a `listingItem` sub-object
 * carrying the listing-specific data (price, owner, contract, etc).
 *
 * Query params:
 *   ?sort=newest|cheapest|expensive
 *   ?limit=20&cursor=xxx
 *   ?profileId=xxx          — listings by seller
 *   ?trackEditionId=xxx     — listings for a specific edition
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
  const trackEditionId = req.query.trackEditionId as string

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
    if (trackEditionId) {
      try { filter.trackEditionId = new ObjectId(trackEditionId) } catch {}
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

    const trackIds = listings.map(l => l.trackId).filter(Boolean)
    const tracks = trackIds.length > 0
      ? await db.collection('tracks').find({ _id: { $in: trackIds.map((id: any) => {
          try { return new ObjectId(id) } catch { return id }
        }) } }).toArray()
      : []
    const trackMap = new Map(tracks.map(t => [t._id.toString(), t]))

    const editionIds = [...new Set(tracks.map((t: any) => t.trackEditionId?.toString()).filter(Boolean))]
    const editionOids = editionIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const editions = editionOids.length > 0
      ? await db.collection('trackeditions').find({ _id: { $in: editionOids } }).toArray()
      : []
    const editionMap = new Map(editions.map(e => [e._id.toString(), e]))

    const nodes = listings.map(l => {
      const track: any = trackMap.get(l.trackId?.toString())
      if (!track) return null
      const edition: any = track.trackEditionId ? editionMap.get(track.trackEditionId.toString()) : null
      return {
        // TrackWithListingItem — track fields at top level
        id: track._id.toString(),
        profileId: track.profileId?.toString() || '',
        title: track.title || '',
        assetUrl: track.assetUrl || track.playbackUrl || '',
        artworkUrl: track.artworkUrl || null,
        description: track.description || null,
        utilityInfo: track.utilityInfo || null,
        artist: track.artist || null,
        artistId: track.artistId || null,
        artistProfileId: track.artistProfileId?.toString() || null,
        album: track.album || null,
        releaseYear: track.releaseYear || null,
        copyright: track.copyright || null,
        genres: track.genres || [],
        playbackUrl: track.playbackUrl || track.assetUrl || '',
        createdAt: track.createdAt,
        updatedAt: track.updatedAt || track.createdAt,
        deleted: !!track.deleted,
        playbackCountFormatted: String(track.playbackCount || 0),
        isFavorite: false,
        favoriteCount: track.favoriteCount || 0,
        playbackCount: track.playbackCount || 0,
        listingCount: track.listingCount || 0,
        saleType: track.saleType || '',
        trackEditionId: track.trackEditionId?.toString() || null,
        editionSize: track.editionSize || 0,
        price: track.price || { value: 0, currency: 'POL' },
        nftData: track.nftData || null,
        trackEdition: edition ? {
          id: edition._id.toString(),
          editionId: edition.editionId || 0,
          transactionHash: edition.transactionHash || '',
          contract: edition.contract || null,
          listed: !!edition.listed,
          marketplace: edition.marketplace || null,
          editionSize: edition.editionSize || 1,
          deleted: !!edition.deleted,
          createdAt: edition.createdAt || track.createdAt,
          updatedAt: edition.updatedAt || track.createdAt,
          editionData: edition.editionData || null,
        } : null,
        listingItem: {
          id: l._id.toString(),
          owner: l.sellerAddress || l.owner || null,
          nft: l.nft || null,
          tokenId: typeof l.tokenId === 'number' ? l.tokenId : (l.tokenId ? Number(l.tokenId) : null),
          contract: l.contract || '',
          pricePerItem: String(l.pricePerItem || '0'),
          pricePerItemToShow: l.pricePerItemToShow ?? Number(l.pricePerItem || 0),
          OGUNPricePerItem: l.OGUNPricePerItem ? String(l.OGUNPricePerItem) : null,
          OGUNPricePerItemToShow: l.OGUNPricePerItemToShow ?? null,
          isPaymentOGUN: l.isPaymentOGUN || false,
          startingTime: l.startingTime ?? null,
          endingTime: l.endingTime ?? null,
          reservePrice: l.reservePrice ? String(l.reservePrice) : null,
          reservePriceToShow: l.reservePriceToShow ?? null,
          createdAt: l.createdAt || null,
          updatedAt: l.updatedAt || l.createdAt || null,
          priceToShow: l.priceToShow ?? l.pricePerItemToShow ?? Number(l.pricePerItem || 0),
        },
      }
    }).filter(Boolean)

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      nodes,
      pageInfo: {
        hasNextPage,
        endCursor: listings.length > 0 ? listings[listings.length - 1]._id.toString() : null,
        totalCount: nodes.length,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
