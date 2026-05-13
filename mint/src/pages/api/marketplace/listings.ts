/**
 * GET /api/marketplace/listings
 *
 * Surfaces EVERY minted NFT edition as one card. Sources:
 *
 *   1. SC's REST /api/marketplace/listings — active marketplace listings (Polygon
 *      MarketplaceEditions contract). Grouped by edition: one card per edition
 *      with floor price + listed/total fraction. Today this collection is
 *      sparsely populated, so step 2 contributes most cards.
 *   2. SC's GraphQL exploreTracks (cursor-paginated) — every NFT-minted track
 *      with `nftData != null`. Sorted by PLAYBACK_COUNT DESC so popular mints
 *      come first; we paginate the full set (max ~20 pages of 100) and filter
 *      client-side for `nftData`. This replaces the REST /api/tracks/explore
 *      path which silently capped at 100.
 *
 * Authoritative on-chain mint count comes from `totalSupply()` on V1 + V2 NFT
 * contracts (unchanged from previous implementation).
 *
 * Response shape (backward-compatible):
 *   {
 *     listings: ListingPreview[],   // ALL unique edition cards
 *     source: 'merged' | 'listings' | 'browse',
 *     counts: { listed, minted, mintedTotal },
 *     contracts: { v1: { address, count }, v2: { address, count } }
 *   }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getV1Catalog } from './v1-catalog'
import { getV2Catalog } from './v2-catalog'

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
  version?: 'v1' | 'v2'            // which NFT contract (v1=legacy 2021-22, v2=Editions 2023+)
  href?: string
}

// Detect which contract a card lives on from its contract address.
function detectVersion(contract?: string | null): 'v1' | 'v2' | undefined {
  if (!contract) return undefined
  const c = contract.toLowerCase()
  if (c === NFT_CONTRACTS.V1.toLowerCase()) return 'v1'
  if (c === NFT_CONTRACTS.V2.toLowerCase()) return 'v2'
  return undefined
}

// SC base URL for the listings REST endpoint (active marketplace listings).
const SC_BASE = 'https://soundchain.io'

// GraphQL endpoint. NEXT_PUBLIC_API_URL is the same env var the web app reads;
// in production this should resolve to https://api.soundchain.io/graphql via
// the API Gateway custom domain. However, the api.soundchain.io DNS still
// routes through a broken EC2 proxy (54.89.147.104) for some clients, so we
// fall back to the direct API Gateway invoke URL which is always reachable
// (see CLAUDE.md Feb 2-4, 2026 sessions on API Gateway direct migration).
const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

// Defensive pagination ceiling: 20 pages × 100 = 2000 records max. SC currently
// has ~600 tracks total (~500 NFT-minted); this leaves plenty of headroom for
// 2x growth without runaway loops. Each page is one GraphQL round-trip.
const MAX_PAGES = 20
const PAGE_SIZE = 100

// Inter-page delay to be polite to the upstream GraphQL Lambda. 100ms × 7 pages
// (typical) = 700ms — well below SWR window.
const PAGE_DELAY_MS = 100

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

// Minimal GraphQL track shape we project from exploreTracks. Matches the
// shape the marketplace card grid + detail page consume.
interface ExploreTrack {
  id: string
  title?: string
  artist?: string
  artworkUrl?: string
  playbackUrl?: string
  assetUrl?: string
  createdAt?: string
  editionSize?: number
  trackEditionId?: string | null
  nftData?: { tokenId: number | string; contract: string } | null
  saleType?: string | null
  price?: number | null
  listingCount?: number | null
}

// The exploreTracks GraphQL query. PLAYBACK_COUNT sort makes the highest-traffic
// (and therefore most NFT-rich) tracks paginate first — important if Lambda
// times out mid-loop, we still return the most relevant cards.
const EXPLORE_TRACKS_QUERY = /* GraphQL */ `
  query MintMarketplaceExploreTracks($page: PageInput) {
    exploreTracks(sort: { field: PLAYBACK_COUNT, order: DESC }, page: $page) {
      nodes {
        id
        title
        artist
        artworkUrl
        playbackUrl
        assetUrl
        createdAt
        editionSize
        trackEditionId
        nftData {
          tokenId
          contract
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        totalCount
      }
    }
  }
`

async function fetchExploreTracksPage(
  after: string | null,
): Promise<{
  nodes: ExploreTrack[]
  hasNextPage: boolean
  endCursor: string | null
  totalCount: number
} | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'soundchain-mint',
      },
      body: JSON.stringify({
        query: EXPLORE_TRACKS_QUERY,
        variables: { page: { first: PAGE_SIZE, ...(after ? { after } : {}) } },
      }),
    })

    if (res.status === 429) {
      // Rate-limited — back off and let the outer loop decide whether to retry.
      await new Promise((r) => setTimeout(r, 1000))
      return null
    }

    if (!res.ok) return null
    const json = await res.json()
    const data = json?.data?.exploreTracks
    if (!data) return null

    return {
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      hasNextPage: !!data.pageInfo?.hasNextPage,
      endCursor: data.pageInfo?.endCursor || null,
      totalCount: typeof data.pageInfo?.totalCount === 'number' ? data.pageInfo.totalCount : 0,
    }
  } catch {
    return null
  }
}

// Loop exploreTracks until exhausted (or MAX_PAGES safety cap). Returns the
// concatenated list of ALL NFT-minted tracks in popularity order.
async function fetchAllMintedTracks(): Promise<ExploreTrack[]> {
  const all: ExploreTrack[] = []
  let cursor: string | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchExploreTracksPage(cursor)
    if (!result) break

    // Keep only minted tracks (NFT-backed). The exploreTracks query returns
    // unminted tracks too (SCid-only uploads); marketplace surfaces NFTs only.
    for (const t of result.nodes) {
      if (t.nftData && t.nftData.contract && t.nftData.tokenId != null) {
        all.push(t)
      }
    }

    if (!result.hasNextPage || !result.endCursor) break
    cursor = result.endCursor

    // Politeness delay between pages.
    if (page < MAX_PAGES - 1) {
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS))
    }
  }

  return all
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // limit caps the card-grid output. On-chain totals are fetched in parallel
  // and reflect every mint regardless of how many cards the grid actually shows.
  const limit = Math.min(parseInt(req.query.limit as string) || 60, 2000)

  try {
    // Six parallel reads:
    //   1. SC active marketplace listings (for the top-of-feed for-sale cards)
    //   2. SC paginated exploreTracks (ALL minted NFT cards via GraphQL)
    //   3. V1 catalog enumeration (all 393 legacy V1 tokenIds via ERC-721 Enumerable)
    //   4. V2 catalog enumeration (all ~7787 V2 tokenIds via sequential ownerOf probe)
    //   5+6. On-chain totalSupply() on both NFT contracts (authoritative mint counts)
    // V1+V2 catalogs are soft-failed — never block the primary listings response
    // on enumeration RPC failures. The catalogs cache aggressively (V1: 24h, V2: 1h)
    // so most requests serve from module memory near-instantly.
    const [listingsRes, allMintedTracks, v1CatalogResult, v2CatalogResult, v1Total, v2Total] = await Promise.all([
      fetch(`${SC_BASE}/api/marketplace/listings?limit=${Math.min(limit * 4, 400)}`, {
        headers: { 'User-Agent': 'soundchain-mint' },
      }).catch(() => null),
      fetchAllMintedTracks(),
      getV1Catalog().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[listings] V1 catalog enumeration failed:', err?.shortMessage || err?.message)
        return { tokenIds: [] as string[], totalSupply: 0, cached: false }
      }),
      getV2Catalog().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[listings] V2 catalog enumeration failed:', err?.shortMessage || err?.message)
        return { tokenIds: [] as string[], totalSupply: 0, observedCeiling: 0, cached: false }
      }),
      readTotalSupply(NFT_CONTRACTS.V1),
      readTotalSupply(NFT_CONTRACTS.V2),
    ])

    const listingsData = listingsRes?.ok ? await listingsRes.json() : { nodes: [] }
    const nodes = Array.isArray(listingsData.nodes) ? listingsData.nodes : []

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
        version: detectVersion(rep.nftAddress),
        href: `/marketplace/${rep.track?.id || rep.id}`,
      }
    })

    const listedIds = new Set(listed.map((c) => c.id))

    // Authoritative per-contract counts come from on-chain `totalSupply()` —
    // not from the SC API sample. These reflect every mint that has ever
    // happened on either NFT contract.
    const totalMinted = v1Total + v2Total

    // Track which (contract, tokenId) pairs SC GraphQL already indexed. V1 and
    // V2 tokenIds overlap numerically (both start from 0), so dedupe must be
    // contract-aware. Build the set during browse-card construction.
    const indexedV1 = new Set<string>()
    const indexedV2 = new Set<string>()

    // Browse cards: every minted track from GraphQL pagination (already filtered
    // to nftData-present). Skip any track already represented in `listed`.
    // Sort newest-first within the browse set so recent mints surface
    // immediately under the for-sale section.
    const browse: ListingPreview[] = allMintedTracks
      .filter((t) => !listedIds.has(t.id))
      .sort((a, b) => {
        const ad = new Date(a.createdAt || 0).getTime()
        const bd = new Date(b.createdAt || 0).getTime()
        return bd - ad
      })
      .map((t) => {
        const price = typeof t.price === 'number' ? t.price : undefined
        const priceToken: PriceToken | undefined = price != null
          ? tokenFromSaleType(t.saleType)
          : undefined
        const editionSize = typeof t.editionSize === 'number' && t.editionSize > 0
          ? t.editionSize
          : 1
        const editionListed = typeof t.listingCount === 'number' ? t.listingCount : 0

        // Record this card's (contract, tokenId) so the V1/V2 catalog merge
        // below skips it. Contract addresses are case-insensitive — lowercase
        // both sides of the comparison.
        const contractLower = String(t.nftData?.contract || '').toLowerCase()
        const tokenIdStr = String(t.nftData?.tokenId ?? '')
        if (tokenIdStr && contractLower === NFT_CONTRACTS.V1.toLowerCase()) {
          indexedV1.add(tokenIdStr)
        } else if (tokenIdStr && contractLower === NFT_CONTRACTS.V2.toLowerCase()) {
          indexedV2.add(tokenIdStr)
        }

        return {
          id: t.id,
          tokenId: tokenIdStr,
          title: t.title,
          artist: t.artist,
          coverArtUrl: t.artworkUrl,
          audioUrl: t.playbackUrl || t.assetUrl,
          price,
          priceToken,
          editionSize,
          editionListed,
          forSale: false,
          version: detectVersion(t.nftData?.contract),
          href: `/marketplace/${t.id}`,
        }
      })

    // V1 catalog placeholder cards — any V1 tokenId NOT already covered by SC
    // GraphQL gets a bare card so the legacy 2021-2022 catalog is visible.
    // Title/cover are intentionally minimal here; the detail page hydrates
    // metadata from SC's track index or tokenURI on click.
    const v1Placeholder: ListingPreview[] = []
    for (const tokenId of v1CatalogResult.tokenIds) {
      if (indexedV1.has(tokenId)) continue
      v1Placeholder.push({
        id: `v1-${tokenId}`,
        tokenId,
        title: `Legacy NFT #${tokenId}`,
        artist: 'SoundChain · V1 (2021–2022)',
        editionSize: 1,
        editionListed: 0,
        forSale: false,
        version: 'v1',
        href: `/marketplace/v1-${tokenId}`,
      })
    }

    // V2 catalog placeholder cards — same pattern. Surfaces every V2 mint that
    // SC GraphQL hasn't indexed (the dominant case: only ~201 of 7785 V2 tokens
    // are in the GraphQL exploreTracks projection). Detail-page hydrates.
    const v2Placeholder: ListingPreview[] = []
    for (const tokenId of v2CatalogResult.tokenIds) {
      if (indexedV2.has(tokenId)) continue
      v2Placeholder.push({
        id: `v2-${tokenId}`,
        tokenId,
        title: `V2 NFT #${tokenId}`,
        artist: 'SoundChain · V2 (2023+)',
        editionSize: 1,
        editionListed: 0,
        forSale: false,
        version: 'v2',
        href: `/marketplace/v2-${tokenId}`,
      })
    }

    // Order: listed (holographic in UI) → GraphQL-indexed → V2 placeholders (newer, more relevant)
    // → V1 placeholders (legacy 2021-2022 catalog at the tail). limit applies to the combined slice.
    const merged = [...listed, ...browse, ...v2Placeholder, ...v1Placeholder].slice(0, limit)

    const source = listed.length > 0 && (browse.length > 0 || v1Placeholder.length > 0 || v2Placeholder.length > 0)
      ? 'merged'
      : listed.length > 0
      ? 'listings'
      : 'browse'

    // 120s edge cache — pagination across 5-10 GraphQL calls is ~2-5s cold, so
    // most requests should hit edge. SWR keeps tail-fetch from blocking users.
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600')
    return res.status(200).json({
      listings: merged,
      source,
      counts: {
        listed: listed.length,
        // Total visible browse cards: GraphQL-indexed + V1 placeholders + V2 placeholders.
        minted: browse.length + v1Placeholder.length + v2Placeholder.length,
        mintedTotal: totalMinted,                       // every mint across V1+V2 contracts (on-chain)
        v1Enumerated: v1CatalogResult.tokenIds.length,  // V1 tokens surfaced via ERC-721 Enumerable
        v2Enumerated: v2CatalogResult.tokenIds.length,  // V2 tokens surfaced via sequential ownerOf probe
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
