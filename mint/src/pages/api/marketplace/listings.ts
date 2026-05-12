/**
 * GET /api/marketplace/listings
 *
 * Proxies SC's marketplace data into the mint app so the marketplace grid is
 * self-contained (no client-side cross-origin fetch). Returns a unified shape:
 *
 *   { listings: ListingPreview[], source: 'listings' | 'browse' }
 *
 * Resolution order:
 *   1. SC's /api/marketplace/listings — active marketplace listings (Polygon
 *      MarketplaceEditions contract). Grouped by edition: one card per edition
 *      with floor price + listed/total fraction. Today this collection is
 *      sparsely populated, so step 2 usually fires.
 *   2. SC's /api/tracks/explore — minted tracks with on-chain nftData, used as
 *      the browse-mode fallback. Each track = one edition = one card.
 *
 * When MONGODB_URI is provisioned on the mint Vercel project, this endpoint
 * will swap to a direct Atlas read against `soundchain.listingitems` +
 * `soundchain.tracks` (same schema SC reads). Until then, server-side proxy
 * keeps the dependency one-way: mint → soundchain.io, never the reverse.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SC_BASE = 'https://soundchain.io'

export type PriceToken = 'POL' | 'OGUN' | 'ETH' | 'USDC' | 'USDT' | 'LINK' | 'AVAX'

export interface ListingPreview {
  id: string                       // track id or first listing id (used as detail-page key)
  tokenId: string
  title?: string
  artist?: string
  coverArtUrl?: string
  audioUrl?: string
  price?: number                   // numeric floor price (display units, not wei)
  priceToken?: PriceToken          // currency symbol on the price
  editionSize?: number             // total edition supply (1 for 1/1s)
  editionListed?: number           // count actively listed for sale right now
  forSale?: boolean                // true = active marketplace listing, false = minted-only
  href?: string
}

// SC's saleType → token symbol mapping. Reasonable defaults; we treat anything
// unrecognized as POL since that's the mint app's primary chain native.
function tokenFromSaleType(saleType?: string | null, isPaymentOGUN?: boolean): PriceToken {
  if (isPaymentOGUN) return 'OGUN'
  if (!saleType) return 'POL'
  const s = String(saleType).toUpperCase()
  if (s.includes('OGUN')) return 'OGUN'
  if (s.includes('USDC')) return 'USDC'
  if (s.includes('USDT')) return 'USDT'
  if (s.includes('ETH')) return 'ETH'
  if (s.includes('LINK')) return 'LINK'
  if (s.includes('AVAX')) return 'AVAX'
  return 'POL'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const limit = Math.min(parseInt(req.query.limit as string) || 24, 100)

  try {
    // Fetch BOTH sources in parallel. Active listings pin to the top of the
    // merged feed (holographic-bordered in the UI) and every minted-but-not-
    // listed NFT shows up underneath. Dedup is by track.id so a track with an
    // active listing doesn't double-render as both for-sale and browse.
    const [listingsRes, exploreRes] = await Promise.all([
      fetch(`${SC_BASE}/api/marketplace/listings?limit=${limit * 4}`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
      fetch(`${SC_BASE}/api/tracks/explore?sort=popular&limit=${limit * 2}`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
    ])

    const listingsData = listingsRes?.ok ? await listingsRes.json() : { nodes: [] }
    const exploreData = exploreRes?.ok ? await exploreRes.json() : { nodes: [] }
    const nodes = Array.isArray(listingsData.nodes) ? listingsData.nodes : []
    const tracks = Array.isArray(exploreData.nodes) ? exploreData.nodes : []

    // Group listings by edition — multiple per-token listings of the same edition
    // collapse into one card with floor price + "X/N listed" fraction.
    const groups = new Map<string, { rep: any; listings: any[] }>()
    for (const l of nodes) {
      const key = l.track?.id || l.track?.trackEditionId || `${l.nftAddress}-${l.tokenId}`
      if (!key) continue
      const existing = groups.get(key)
      if (existing) existing.listings.push(l)
      else groups.set(key, { rep: l, listings: [l] })
    }

    const listed: ListingPreview[] = Array.from(groups.values()).map(({ rep, listings: groupListings }) => {
      let floorPrice: number | undefined
      let priceToken: PriceToken | undefined
      for (const l of groupListings) {
        const price = typeof l.pricePerItemToShow === 'number'
          ? l.pricePerItemToShow
          : (typeof l.pricePerItem === 'number' ? l.pricePerItem : undefined)
        if (price == null) continue
        if (floorPrice == null || price < floorPrice) {
          floorPrice = price
          priceToken = tokenFromSaleType(l.saleType, l.isPaymentOGUN)
        }
      }

      return {
        id: rep.track?.id || rep.id,
        tokenId: rep.tokenId != null ? String(rep.tokenId) : '',
        title: rep.track?.title,
        artist: rep.track?.artist,
        coverArtUrl: rep.track?.artworkUrl,
        audioUrl: rep.track?.playbackUrl || rep.track?.assetUrl,
        price: floorPrice,
        priceToken,
        editionSize: rep.track?.editionSize || undefined,
        editionListed: groupListings.length,
        forSale: true,
        href: `/marketplace/${rep.track?.id || rep.id}`,
      }
    })

    const listedIds = new Set(listed.map((c) => c.id))

    const browse: ListingPreview[] = tracks
      .filter((t: any) => t.nftData && !listedIds.has(t.id))
      .map((t: any) => {
        const price = typeof t.price === 'number' ? t.price : undefined
        const priceToken: PriceToken | undefined = price != null
          ? tokenFromSaleType(t.saleType)
          : undefined
        const editionSize = typeof t.editionSize === 'number' && t.editionSize > 0
          ? t.editionSize
          : 1
        const editionListed = typeof t.listingCount === 'number' ? t.listingCount : 0

        return {
          id: t.id,
          tokenId: String(t.nftData?.tokenId ?? ''),
          title: t.title,
          artist: t.artist,
          coverArtUrl: t.artworkUrl,
          audioUrl: t.playbackUrl || t.assetUrl || t.audioUrl,
          price,
          priceToken,
          editionSize,
          editionListed,
          forSale: false,
          href: `/marketplace/${t.id}`,
        }
      })

    // Listed first (holographic-bordered in UI), then unique minted-only.
    const merged = [...listed, ...browse].slice(0, limit)

    const source = listed.length > 0 && browse.length > 0
      ? 'merged'
      : listed.length > 0
      ? 'listings'
      : 'browse'

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      listings: merged,
      source,
      counts: { listed: listed.length, minted: browse.length },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'failed to load' })
  }
}
