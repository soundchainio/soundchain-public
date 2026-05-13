/**
 * GET /api/marketplace/v2-catalog
 *
 * Enumerates ALL minted V2 Editions NFTs by probing `ownerOf(tokenId)` across
 * the dense [0..totalSupply+buffer] tokenId range via viem Multicall3.
 *
 * Why this works for V2 (and why V1 needed a different approach):
 *   - V2 Editions is NOT ERC-721 Enumerable (no `tokenByIndex`).
 *   - V2 mints sequentially via `safeMintToEditionQuantity` which uses ERC-2309
 *     `ConsecutiveTransfer` batch mints. Result: tokenIds are dense in
 *     [0..max_tokenId] — verified live (probe found 0, 1, 2, 100, 1000, 5000,
 *     7000, 7700, 7785, 7786 all OWNED; 7787+ REVERT).
 *   - `totalSupply()` reports a count that may slightly understate the actual
 *     ceiling (observed off-by-2 — likely due to genesis tokens or burn
 *     accounting). Probe `0..(totalSupply + 10)` with `allowFailure: true` to
 *     find the real ceiling and drop any reverts.
 *
 * Why not scan ConsecutiveTransfer events instead:
 *   - V2 contract was deployed ~2023, ~50M Polygon blocks of history.
 *   - eth_getLogs has a 10k-block cap → 5000 chunks → exceeds Vercel timeout
 *     by an order of magnitude.
 *   - Multicall ownerOf probe is bounded by N (~7787 calls = ~78 Multicall3
 *     round-trips at batchSize 100), completes in 10-20s cold and serves from
 *     module cache thereafter.
 *
 * Cache: 1h module memory (V2 is still actively being minted, shorter TTL than
 * V1's 24h). New mints land in cache within the hour. Stale-while-error.
 *
 * V2 placeholder cards (rendered downstream in listings.ts) read:
 *   title: 'V2 NFT #${tokenId}', artist: 'SoundChain · V2 (2023+)'
 * Detail-page hydration handles per-token metadata (tokenURI → IPFS) on click.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, http, parseAbi } from 'viem'
import { polygon } from 'viem/chains'

// 7800+ ownerOf reads through Multicall typically completes in 10-20s on a
// cold cache. Default Vercel serverless timeout is 10s — bump for this route
// so the first request after deploy doesn't time out before the cache primes.
export const config = {
  // Two-pass enumeration (initial parallel sweep + retry for misses) hits
  // ~25-40s on cold start across ~7800 tokens. 90s gives generous headroom
  // when public RPCs are extra throttled.
  maxDuration: 90,
}

const NFT_V2 = '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0' as const

const V2_ABI = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
] as const)

// Probe buffer above totalSupply — accounts for V2's off-by-N accounting
// (verified live: supply=7785 but ownerOf(7786) succeeds). 10 is generous.
const CEILING_BUFFER = 10

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

// 1h module cache. V2 is still being minted so we refresh more often than V1's
// 24h cache. Module memory survives until next Vercel cold start or 1h elapsed.
let cache: { ts: number; data: { tokenIds: string[]; totalSupply: number; observedCeiling: number } } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1h

// Chunk size for each Multicall3 RPC call. Smaller chunks survive public-RPC
// throttling better — a single failed chunk only loses CHUNK_SIZE tokens, not
// 100. Each chunk gets its own RPC failover loop, so a throttled RPC swaps to
// the next fallback transparently.
const CHUNK_SIZE = 50

// Max chunks to run in parallel. Higher = faster but more RPC pressure.
// 4 keeps total concurrent eth_call pressure reasonable across all fallbacks.
const PARALLEL_CHUNKS = 4

async function probeChunk(startId: number, count: number): Promise<Array<{ tokenId: number; success: boolean }>> {
  const calls = Array.from({ length: count }, (_, i) => ({
    address: NFT_V2,
    abi: V2_ABI,
    functionName: 'ownerOf' as const,
    args: [BigInt(startId + i)] as const,
  }))

  try {
    const results = await withRpcFailover((c) =>
      c.multicall({
        contracts: calls,
        allowFailure: true,
        batchSize: CHUNK_SIZE,
      }),
    )
    return results.map((r, i) => ({ tokenId: startId + i, success: r.status === 'success' }))
  } catch {
    // Entire chunk failed across all RPC fallbacks — mark all as failures.
    // Caller can retry these specific tokenIds in a second pass if needed.
    return calls.map((_, i) => ({ tokenId: startId + i, success: false }))
  }
}

async function enumerateV2Catalog(): Promise<{ tokenIds: string[]; totalSupply: number; observedCeiling: number }> {
  const supply = await withRpcFailover((c) =>
    c.readContract({
      address: NFT_V2,
      abi: V2_ABI,
      functionName: 'totalSupply',
    }),
  )
  const total = Number(supply)
  if (total === 0) return { tokenIds: [], totalSupply: 0, observedCeiling: 0 }

  // Probe 0..(total + buffer). V2 verified-dense in this range; reverts past
  // the actual ceiling get filtered out via allowFailure.
  const probeCeiling = total + CEILING_BUFFER
  const totalCalls = probeCeiling + 1

  // Build chunk plan.
  const chunkStarts: number[] = []
  for (let start = 0; start < totalCalls; start += CHUNK_SIZE) {
    chunkStarts.push(start)
  }

  // Run chunks PARALLEL_CHUNKS at a time. Each chunk has independent RPC
  // failover, so a throttled RPC on chunk N doesn't affect chunks N+1..M.
  const successMap = new Set<number>()
  for (let i = 0; i < chunkStarts.length; i += PARALLEL_CHUNKS) {
    const wave = chunkStarts.slice(i, i + PARALLEL_CHUNKS)
    const waveResults = await Promise.all(
      wave.map((start) => probeChunk(start, Math.min(CHUNK_SIZE, totalCalls - start))),
    )
    for (const chunkResult of waveResults) {
      for (const { tokenId, success } of chunkResult) {
        if (success) successMap.add(tokenId)
      }
    }
  }

  // Second pass: retry any tokenIds in [0..total-1] that failed first pass.
  // We know these SHOULD exist (totalSupply confirms them). Reverts past the
  // ceiling are expected; failures before the ceiling are RPC throttling.
  const missingIds: number[] = []
  for (let i = 0; i < total; i++) {
    if (!successMap.has(i)) missingIds.push(i)
  }

  if (missingIds.length > 0 && missingIds.length < total) {
    // Group missing IDs into chunks. We do contiguous-ID chunks per retry batch
    // — most misses cluster (single failed batch = 50 sequential IDs) so this
    // packs well into Multicall3 aggregations.
    const retryChunks: number[][] = []
    for (let i = 0; i < missingIds.length; i += CHUNK_SIZE) {
      retryChunks.push(missingIds.slice(i, i + CHUNK_SIZE))
    }
    for (let i = 0; i < retryChunks.length; i += PARALLEL_CHUNKS) {
      const wave = retryChunks.slice(i, i + PARALLEL_CHUNKS)
      const waveResults = await Promise.all(
        wave.map(async (idList) => {
          const calls = idList.map((id) => ({
            address: NFT_V2,
            abi: V2_ABI,
            functionName: 'ownerOf' as const,
            args: [BigInt(id)] as const,
          }))
          try {
            const res = await withRpcFailover((c) =>
              c.multicall({ contracts: calls, allowFailure: true, batchSize: CHUNK_SIZE }),
            )
            return idList.map((id, idx) => ({ tokenId: id, success: res[idx].status === 'success' }))
          } catch {
            return idList.map((id) => ({ tokenId: id, success: false }))
          }
        }),
      )
      for (const chunkResult of waveResults) {
        for (const { tokenId, success } of chunkResult) {
          if (success) successMap.add(tokenId)
        }
      }
    }
  }

  // Materialize sorted tokenId list + find observed ceiling.
  const tokenIds: string[] = []
  let highestSuccess = 0
  const sortedIds = Array.from(successMap).sort((a, b) => a - b)
  for (const id of sortedIds) {
    tokenIds.push(String(id))
    if (id > highestSuccess) highestSuccess = id
  }

  return { tokenIds, totalSupply: total, observedCeiling: highestSuccess }
}

export async function getV2Catalog(): Promise<{
  tokenIds: string[]
  totalSupply: number
  observedCeiling: number
  cached: boolean
}> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return { ...cache.data, cached: true }
  }
  const fresh = await enumerateV2Catalog()
  cache = { ts: Date.now(), data: fresh }
  return { ...fresh, cached: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const { tokenIds, totalSupply, observedCeiling, cached } = await getV2Catalog()

    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS')
    // 30 min edge cache + 1h SWR. Cold start expensive (~10-20s),
    // edge cache shields most clients.
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600')
    return res.status(200).json({
      source: 'sequential-probe',
      nftContract: NFT_V2,
      totalSupply,
      observedCeiling,
      count: tokenIds.length,
      cached,
      tokenIds,
    })
  } catch (err: any) {
    // Stale-while-error
    if (cache) {
      res.setHeader('X-Cache', 'STALE-ERROR')
      return res.status(200).json({
        source: 'sequential-probe',
        nftContract: NFT_V2,
        totalSupply: cache.data.totalSupply,
        observedCeiling: cache.data.observedCeiling,
        count: cache.data.tokenIds.length,
        tokenIds: cache.data.tokenIds,
        stale: true,
      })
    }
    return res.status(502).json({ error: err?.shortMessage || err?.message || 'enumeration failed' })
  }
}
