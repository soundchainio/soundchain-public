/**
 * GET /api/marketplace/v1-catalog
 *
 * Enumerates ALL minted NFTs from the legacy V1 ERC-721 contract on Polygon.
 * V1 was the 2021-2022 SoundChain NFT contract — 393 mints total, frozen since
 * V2 (Editions) launched in 2023.
 *
 * Why this endpoint exists: SC's main GraphQL `exploreTracks` only indexes
 * tracks that have a `Track` row in MongoDB. Many legacy V1 mints never got
 * Track rows (or had stale ones, or had `nftData` not populated), so the
 * mint marketplace's "browse" feed only surfaced ~201 NFTs out of 8178 on-chain.
 * V1's 393 mints were nearly invisible.
 *
 * Strategy:
 *   1. Read `totalSupply()` on V1 contract → 393
 *   2. Multicall `tokenByIndex(i)` for i=0..392 → list of every minted tokenId
 *   3. Return placeholder cards (tokenId + contract reference). Detail-page
 *      hydration handles per-token metadata (tokenURI → IPFS) on demand.
 *
 * V1 contract is FROZEN — no new mints, no burns expected — so this catalog
 * is cached in module memory for 24h. First request after a cold start does
 * the enumeration (~3s with Multicall3); all subsequent requests serve cache.
 *
 * V2 enumeration is intentionally NOT in this endpoint. V2 has no
 * `tokenByIndex` (not ERC-721 Enumerable), 7785+ tokens, and is still being
 * minted — a different indexing strategy is needed (separate ship).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, http, parseAbi } from 'viem'
import { polygon } from 'viem/chains'

const NFT_V1 = '0x01E2ae47222B23EE1887c5b863FA36Af580E8A5c' as const

// ERC-721 Enumerable ABI fragments — only the reads we need.
const V1_ABI = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function tokenByIndex(uint256 index) view returns (uint256)',
] as const)

// Same RPC fallback pool as onchain-listings.ts — public endpoints rate-limit
// Vercel serverless IPs aggressively. Multicall is far cheaper than eth_getLogs
// so we usually only need the first endpoint, but the fallbacks are insurance.
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
    transport: http(rpcUrl, { timeout: 8000, retryCount: 0, batch: { batchSize: 100 } }),
    batch: { multicall: true },
  })
}

async function withRpcFailover<T>(op: (c: ReturnType<typeof makeClient>) => Promise<T>): Promise<T> {
  let lastErr: any = null
  for (let i = 0; i < RPC_FALLBACKS.length; i++) {
    try {
      const c = makeClient(RPC_FALLBACKS[i])
      return await op(c)
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message || err?.shortMessage || '').toLowerCase()
      const transport = /http|timeout|fetch|network|rate|429|503|502|socket|econnreset/i.test(msg)
      if (!transport) throw err
    }
  }
  throw lastErr || new Error('all RPC fallbacks failed')
}

export interface V1CatalogEntry {
  tokenId: string
  index: number
}

// 24h module cache. V1 is frozen — totalSupply never changes — so we only
// invalidate when the process restarts (next deploy / serverless cold start).
let cache: { ts: number; data: { tokenIds: string[]; totalSupply: number } } | null = null
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

async function enumerateV1Catalog(): Promise<{ tokenIds: string[]; totalSupply: number }> {
  const supply = await withRpcFailover((c) =>
    c.readContract({
      address: NFT_V1,
      abi: V1_ABI,
      functionName: 'totalSupply',
    }),
  )
  const total = Number(supply)

  if (total === 0) return { tokenIds: [], totalSupply: 0 }

  // Build calls to tokenByIndex(0..total-1). viem's multicall packs these into
  // a single Multicall3 aggregate3 transaction — typically 50-100 reads per
  // network round-trip, so 393 tokens = ~4-8 round-trips.
  const calls = Array.from({ length: total }, (_, i) => ({
    address: NFT_V1,
    abi: V1_ABI,
    functionName: 'tokenByIndex' as const,
    args: [BigInt(i)] as const,
  }))

  const results = await withRpcFailover((c) =>
    c.multicall({
      contracts: calls,
      allowFailure: true,
      // Cap each multicall batch to 100 calls so a single batch failure doesn't
      // blow up the whole enumeration — viem handles chunking + retry.
      batchSize: 100,
    }),
  )

  // Some indexes may revert (shouldn't, but allowFailure: true defends against
  // contract weirdness). Skip those quietly — Frank's catalog gets whatever
  // V1 actually exposes through enumeration.
  const tokenIds: string[] = []
  for (const r of results) {
    if (r.status === 'success' && r.result != null) {
      tokenIds.push(String(r.result))
    }
  }

  return { tokenIds, totalSupply: total }
}

export async function getV1Catalog(): Promise<{ tokenIds: string[]; totalSupply: number; cached: boolean }> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return { ...cache.data, cached: true }
  }
  const fresh = await enumerateV1Catalog()
  cache = { ts: Date.now(), data: fresh }
  return { ...fresh, cached: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const { tokenIds, totalSupply, cached } = await getV1Catalog()

    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS')
    // 1h edge cache + 24h SWR — V1 is frozen so this is generous. Cold starts
    // pay ~3s; warm clients pay near-zero.
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    return res.status(200).json({
      source: 'onchain-enumerable',
      nftContract: NFT_V1,
      totalSupply,
      count: tokenIds.length,
      tokenIds,
    })
  } catch (err: any) {
    // Stale-while-error
    if (cache) {
      res.setHeader('X-Cache', 'STALE-ERROR')
      return res.status(200).json({
        source: 'onchain-enumerable',
        nftContract: NFT_V1,
        totalSupply: cache.data.totalSupply,
        count: cache.data.tokenIds.length,
        tokenIds: cache.data.tokenIds,
        stale: true,
      })
    }
    return res.status(502).json({ error: err?.shortMessage || err?.message || 'enumeration failed' })
  }
}
