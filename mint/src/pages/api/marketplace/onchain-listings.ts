/**
 * GET /api/marketplace/onchain-listings
 *
 * Scans Polygon RPC for recent ItemListed events from the SoundchainMarketplace-
 * Editions contract. Returns active on-chain listings — the ground truth of
 * what's actually for sale right now, independent of SC's marketplace API.
 *
 * Why: SC's /api/marketplace/listings collection is sparsely populated. When
 * an artist lists on Polygon directly (or the SC API is out-of-sync), the
 * on-chain event log is the only authoritative source. This endpoint fills
 * that gap.
 *
 * Strategy:
 *   1. eth_getLogs scan over recent N blocks (default ~200k blocks ≈ 6 days)
 *   2. Decode ItemListed events from the marketplace contract
 *   3. Optionally filter out listings that have been cancelled / sold by
 *      cross-checking against ItemCanceled + ItemSold events in same window
 *   4. Optionally enrich with track metadata via /api/tracks/list proxy
 *
 * Cache: in-memory + Cache-Control 60s SWR 300s. ~10 RPC chunks per call so
 * we want to dedupe across requests.
 *
 * Polygon RPC has a 10k-block range cap on eth_getLogs, so we chunk.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem'
import { polygon } from 'viem/chains'

const MARKETPLACE_EDITIONS = '0x7EfC9A7F3381A4B28a2113EA99E2d80832589239' as const
const NFT_V2 = '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0' as const

// Event signatures (decoded from SoundchainMarketplaceEditions.sol):
const ITEM_LISTED_EVENT = parseAbiItem(
  'event ItemListed(address indexed owner, address indexed nft, uint256 tokenId, uint256 quantity, uint256 chainId)'
)
const ITEM_CANCELED_EVENT = parseAbiItem(
  'event ItemCanceled(address indexed owner, address indexed nft, uint256 tokenId)'
)
const ITEM_SOLD_EVENT = parseAbiItem(
  'event ItemSold(address indexed seller, address indexed buyer, address indexed nft, uint256 tokenId, uint256 quantity, address payToken, uint256 unitPrice, uint256 pricePerItem)'
)

// In-memory cache — fine across single Vercel function invocations.
let cache: { ts: number; data: any } | null = null
const CACHE_TTL_MS = 60_000

const client = createPublicClient({ chain: polygon, transport: http('https://polygon-rpc.com') })

// Polygon eth_getLogs limit
const CHUNK = 9000n

interface ActiveListing {
  owner: string
  tokenId: string
  quantity: string
  chainId: string
  blockNumber: string
  txHash: string
}

async function scanWindow(fromBlock: bigint, toBlock: bigint) {
  const listed: Map<string, ActiveListing> = new Map() // key = owner:tokenId
  const cancelled = new Set<string>()
  const sold = new Set<string>()

  for (let start = fromBlock; start <= toBlock; start += CHUNK + 1n) {
    const end = start + CHUNK > toBlock ? toBlock : start + CHUNK

    // Parallelize the 3 event-type pulls for this chunk
    const [listedLogs, cancelLogs, soldLogs] = await Promise.all([
      client.getLogs({
        address: MARKETPLACE_EDITIONS,
        event: ITEM_LISTED_EVENT,
        fromBlock: start,
        toBlock: end,
        args: { nft: NFT_V2 },
      }),
      client.getLogs({
        address: MARKETPLACE_EDITIONS,
        event: ITEM_CANCELED_EVENT,
        fromBlock: start,
        toBlock: end,
        args: { nft: NFT_V2 },
      }),
      client.getLogs({
        address: MARKETPLACE_EDITIONS,
        event: ITEM_SOLD_EVENT,
        fromBlock: start,
        toBlock: end,
        args: { nft: NFT_V2 },
      }),
    ])

    for (const log of listedLogs) {
      const args: any = log.args
      const key = `${(args.owner || '').toLowerCase()}:${(args.tokenId || 0n).toString()}`
      listed.set(key, {
        owner: args.owner,
        tokenId: args.tokenId.toString(),
        quantity: args.quantity?.toString() || '1',
        chainId: args.chainId?.toString() || '137',
        blockNumber: log.blockNumber.toString(),
        txHash: log.transactionHash || '',
      })
    }
    for (const log of cancelLogs) {
      const args: any = log.args
      cancelled.add(`${(args.owner || '').toLowerCase()}:${(args.tokenId || 0n).toString()}`)
    }
    for (const log of soldLogs) {
      const args: any = log.args
      sold.add(`${(args.seller || '').toLowerCase()}:${(args.tokenId || 0n).toString()}`)
    }
  }

  // Active listings = listed minus cancelled minus sold
  const active: ActiveListing[] = []
  for (const [key, l] of listed) {
    if (cancelled.has(key)) continue
    if (sold.has(key)) continue
    active.push(l)
  }
  return active
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  // Cache hit
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    return res.status(200).json(cache.data)
  }

  try {
    const latest = await client.getBlockNumber()
    // Look back ~6 days worth of Polygon blocks (~2s blocks → 250k blocks).
    // Override via ?blocks= query for testing.
    const lookback = BigInt(Math.max(1, Math.min(500_000, parseInt(String(req.query.blocks || ''), 10) || 250_000)))
    const fromBlock = latest > lookback ? latest - lookback : 0n

    const active = await scanWindow(fromBlock, latest)

    const payload = {
      source: 'onchain',
      nftContract: NFT_V2,
      marketplace: MARKETPLACE_EDITIONS,
      scannedFrom: fromBlock.toString(),
      scannedTo: latest.toString(),
      count: active.length,
      listings: active,
    }

    cache = { ts: Date.now(), data: payload }
    res.setHeader('X-Cache', 'MISS')
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    return res.status(200).json(payload)
  } catch (err: any) {
    // Stale-while-error — return last good cache if available
    if (cache) {
      res.setHeader('X-Cache', 'STALE-ERROR')
      return res.status(200).json({ ...cache.data, stale: true })
    }
    return res.status(502).json({ error: err?.shortMessage || err?.message || 'scan failed' })
  }
}
