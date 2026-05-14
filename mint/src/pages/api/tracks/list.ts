/**
 * GET /api/tracks/list?trackId=<id>
 *
 * Resolves marketplace card metadata for the detail modal. Three id shapes:
 *
 *   - Mongo ObjectId (e.g. `66beca8faf84580008c5c22f`) → proxy to soundchain.io
 *     which returns the full SC-indexed Track row (title/artist/artwork/playback).
 *   - `v1-<tokenId>` (V1 ERC-721, 393 frozen 2021-2022 mints) → on-chain hydration
 *     via `tokenURI(tokenId)` on the V1 NFT contract → IPFS metadata fetch.
 *   - `v2-<tokenId>` (V2 Editions, 7785+ mints) → same pattern on V2 NFT contract.
 *
 * The v1-catalog/v2-catalog endpoints surface placeholder cards with synthetic
 * ids that don't exist in SC's GraphQL. Without on-chain hydration here, the
 * detail modal falls to "missing" state for every placeholder tap. With it,
 * legacy NFTs and unindexed V2 mints render real metadata on demand.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, http, parseAbi } from 'viem'
import { polygon } from 'viem/chains'
import { CONTRACTS } from 'lib/contracts'

const SC_BASE = 'https://soundchain.io'
const IPFS_GATEWAY = 'https://soundchain.mypinata.cloud/ipfs/'

const NFT_V1 = '0x01E2ae47222B23EE1887c5b863FA36Af580E8A5c' as const

// ERC-721 standard tokenURI — V1 and V2 both expose it.
const TOKEN_URI_ABI = parseAbi([
  'function tokenURI(uint256 tokenId) view returns (string)',
] as const)

// Same RPC fallback pool used by v1-catalog + onchain-listings — public endpoints
// rate-limit Vercel serverless IPs aggressively. One read per request usually
// only needs the first endpoint, fallbacks are insurance.
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

// Normalize ipfs:// URIs + path-style gateway URLs to a single canonical gateway.
function ipfsToHttp(uri: string): string {
  if (!uri) return uri
  if (uri.startsWith('ipfs://')) return `${IPFS_GATEWAY}${uri.slice(7)}`
  // Some legacy URIs use ipfs:/ (single slash) — handle that too.
  if (uri.startsWith('ipfs:/')) return `${IPFS_GATEWAY}${uri.slice(6)}`
  return uri
}

// In-memory cache for resolved on-chain metadata. tokenURI rarely changes once
// minted (and IPFS-pinned content is immutable), so 24h is safe and saves an
// RPC + IPFS round-trip on the hot path. Resets on cold start.
const META_CACHE = new Map<string, { ts: number; data: any }>()
const META_TTL_MS = 24 * 60 * 60 * 1000

async function hydrateOnchain(
  id: string,
  contract: `0x${string}`,
  tokenId: string,
  contractLabel: 'V1' | 'V2',
) {
  const cached = META_CACHE.get(id)
  if (cached && Date.now() - cached.ts < META_TTL_MS) return cached.data

  const tokenUri = await withRpcFailover((c) =>
    c.readContract({
      address: contract,
      abi: TOKEN_URI_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    }),
  )

  if (!tokenUri || typeof tokenUri !== 'string') {
    throw new Error(`empty tokenURI for ${id}`)
  }

  const httpUri = ipfsToHttp(tokenUri)
  const metaRes = await fetch(httpUri, {
    headers: { Accept: 'application/json' },
    // Pinata gateway is usually <1s but can spike on cold cache misses.
    signal: AbortSignal.timeout(12000),
  })
  if (!metaRes.ok) {
    throw new Error(`metadata fetch ${metaRes.status} for ${id}`)
  }
  const meta = await metaRes.json()

  // Map the IPFS metadata shape (loosely OpenSea-ish) onto the BrowseTrack
  // shape the modal expects. Different mints used slightly different field
  // names over the years — defensive lookup covers the common variants.
  const artist = meta.artist || meta.creator || meta.attributes?.find?.((a: any) => /artist|creator/i.test(a?.trait_type))?.value
  const track = {
    id,
    title: meta.name || meta.title || `${contractLabel} NFT #${tokenId}`,
    artist: artist || `SoundChain · ${contractLabel}`,
    // V1's 2021-2022 metadata uses `art` (cover) + `asset` (audio); V2 and most
    // OpenSea-shaped formats use `image` + `animation_url`. Both branches are
    // covered so the same code path renders for either era of mint.
    artworkUrl: ipfsToHttp(meta.image || meta.cover_image || meta.coverArtUrl || meta.art || ''),
    playbackUrl: ipfsToHttp(meta.animation_url || meta.audio || meta.audioUrl || meta.playbackUrl || meta.asset || ''),
    description: meta.description || '',
    nftData: {
      tokenId,
      contract,
    },
  }

  META_CACHE.set(id, { ts: Date.now(), data: { track } })
  return { track }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  const trackId = String(req.query.trackId || '').trim()
  if (!trackId) {
    return res.status(400).json({ error: 'trackId required' })
  }

  // On-chain hydration paths for placeholder cards from v1-catalog / v2-catalog.
  const v1Match = trackId.match(/^v1-(\d+)$/)
  if (v1Match) {
    try {
      const data = await hydrateOnchain(trackId, NFT_V1, v1Match[1], 'V1')
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'V1 hydration failed' })
    }
  }

  const v2Match = trackId.match(/^v2-(\d+)$/)
  if (v2Match) {
    try {
      const data = await hydrateOnchain(trackId, CONTRACTS.NFT_EDITIONS as `0x${string}`, v2Match[1], 'V2')
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'V2 hydration failed' })
    }
  }

  // Default path — proxy SC-indexed Track ids to soundchain.io.
  try {
    const upstream = await fetch(`${SC_BASE}/api/tracks/list?trackId=${encodeURIComponent(trackId)}`, {
      headers: { Accept: 'application/json' },
    })

    const ct = upstream.headers.get('content-type') || ''
    if (!upstream.ok || !ct.includes('application/json')) {
      return res.status(upstream.status === 200 ? 502 : upstream.status).json({
        error: 'Upstream did not return JSON',
        status: upstream.status,
      })
    }

    const data = await upstream.json()
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'proxy failed' })
  }
}
