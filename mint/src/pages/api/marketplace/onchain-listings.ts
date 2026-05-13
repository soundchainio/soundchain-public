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

// V1 (legacy 2021-2022 marketplace + single-edition NFT contract)
const MARKETPLACE_V1 = '0x27302E3ff5287a5973d8D5328C4cEFCd752778f2' as const
const NFT_V1 = '0x01E2ae47222B23EE1887c5b863FA36Af580E8A5c' as const

// V2 event signatures (SoundchainMarketplaceEditions.sol):
const ITEM_LISTED_V2 = parseAbiItem(
  'event ItemListed(address indexed owner, address indexed nft, uint256 tokenId, uint256 quantity, uint256 chainId)'
)
const ITEM_CANCELED_V2 = parseAbiItem(
  'event ItemCanceled(address indexed owner, address indexed nft, uint256 tokenId)'
)
const ITEM_SOLD_V2 = parseAbiItem(
  'event ItemSold(address indexed seller, address indexed buyer, address indexed nft, uint256 tokenId, uint256 quantity, address payToken, uint256 unitPrice, uint256 pricePerItem)'
)

// V1 event signatures (SoundchainMarketplace.sol — legacy, no payToken/chainId/unitPrice):
const ITEM_LISTED_V1 = parseAbiItem(
  'event ItemListed(address indexed owner, address indexed nft, uint256 tokenId, uint256 quantity, uint256 pricePerItem, uint256 startingTime)'
)
const ITEM_CANCELED_V1 = parseAbiItem(
  'event ItemCanceled(address indexed owner, address indexed nft, uint256 tokenId)'
)
const ITEM_SOLD_V1 = parseAbiItem(
  'event ItemSold(address indexed seller, address indexed buyer, address indexed nft, uint256 tokenId, uint256 quantity, uint256 pricePerItem)'
)

// In-memory cache — fine across single Vercel function invocations.
let cache: { ts: number; data: any } | null = null
const CACHE_TTL_MS = 60_000

// Multi-RPC fallback — public endpoints rate-limit Vercel serverless IPs
// aggressively. Override via POLYGON_RPC_URL on Vercel env when you have
// an authenticated endpoint (Alchemy / QuickNode / Infura).
const RPC_FALLBACKS = [
  process.env.POLYGON_RPC_URL,
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.llamarpc.com',
  'https://rpc.ankr.com/polygon',
  'https://polygon-rpc.com',
].filter((u): u is string => !!u)

function makeClient(rpcUrl: string) {
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { timeout: 8000, retryCount: 0 }),
  })
}

let activeClient = makeClient(RPC_FALLBACKS[0])
let activeRpcIdx = 0

/** Call an async fn against the active RPC; rotate to next on transport error. */
async function withRpcFailover<T>(op: (c: ReturnType<typeof makeClient>) => Promise<T>): Promise<T> {
  let lastErr: any = null
  for (let i = 0; i < RPC_FALLBACKS.length; i++) {
    const tryIdx = (activeRpcIdx + i) % RPC_FALLBACKS.length
    const c = i === 0 ? activeClient : makeClient(RPC_FALLBACKS[tryIdx])
    try {
      const out = await op(c)
      // success — stick on this RPC
      if (i !== 0) {
        activeClient = c
        activeRpcIdx = tryIdx
      }
      return out
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message || err?.shortMessage || '').toLowerCase()
      const transport = /http|timeout|fetch|network|rate|429|503|502|socket|econnreset/i.test(msg)
      if (!transport) throw err // real revert / decode error, don't rotate
      // else: try next RPC
    }
  }
  throw lastErr || new Error('all RPC fallbacks failed')
}

// Polygon eth_getLogs limit
const CHUNK = 9000n

interface ActiveListing {
  owner: string
  tokenId: string
  quantity: string
  chainId: string
  blockNumber: string
  txHash: string
  source: 'v1' | 'v2'
}

type ScanConfig = {
  source: 'v1' | 'v2'
  marketplace: `0x${string}`
  nft: `0x${string}`
  listedEvent: typeof ITEM_LISTED_V2 | typeof ITEM_LISTED_V1
  cancelEvent: typeof ITEM_CANCELED_V2 | typeof ITEM_CANCELED_V1
  soldEvent: typeof ITEM_SOLD_V2 | typeof ITEM_SOLD_V1
}

async function scanContract(cfg: ScanConfig, fromBlock: bigint, toBlock: bigint) {
  const listed: Map<string, ActiveListing> = new Map() // key = owner:tokenId
  const cancelled = new Set<string>()
  const sold = new Set<string>()

  for (let start = fromBlock; start <= toBlock; start += CHUNK + 1n) {
    const end = start + CHUNK > toBlock ? toBlock : start + CHUNK

    // Parallelize the 3 event-type pulls per chunk, each w/ RPC failover
    const [listedLogs, cancelLogs, soldLogs] = await Promise.all([
      withRpcFailover((c) => c.getLogs({
        address: cfg.marketplace,
        event: cfg.listedEvent,
        fromBlock: start,
        toBlock: end,
        args: { nft: cfg.nft },
      })),
      withRpcFailover((c) => c.getLogs({
        address: cfg.marketplace,
        event: cfg.cancelEvent,
        fromBlock: start,
        toBlock: end,
        args: { nft: cfg.nft },
      })),
      withRpcFailover((c) => c.getLogs({
        address: cfg.marketplace,
        event: cfg.soldEvent,
        fromBlock: start,
        toBlock: end,
        args: { nft: cfg.nft },
      })),
    ])

    for (const log of listedLogs) {
      const args: any = log.args
      const key = `${(args.owner || '').toLowerCase()}:${(args.tokenId || 0n).toString()}`
      listed.set(key, {
        owner: args.owner,
        tokenId: args.tokenId.toString(),
        quantity: args.quantity?.toString() || '1',
        // V1 has no chainId field; assume Polygon 137 (only chain V1 deployed on).
        chainId: args.chainId?.toString() || '137',
        blockNumber: log.blockNumber.toString(),
        txHash: log.transactionHash || '',
        source: cfg.source,
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

const V2_CFG: ScanConfig = {
  source: 'v2',
  marketplace: MARKETPLACE_EDITIONS,
  nft: NFT_V2,
  listedEvent: ITEM_LISTED_V2,
  cancelEvent: ITEM_CANCELED_V2,
  soldEvent: ITEM_SOLD_V2,
}
const V1_CFG: ScanConfig = {
  source: 'v1',
  marketplace: MARKETPLACE_V1,
  nft: NFT_V1,
  listedEvent: ITEM_LISTED_V1,
  cancelEvent: ITEM_CANCELED_V1,
  soldEvent: ITEM_SOLD_V1,
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
    const latest = await withRpcFailover((c) => c.getBlockNumber())
    // Default: ~1 day worth of Polygon blocks (~2s blocks → 40k blocks).
    // 250k was the old default but consistently exhausted public RPC rate limits
    // (28 chunks × 3 event types × 2 contracts in parallel = 168 eth_getLogs/scan).
    // 40k keeps each scan under ~28 parallel calls and finishes in <5s on a cold cache.
    // Override via ?blocks= query if you need a deeper sweep.
    const lookback = BigInt(Math.max(1, Math.min(500_000, parseInt(String(req.query.blocks || ''), 10) || 40_000)))
    const fromBlock = latest > lookback ? latest - lookback : 0n

    // Scan V1 + V2 marketplaces in parallel. V1 is legacy (2021-2022 era) so we
    // soft-fail it — a V1 RPC blowup must not take down the V2 path which has the
    // bulk of real listings.
    const [v2Active, v1ActiveSettled] = await Promise.all([
      scanContract(V2_CFG, fromBlock, latest),
      scanContract(V1_CFG, fromBlock, latest).catch((err) => {
        // Logged but swallowed — V1 listings are rare; don't fail the whole response.
        // eslint-disable-next-line no-console
        console.warn('[onchain-listings] V1 scan failed:', err?.shortMessage || err?.message)
        return [] as ActiveListing[]
      }),
    ])
    const active = [...v2Active, ...v1ActiveSettled]

    const payload = {
      source: 'onchain',
      contracts: {
        v2: { nft: NFT_V2, marketplace: MARKETPLACE_EDITIONS, count: v2Active.length },
        v1: { nft: NFT_V1, marketplace: MARKETPLACE_V1, count: v1ActiveSettled.length },
      },
      // Back-compat: keep top-level nftContract/marketplace pointing at V2 since
      // V2 is the active marketplace; older clients only read these two fields.
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
