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

// SC's /api/tracks/explore caps at 100 nodes and does NOT honor `offset` —
// verified May 12 (offset=0 and offset=4900 returned identical first record).
// Card grid is therefore capped at the popular-sort top 100; the authoritative
// on-chain totals come from `totalSupply()` directly on each NFT contract.
const SC_EXPLORE_PAGE_SIZE = 100

// Polygon public RPC for reading totalSupply(). 1rpc.io confirmed working when
// polygon-rpc.com / publicnode 403 the request (May 12).
const POLYGON_RPC = 'https://1rpc.io/matic'

// ERC-721 totalSupply() function selector.
const TOTAL_SUPPLY_SELECTOR = '0x18160ddd'

async function readTotalSupply(contract: string): Promise<number> {
  try {
    const res = await fetch(POLYGON_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: contract, data: TOTAL_SUPPLY_SELECTOR }, 'latest'],
        id: 1,
      }),
    })
    if (!res.ok) return 0
    const data = await res.json()
    const hex = data?.result
    if (!hex || hex === '0x') return 0
    return parseInt(hex, 16) || 0
  } catch {
    return 0
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // limit caps the card-grid output. On-chain totals are fetched in parallel
  // and reflect every mint regardless of how many cards the grid actually shows.
  const limit = Math.min(parseInt(req.query.limit as string) || 60, 200)

  try {
    // Three parallel reads:
    //   1. SC active marketplace listings (for the top-of-feed for-sale cards)
    //   2. SC popular minted tracks (for the metadata-rich card grid; SC caps at 100)
    //   3+4. On-chain totalSupply() on both NFT contracts (authoritative mint counts)
    const [listingsRes, exploreRes, v1Total, v2Total] = await Promise.all([
      fetch(`${SC_BASE}/api/marketplace/listings?limit=${limit * 4}`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
      fetch(`${SC_BASE}/api/tracks/explore?sort=popular&limit=${SC_EXPLORE_PAGE_SIZE}`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
      readTotalSupply(NFT_CONTRACTS.V1),
      readTotalSupply(NFT_CONTRACTS.V2),
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

    // Authoritative per-contract counts come from on-chain `totalSupply()` —
    // not from the SC API sample. These reflect every mint that has ever
    // happened on either NFT contract.
    const totalMinted = v1Total + v2Total

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
        v1: { address: NFT_CONTRACTS.V1, count: v1Total },
        v2: { address: NFT_CONTRACTS.V2, count: v2Total },
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'failed to load' })
  }
}
