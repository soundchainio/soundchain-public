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

// Canonical on-chain NFT contract addresses on Polygon mainnet. Every mint
// since 2021 lives on one of these two — V1 (legacy ERC-721) for the 2021-2022
// era, V2 (Editions) for everything since. We surface both addresses + counts
// in the API response so the marketplace UI can render an on-chain transparency
// footer with Polygonscan links.
export const NFT_CONTRACTS = {
  V1: '0x01E2ae47222B23EE1887c5b863FA36Af580E8A5c',
  V2: '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0',
} as const

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

// Page size SC's API serves before truncating. Verified empirically May 12.
const SC_EXPLORE_PAGE_SIZE = 100
// Defensive upper bound on iterations — at 100/page that's 5000 NFTs of headroom.
// Mint history is ~500 today; this gives ~10x cushion before requiring a config bump.
const MAX_EXPLORE_PAGES = 50

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // limit caps the OUTPUT card count for grid rendering. The pagination loop
  // still pulls every mint (subject to MAX_EXPLORE_PAGES) so per-contract
  // counts in the transparency footer reflect the full on-chain inventory.
  const limit = Math.min(parseInt(req.query.limit as string) || 60, 500)

  try {
    // Fetch active listings in parallel with the first page of explore. Listings
    // pin to the top of the merged feed (holographic-bordered) and every minted
    // NFT shows up underneath. Dedup is by track.id so a track with an active
    // listing doesn't double-render as both for-sale and browse.
    const [listingsRes, firstExploreRes] = await Promise.all([
      fetch(`${SC_BASE}/api/marketplace/listings?limit=${limit * 4}`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
      fetch(`${SC_BASE}/api/tracks/explore?sort=popular&limit=${SC_EXPLORE_PAGE_SIZE}&offset=0`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
    ])

    const listingsData = listingsRes?.ok ? await listingsRes.json() : { nodes: [] }
    const firstExploreData = firstExploreRes?.ok ? await firstExploreRes.json() : { nodes: [] }
    const nodes = Array.isArray(listingsData.nodes) ? listingsData.nodes : []
    const firstPage = Array.isArray(firstExploreData.nodes) ? firstExploreData.nodes : []

    // Paginate remaining explore pages sequentially until a page comes back
    // shorter than the page size (signals end-of-feed). MAX_EXPLORE_PAGES
    // caps the loop in case SC's API ever paginates differently.
    const tracks: any[] = [...firstPage]
    if (firstPage.length === SC_EXPLORE_PAGE_SIZE) {
      for (let page = 1; page < MAX_EXPLORE_PAGES; page++) {
        const offset = page * SC_EXPLORE_PAGE_SIZE
        const r = await fetch(
          `${SC_BASE}/api/tracks/explore?sort=popular&limit=${SC_EXPLORE_PAGE_SIZE}&offset=${offset}`,
          { headers: { 'User-Agent': 'soundchain-mint' } },
        ).catch(() => null)
        if (!r?.ok) break
        const d = await r.json()
        const pageNodes = Array.isArray(d.nodes) ? d.nodes : []
        if (pageNodes.length === 0) break
        tracks.push(...pageNodes)
        if (pageNodes.length < SC_EXPLORE_PAGE_SIZE) break
      }
    }

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

    // Per-contract tally — runs across the ENTIRE paginated set (not just the
    // sliced grid output) so the transparency footer reflects every mint, V1
    // and V2, regardless of how many cards the UI actually renders.
    const contractCounts: Record<string, number> = {}
    let totalMinted = 0
    for (const t of tracks) {
      const nft = t?.nftData
      if (!nft) continue
      totalMinted++
      const addr = String(nft.contract || '').toLowerCase()
      if (addr) contractCounts[addr] = (contractCounts[addr] || 0) + 1
    }

    // Sort browse cards newest-first (createdAt desc) so the most recent mints
    // surface immediately under the for-sale section.
    const browse: ListingPreview[] = tracks
      .filter((t: any) => t.nftData && !listedIds.has(t.id))
      .sort((a: any, b: any) => {
        const ad = new Date(a.createdAt || 0).getTime()
        const bd = new Date(b.createdAt || 0).getTime()
        return bd - ad
      })
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

    // Listed first (holographic-bordered in UI), then full newest-first minted list.
    const merged = [...listed, ...browse].slice(0, limit)

    const source = listed.length > 0 && browse.length > 0
      ? 'merged'
      : listed.length > 0
      ? 'listings'
      : 'browse'

    // 60s edge cache — pagination across 5-10 SC API calls is ~1-3s cold, so
    // most requests should hit edge. SWR keeps tail-fetch from blocking users.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({
      listings: merged,
      source,
      counts: {
        listed: listed.length,
        minted: browse.length,        // unique minted-only cards shown
        mintedTotal: totalMinted,     // every mint across V1+V2 contracts
      },
      contracts: {
        v1: { address: NFT_CONTRACTS.V1, count: contractCounts[NFT_CONTRACTS.V1.toLowerCase()] || 0 },
        v2: { address: NFT_CONTRACTS.V2, count: contractCounts[NFT_CONTRACTS.V2.toLowerCase()] || 0 },
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'failed to load' })
  }
}
