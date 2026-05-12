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
 *      MarketplaceEditions contract). Today this collection is sparsely
 *      populated, so step 2 usually fires.
 *   2. SC's /api/tracks/explore — minted tracks with on-chain nftData, used as
 *      the browse-mode fallback so users can discover OGUN NFTs even when no
 *      active marketplace listings exist.
 *
 * When MONGODB_URI is provisioned on the mint Vercel project, this endpoint
 * will swap to a direct Atlas read against `soundchain.listingitems` +
 * `soundchain.tracks` (same schema SC reads). Until then, server-side proxy
 * keeps the dependency one-way: mint → soundchain.io, never the reverse.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SC_BASE = 'https://soundchain.io'

export interface ListingPreview {
  id: string
  tokenId: string
  title?: string
  artist?: string
  coverArtUrl?: string
  audioUrl?: string
  priceLabel?: string
  href?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const limit = Math.min(parseInt(req.query.limit as string) || 24, 100)

  try {
    const listingsRes = await fetch(`${SC_BASE}/api/marketplace/listings?limit=${limit}`, {
      headers: { 'User-Agent': 'soundchain-mint' },
    })
    const listingsData = listingsRes.ok ? await listingsRes.json() : { nodes: [] }
    const nodes = Array.isArray(listingsData.nodes) ? listingsData.nodes : []

    if (nodes.length > 0) {
      const listings: ListingPreview[] = nodes.map((l: any) => {
        const isOgun = !!l.isPaymentOGUN
        const price = typeof l.pricePerItemToShow === 'number'
          ? l.pricePerItemToShow
          : l.pricePerItem
        const priceLabel = price != null
          ? `${Number(price).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${isOgun ? 'OGUN' : 'POL'}`
          : undefined
        return {
          id: l.id,
          tokenId: l.tokenId != null ? String(l.tokenId) : '',
          title: l.track?.title,
          artist: l.track?.artist,
          coverArtUrl: l.track?.artworkUrl,
          audioUrl: l.track?.playbackUrl || l.track?.assetUrl,
          priceLabel,
          href: `/marketplace/${l.id}`,
        }
      })
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
      return res.status(200).json({ listings, source: 'listings' })
    }

    // Popular-sort surfaces minted NFTs (newest is dominated by SCid-only
    // uploads where nftData is null). 2x limit gives headroom in case some
    // tracks at the top are still SCid-only.
    const exploreRes = await fetch(`${SC_BASE}/api/tracks/explore?sort=popular&limit=${limit * 2}`, {
      headers: { 'User-Agent': 'soundchain-mint' },
    })
    const exploreData = exploreRes.ok ? await exploreRes.json() : { nodes: [] }
    const tracks = Array.isArray(exploreData.nodes) ? exploreData.nodes : []

    const browse: ListingPreview[] = tracks
      .filter((t: any) => t.nftData)
      .slice(0, limit)
      .map((t: any) => {
        const editionLabel = t.editionSize
          ? `Edition of ${t.editionSize}`
          : 'OGUN NFT'
        return {
          id: t.id,
          tokenId: String(t.nftData?.tokenId ?? ''),
          title: t.title,
          artist: t.artist,
          coverArtUrl: t.artworkUrl,
          audioUrl: t.playbackUrl || t.assetUrl || t.audioUrl,
          priceLabel: editionLabel,
          href: `${SC_BASE}/tracks/${t.id}`,
        }
      })

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json({ listings: browse, source: 'browse' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'failed to load' })
  }
}
