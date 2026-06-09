import React, { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { MarketplaceDetailModal } from 'components/MarketplaceDetailModal'
import { useStreamLogger } from 'hooks/useStreamLogger'
import { toast } from 'react-toastify'

type PriceToken = 'POL' | 'OGUN' | 'ETH' | 'USDC' | 'USDT' | 'LINK' | 'AVAX'

interface ListingPreview {
  id: string
  tokenId: string
  title?: string
  artist?: string
  coverArtUrl?: string
  audioUrl?: string
  price?: number               // numeric floor price (display units)
  priceToken?: PriceToken      // currency symbol attached to price
  editionSize?: number         // total edition supply (1 for 1/1s)
  editionListed?: number       // how many of the edition are listed for sale
  forSale?: boolean            // active marketplace listing (holographic border)
  version?: 'v1' | 'v2'        // which NFT contract the card lives on
  href?: string
}

// Cards per page in the grid. 120 = exactly 20 rows of 6 (lg) / 24 rows of 5 (md)
// / 30 rows of 4 (sm) / 40 rows of 3 (mobile). Tight enough for mobile to scroll
// through without burning RAM; big enough to feel like a real catalog page.
const PAGE_SIZE = 120

// Compact price formatter — keeps cards tight. 1234.5678 → "1.23K", 0.0042 → "0.004"
function formatPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  if (n >= 1) return n.toFixed(2)
  if (n >= 0.01) return n.toFixed(3)
  return n.toFixed(4)
}

type Source = 'listings' | 'browse' | 'merged' | null
interface SourceCounts {
  listed: number
  minted: number
  mintedTotal: number
  v1Enumerated?: number
  v2Enumerated?: number
}
interface ContractsInfo {
  v1: { address: string; count: number }
  v2: { address: string; count: number }
}

export default function Marketplace() {
  const router = useRouter()
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [source, setSource] = useState<Source>(null)
  const [counts, setCounts] = useState<SourceCounts>({ listed: 0, minted: 0, mintedTotal: 0 })
  const [contracts, setContracts] = useState<ContractsInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sweepMode, setSweepMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingIdRef = useRef<string | null>(null)
  // OGUN streaming reward: every IPFS play >=30s pays the 70/30 split (creator/listener).
  const logger = useStreamLogger({
    onCreatorReward: (r, t) => toast.success(`+${r.toFixed(3)} OGUN \u2192 creator of "${t || 'track'}"`, { autoClose: 3500 }),
    onReward: (r) => toast.success(`+${r.toFixed(3)} OGUN earned for listening`, { autoClose: 3500 }),
  })

  // ── Tab + filter + sort state ─────────────────────────────────────────
  type Tab = 'forSale' | 'minted' | 'all'
  type SortMode = 'newest' | 'priceAsc' | 'priceDesc'
  type VersionFilter = 'all' | 'v1' | 'v2'
  // Default to ALL so users always see content; FOR SALE narrows to active listings.
  const [tab, setTab] = useState<Tab>('all')
  const [tokenFilter, setTokenFilter] = useState<'all' | PriceToken>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [versionFilter, setVersionFilter] = useState<VersionFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Detail modal is driven off the URL `?id=<listingId>` so a card tap stays
  // on `/marketplace` (shallow route) and shared links still deep-link to the
  // same modal. Direct `/marketplace/[id]` page still works as a fallback.
  const detailIdRaw = router.query.id
  const detailId = Array.isArray(detailIdRaw) ? detailIdRaw[0] : detailIdRaw

  function openDetail(id: string) {
    router.push({ pathname: '/marketplace', query: { id } }, undefined, { shallow: true })
  }
  function closeDetail() {
    router.push({ pathname: '/marketplace' }, undefined, { shallow: true })
  }

  // Single shared audio element. Tapping play on a different chip swaps src
  // cleanly; tapping play on the active chip pauses. Stops on unmount. The
  // same audio state threads through the detail modal so playback survives
  // open/close.
  function togglePlay(id: string, audioUrl?: string) {
    if (!audioUrl) return
    if (playingId === id) {
      audioRef.current?.pause()
      playingIdRef.current = null
      setPlayingId(null)
      return
    }
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('ended', () => { playingIdRef.current = null; setPlayingId(null) })
      audioRef.current.addEventListener('timeupdate', () => {
        const a = audioRef.current
        const tid = playingIdRef.current
        if (a && tid && a.currentTime >= 30) logger.logIfQualified(tid, Math.floor(a.currentTime))
      })
    }
    audioRef.current.src = audioUrl
    audioRef.current.play().catch(() => setPlayingId(null))
    playingIdRef.current = id
    setPlayingId(id)
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch SC's merged listings + on-chain ItemListed scanner in parallel.
        // On-chain scanner pulls real listings from Polygon RPC, so even when
        // SC's API has nothing in its listings collection, active on-chain
        // listings still surface as buyable cards.
        // 10k cap is generous headroom — V1 (393) + V2 enumerated (~7K) + indexed (~200) ≈ 7.5K.
        // The API edge-caches the full payload (s-maxage=120) so this is one cold hit per ~2min.
        const [listingsRes, onchainRes] = await Promise.all([
          fetch('/api/marketplace/listings?limit=10000').catch(() => null),
          fetch('/api/marketplace/onchain-listings').catch(() => null),
        ])

        if (!listingsRes || !listingsRes.ok) throw new Error('listings feed offline')
        const data = await listingsRes.json()
        if (cancelled) return

        let merged: ListingPreview[] = Array.isArray(data.listings) ? data.listings : []
        let onchainCount = 0

        if (onchainRes && onchainRes.ok) {
          const onchain = await onchainRes.json()
          const onchainListings: Array<{ owner: string; tokenId: string; quantity: string }> =
            Array.isArray(onchain?.listings) ? onchain.listings : []
          onchainCount = onchainListings.length

          // Mark any merged listing whose tokenId matches an on-chain listing as forSale=true.
          // For on-chain listings not already in the merged feed, add them as raw cards.
          const onchainByToken = new Map<string, { owner: string; quantity: string }>()
          for (const ocl of onchainListings) {
            onchainByToken.set(String(ocl.tokenId), { owner: ocl.owner, quantity: ocl.quantity })
          }

          merged = merged.map((m) => {
            const oc = onchainByToken.get(String(m.tokenId))
            if (oc) return { ...m, forSale: true }
            return m
          })

          // Surface on-chain listings that aren't in the SC index as bare cards
          // (no metadata yet — clicking opens detail modal which hydrates from SC).
          const knownTokenIds = new Set(merged.map((m) => String(m.tokenId)))
          for (const [tokenId, oc] of onchainByToken) {
            if (knownTokenIds.has(tokenId)) continue
            merged.push({
              id: `onchain-${tokenId}`,
              tokenId,
              title: `Token #${tokenId}`,
              artist: `${oc.owner.slice(0, 6)}…${oc.owner.slice(-4)}`,
              forSale: true,
            })
          }
        }

        setListings(merged)
        setSource(data.source || null)
        if (data.counts) {
          setCounts({
            // Override listed count with combined SC-index + on-chain total.
            listed: Math.max(typeof data.counts.listed === 'number' ? data.counts.listed : 0, onchainCount),
            minted: typeof data.counts.minted === 'number' ? data.counts.minted : 0,
            mintedTotal: typeof data.counts.mintedTotal === 'number' ? data.counts.mintedTotal : 0,
            v1Enumerated: typeof data.counts.v1Enumerated === 'number' ? data.counts.v1Enumerated : undefined,
            v2Enumerated: typeof data.counts.v2Enumerated === 'number' ? data.counts.v2Enumerated : undefined,
          })
        }
        if (data.contracts) setContracts(data.contracts as ContractsInfo)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'feed offline')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Sweep-mode is only useful against active listings (forSale cards). Auto-
  // disables when nothing in the merged feed is actually buyable. Sweep taps
  // only register on for-sale cards (the chip ignores selection on browse cards).
  const sweepable = counts.listed > 0
  useEffect(() => {
    if (!sweepable && sweepMode) setSweepMode(false)
  }, [sweepable, sweepMode])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedList = useMemo(
    () => listings.filter((l) => selected.has(l.id)),
    [listings, selected]
  )

  // ── Floor price per token (from FOR-SALE listings only) ───────────────
  const floors = useMemo(() => {
    const map = new Map<PriceToken, number>()
    for (const l of listings) {
      if (!l.forSale || typeof l.price !== 'number' || !l.priceToken) continue
      const cur = map.get(l.priceToken)
      if (cur === undefined || l.price < cur) map.set(l.priceToken, l.price)
    }
    return Array.from(map.entries()) // [['POL', 0.5], ['OGUN', 12], ...]
  }, [listings])

  // ── Filter + sort pipeline ────────────────────────────────────────────
  const filteredListings = useMemo(() => {
    let out = listings.slice()
    if (versionFilter !== 'all') out = out.filter((l) => l.version === versionFilter)
    if (tab === 'forSale') out = out.filter((l) => l.forSale === true)
    else if (tab === 'minted') out = out.filter((l) => l.forSale !== true)
    if (tokenFilter !== 'all') {
      out = out.filter((l) => l.forSale && l.priceToken === tokenFilter)
    }
    if (sortMode === 'priceAsc' || sortMode === 'priceDesc') {
      out = out
        .filter((l) => typeof l.price === 'number' && l.forSale)
        .sort((a, b) => {
          const ap = a.price as number
          const bp = b.price as number
          return sortMode === 'priceAsc' ? ap - bp : bp - ap
        })
    }
    return out
  }, [listings, tab, tokenFilter, sortMode, versionFilter])

  // ── Pagination ────────────────────────────────────────────────────────
  // Slice the filtered set to 120 cards per page. Total pages derive from
  // current filter result, so changing version/tab recomputes page count.
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const pageListings = useMemo(
    () => filteredListings.slice(pageStart, pageEnd),
    [filteredListings, pageStart, pageEnd]
  )

  // Reset to page 1 any time the user changes a filter — otherwise they'd
  // land mid-catalog on the new filter's result set.
  useEffect(() => {
    setCurrentPage(1)
  }, [tab, tokenFilter, sortMode, versionFilter])

  // Per-version counts for the pill labels. Computed across the full listings
  // set, NOT the post-tab-filter set, so the pill counts stay stable as the
  // user toggles FOR SALE / MINTED / ALL.
  const versionCounts = useMemo(() => {
    let v1 = 0
    let v2 = 0
    for (const l of listings) {
      if (l.version === 'v1') v1++
      else if (l.version === 'v2') v2++
    }
    return { v1, v2, all: listings.length }
  }, [listings])

  // Price-sorts only make sense on for-sale items. Reset to newest if user
  // switches off the For-Sale tab while a price sort is active.
  useEffect(() => {
    if (tab !== 'forSale' && (sortMode === 'priceAsc' || sortMode === 'priceDesc')) {
      setSortMode('newest')
    }
    if (tab !== 'forSale' && tokenFilter !== 'all') {
      setTokenFilter('all')
    }
  }, [tab, sortMode, tokenFilter])

  const sourceLabel = source === 'merged'
    ? { tag: 'FOR SALE + MINTED', color: 'text-neon-magenta border-neon-magenta/40' }
    : source === 'listings'
    ? { tag: 'LIVE LISTINGS', color: 'text-neon-mint border-neon-mint/40' }
    : source === 'browse'
    ? { tag: 'BROWSE · MINTED', color: 'text-neon-cyan border-neon-cyan/40' }
    : { tag: 'INDEX', color: 'text-gray-500 border-white/10' }

  return (
    <>
      <Head>
        <title>Marketplace — SoundChain Mint</title>
      </Head>
      <main className="min-h-screen flex flex-col pb-20">
        <nav className="sticky top-0 z-30 px-3 sm:px-5 py-2.5 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-ink-900/75">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-sm bg-neon-cyan shadow-neon-cyan flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-mint-400 via-neon-cyan to-forge-400 bg-clip-text text-transparent truncate">
              SC<span className="text-neon-magenta">/</span>MINT
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            {sweepable && (
              <button
                type="button"
                onClick={() => {
                  setSweepMode((m) => !m)
                  if (sweepMode) setSelected(new Set())
                }}
                className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                  sweepMode
                    ? 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/60'
                    : 'border-white/10 text-gray-400 hover:text-neon-magenta hover:border-neon-magenta/40'
                }`}
                style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
              >
                {sweepMode ? `◤ SWEEPING · ${selected.size}` : '◤ SWEEP'}
              </button>
            )}
            <Link href="/mint" className="btn-neon text-[10px] py-1.5 px-2.5">
              MINT
            </Link>
          </div>
        </nav>

        {/* Header strip — H1 reflects the active tab so the name matches what's
            actually rendering. "MARKETPLACE" implies for-sale; when 0 cards are
            listed and 7K+ are sitting minted, "MINTED CATALOG" reads more
            honest. ALL tab gets the dual label. */}
        <section className="px-3 sm:px-5 py-3 sm:py-4 border-b border-white/5 bg-ink-800/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={`inline-block text-[8px] font-mono uppercase tracking-[0.3em] px-1.5 py-0.5 border ${sourceLabel.color} mb-1.5`}>
                {sourceLabel.tag}
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-none">
                {tab === 'forSale' ? (
                  <>
                    <span className="neon-text-cyan">MARKET</span>
                    <span className="text-white">PLACE</span>
                  </>
                ) : tab === 'minted' ? (
                  <>
                    <span className="neon-text-cyan">MINTED</span>
                    <span className="text-white"> · CATALOG</span>
                  </>
                ) : (
                  <>
                    <span className="neon-text-cyan">MINTED</span>
                    <span className="text-white"> · </span>
                    <span className="neon-text-magenta">MARKET</span>
                  </>
                )}
              </h1>
              {/* Grand total under the H1 — bigger than the stat strip so the
                  full catalog size is unmistakable on mobile. */}
              <div className="mt-1.5 text-[10px] font-mono tabular-nums text-gray-400">
                <span className="text-neon-cyan font-semibold text-xs">
                  {(counts.mintedTotal || versionCounts.all).toLocaleString()}
                </span>
                <span className="text-gray-500"> MINTED ON-CHAIN</span>
                {(counts.v1Enumerated || counts.v2Enumerated) && (
                  <>
                    <span className="text-gray-600"> · </span>
                    <span className="text-neon-mint">V1 {(counts.v1Enumerated || 0).toLocaleString()}</span>
                    <span className="text-gray-600"> + </span>
                    <span className="text-neon-magenta">V2 {(counts.v2Enumerated || 0).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] flex-shrink-0">
              <div className="border-l-2 border-neon-mint/60 pl-2">
                <div className="text-[8px] uppercase tracking-[0.25em] text-gray-500">SALE</div>
                <div className="text-neon-mint tabular-nums">{counts.listed.toString().padStart(2, '0')}</div>
              </div>
              <div className="border-l-2 border-neon-cyan/50 pl-2">
                <div className="text-[8px] uppercase tracking-[0.25em] text-gray-500">MINTED</div>
                <div className="text-neon-cyan tabular-nums">
                  {(counts.mintedTotal || versionCounts.all).toLocaleString()}
                </div>
              </div>
              <div className="border-l-2 border-neon-magenta/50 pl-2">
                <div className="text-[8px] uppercase tracking-[0.25em] text-gray-500">FEE</div>
                <div className="text-neon-magenta">0.05%</div>
              </div>
            </div>
          </div>
        </section>

        {/* V1/V2 version filter — sticky right below the top nav so it stays
            in reach while scrolling deep catalog pages. Counts come from the
            full listings set (not post-tab-filter) so toggling FOR SALE /
            MINTED / ALL doesn't churn the numbers. */}
        <section className="sticky top-[42px] z-20 px-2 sm:px-4 py-2 border-b border-white/5 bg-ink-900/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-gray-500 flex-shrink-0 pl-1">
              VERSION
            </span>
            {/* Active-state classes are hardcoded per pill so Tailwind JIT
                picks them up. Dynamic interpolation like `bg-${accent}/15`
                won't be scanned and the styles never make it into the CSS. */}
            {([
              {
                id: 'all' as const,
                label: 'ALL',
                count: counts.mintedTotal || versionCounts.all,
                activeClass: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/60',
              },
              {
                id: 'v2' as const,
                label: 'V2',
                count: counts.v2Enumerated ?? versionCounts.v2,
                activeClass: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/60',
              },
              {
                id: 'v1' as const,
                label: 'V1',
                count: counts.v1Enumerated ?? versionCounts.v1,
                activeClass: 'bg-neon-mint/15 text-neon-mint border-neon-mint/60',
              },
            ]).map((v) => {
              const active = versionFilter === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVersionFilter(v.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] border transition-colors flex-shrink-0 ${
                    active
                      ? v.activeClass
                      : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200'
                  }`}
                  style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                >
                  <span>{v.label}</span>
                  <span className="tabular-nums opacity-80">{v.count.toLocaleString()}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Tabs + filter pills + sort + floor strip */}
        <section className="px-2 sm:px-4 pt-3 max-w-7xl mx-auto w-full space-y-2">
          {/* Tab row — FOR SALE / MINTED / ALL. Active-state classes hardcoded
              per pill (template-literal `bg-${accent}` doesn't get scanned by
              Tailwind JIT). */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {([
              {
                id: 'forSale' as const,
                label: 'FOR SALE',
                count: counts.listed,
                activeClass: 'bg-neon-mint/15 text-neon-mint border-neon-mint/60',
              },
              {
                id: 'minted' as const,
                label: 'MINTED',
                count: Math.max(0, (counts.mintedTotal || versionCounts.all) - counts.listed),
                activeClass: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/60',
              },
              {
                id: 'all' as const,
                label: 'ALL',
                count: counts.mintedTotal || versionCounts.all,
                activeClass: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/60',
              },
            ]).map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] border transition-colors flex-shrink-0 ${
                    active
                      ? t.activeClass
                      : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200'
                  }`}
                  style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                >
                  <span>{t.label}</span>
                  <span className="tabular-nums opacity-70">{t.count.toLocaleString()}</span>
                </button>
              )
            })}
          </div>

          {/* Token filter + price sort pills — ALWAYS render on the FOR SALE
              tab so the pricing UX is visible even when zero cards are listed
              (the dominant case today: SC NFTs are 1/1s held, not flipped).
              Per-token counts shown inline; tokens with 0 listings render
              faded but stay clickable so the filter dimension is discoverable.
              All 7 SC-supported tokens render; the 24-token cross-chain set
              comes online once those listings start landing. */}
          {tab === 'forSale' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {/* Token filter — count per token from current listings set */}
              <button
                type="button"
                onClick={() => setTokenFilter('all')}
                className={`px-2 py-1 text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                  tokenFilter === 'all'
                    ? 'bg-white/10 text-white border-white/30'
                    : 'border-white/10 text-gray-500 hover:text-gray-200'
                }`}
              >
                ALL
              </button>
              {(['POL', 'OGUN', 'ETH', 'USDC', 'USDT', 'LINK', 'AVAX'] as PriceToken[]).map((tk) => {
                const tkCount = listings.filter((l) => l.forSale && l.priceToken === tk).length
                const active = tokenFilter === tk
                const empty = tkCount === 0
                return (
                  <button
                    key={tk}
                    type="button"
                    onClick={() => setTokenFilter(tk)}
                    className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                      active
                        ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/60'
                        : empty
                        ? 'border-white/5 text-gray-600 hover:text-gray-400'
                        : 'border-white/10 text-gray-300 hover:text-neon-cyan/80 hover:border-neon-cyan/30'
                    }`}
                  >
                    <span>{tk}</span>
                    {tkCount > 0 && (
                      <span className="tabular-nums opacity-80">{tkCount}</span>
                    )}
                  </button>
                )
              })}

              <span className="w-px h-4 bg-white/10 mx-1" aria-hidden />

              {/* Price sort — FLOOR = priceAsc, HIGHEST = priceDesc, NEWEST = createdAt */}
              {([
                { id: 'newest' as SortMode, label: 'NEWEST' },
                { id: 'priceAsc' as SortMode, label: 'FLOOR ↑' },
                { id: 'priceDesc' as SortMode, label: 'HIGHEST ↓' },
              ]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortMode(s.id)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                    sortMode === s.id
                      ? 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/60'
                      : 'border-white/10 text-gray-500 hover:text-neon-magenta/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Floor price strip — only on For-Sale tab when listings exist */}
          {tab === 'forSale' && floors.length > 0 && (
            <div className="flex items-center gap-3 font-mono text-[10px] pt-1">
              <span className="text-[8px] uppercase tracking-[0.3em] text-gray-500">FLOOR</span>
              {floors.map(([tk, p]) => (
                <span key={tk} className="flex items-center gap-1">
                  <span className="text-neon-mint tabular-nums">{formatPrice(p)}</span>
                  <span className="text-gray-500">{tk}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Grid — dense, mobile 3-col, scales to 6-col wide */}
        <section className="px-2 sm:px-4 py-3 sm:py-5 max-w-7xl mx-auto w-full">
          {loading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="relative aspect-[3/4] bg-ink-700/50 border border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="neon-panel neon-panel-magenta hud-corners p-5 text-center mx-2">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neon-magenta mb-1.5">
                ◤ feed offline
              </div>
              <p className="text-xs text-gray-400">{error}</p>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="neon-panel hud-corners p-6 text-center mx-2">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neon-cyan mb-2">
                ◌ no signal
              </div>
              <p className="text-xs text-gray-400 mb-1">No minted NFTs surfaced from the index.</p>
              <p className="text-[10px] font-mono text-gray-500">
                browse on{' '}
                <a href="https://soundchain.io" className="text-neon-cyan hover:underline">soundchain.io</a>
              </p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && filteredListings.length === 0 && (
            <div className="neon-panel hud-corners p-6 text-center mx-2">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neon-mint mb-2">
                ◌ no matches
              </div>
              {tab === 'forSale' && tokenFilter === 'all' ? (
                <>
                  <p className="text-xs text-gray-300 mb-1.5">
                    <span className="text-neon-cyan font-semibold">{counts.mintedTotal.toLocaleString()}</span>
                    {' minted · '}
                    <span className="text-neon-magenta font-semibold">0</span>
                    {' currently for sale.'}
                  </p>
                  <p className="text-[10px] font-mono text-gray-500 mb-2">
                    most SC NFTs are 1/1s — owners hold, don&apos;t flip
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 mb-2">
                  {tab === 'forSale'
                    ? `No ${tokenFilter} listings right now.`
                    : 'Filter returned nothing.'}
                </p>
              )}
              <button
                type="button"
                onClick={() => { setTab('all'); setTokenFilter('all'); setSortMode('newest') }}
                className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan hover:underline"
              >
                ◤ view all {counts.mintedTotal.toLocaleString()} minted
              </button>
            </div>
          )}

          {!loading && !error && filteredListings.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                {pageListings.map((listing) => (
                  <NftChip
                    key={listing.id}
                    listing={listing}
                    selected={selected.has(listing.id)}
                    sweepMode={sweepMode}
                    onSelect={toggleSelect}
                    onOpenDetail={openDetail}
                    isPlaying={playingId === listing.id}
                    onTogglePlay={togglePlay}
                  />
                ))}
              </div>

              {/* Pagination — Prev / Page X of Y / Next + jump input. Shows
                  even on single-page result sets so the count is always visible. */}
              <PaginationControls
                currentPage={safePage}
                totalPages={totalPages}
                pageStart={pageStart + 1}
                pageEnd={Math.min(pageEnd, filteredListings.length)}
                totalItems={filteredListings.length}
                onPageChange={(p) => {
                  setCurrentPage(p)
                  // Snap to top of grid so user sees the first card of the new page.
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
              />
            </>
          )}
        </section>

        {/* Sweep cart bar — fixed bottom, only when items selected */}
        {sweepMode && selectedList.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neon-magenta/40 bg-ink-900/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-magenta">
                  SWEEP CART · {selectedList.length} ITEM{selectedList.length === 1 ? '' : 'S'}
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-gray-400 truncate tabular-nums">
                  {selectedList.slice(0, 4).map((l) => `#${l.tokenId || '?'}`).join(' · ')}
                  {selectedList.length > 4 ? ` +${selectedList.length - 4}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white px-2 py-1.5"
              >
                CLEAR
              </button>
              <button
                type="button"
                disabled
                title="Batch-buy contract call wires up in Phase 4. UI shape is real."
                className="btn-neon text-[10px] py-1.5 px-3"
              >
                ◤ SWEEP {selectedList.length}
              </button>
            </div>
          </div>
        )}

        {/* On-chain transparency footer — every NFT shown above lives in one of
            these two contracts on Polygon mainnet. Click through to verify on
            Polygonscan. */}
        {contracts && (
          <section className="px-3 sm:px-5 py-3 border-t border-white/5 bg-ink-900/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-gray-500 mb-2">
                ◤ ON-CHAIN PROOF · POLYGON 137
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={`https://polygonscan.com/address/${contracts.v1.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-white/10 hover:border-neon-cyan/60 transition-colors p-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest mb-1">
                    <span className="text-neon-cyan">NFT V1 · 2021–2022</span>
                    <span className="text-neon-mint tabular-nums">{contracts.v1.count} MINTS</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 break-all">
                    {contracts.v1.address}
                  </div>
                </a>
                <a
                  href={`https://polygonscan.com/address/${contracts.v2.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-white/10 hover:border-neon-magenta/60 transition-colors p-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest mb-1">
                    <span className="text-neon-magenta">NFT V2 (EDITIONS) · 2023+</span>
                    <span className="text-neon-mint tabular-nums">{contracts.v2.count} MINTS</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 break-all">
                    {contracts.v2.address}
                  </div>
                </a>
              </div>
              <div className="text-[9px] font-mono text-gray-500 mt-2">
                TOTAL ON-CHAIN: <span className="text-neon-cyan tabular-nums">{counts.mintedTotal || counts.minted}</span> · Every mint since 2021 surfaces here.
              </div>
            </div>
          </section>
        )}

        {!sweepMode && (
          <footer className="mt-auto px-3 sm:px-5 py-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">
            <Link href="/" className="hover:text-neon-cyan transition-colors">← HOME</Link>
            <span>// MARKET.IDX</span>
          </footer>
        )}

        {detailId && (
          <MarketplaceDetailModal
            id={detailId}
            onClose={closeDetail}
            isPlaying={playingId === detailId}
            onTogglePlay={togglePlay}
          />
        )}
      </main>
    </>
  )
}

function NftChip({
  listing,
  selected,
  sweepMode,
  onSelect,
  onOpenDetail,
  isPlaying,
  onTogglePlay,
}: {
  listing: ListingPreview
  selected: boolean
  sweepMode: boolean
  onSelect: (id: string) => void
  onOpenDetail: (id: string) => void
  isPlaying: boolean
  onTogglePlay: (id: string, audioUrl?: string) => void
}) {
  const hasAudio = !!listing.audioUrl
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onTogglePlay(listing.id, listing.audioUrl)
  }
  const isForSale = listing.forSale === true
  const baseClass = `relative aspect-[3/4] overflow-hidden border bg-ink-800/60 group transition-all duration-150 active:scale-[0.98] ${
    selected
      ? 'border-neon-magenta shadow-neon-magenta'
      : isForSale
      ? 'holo-listed'
      : 'border-white/8 hover:border-neon-cyan/60'
  }`

  const inner = (
    <>
      <div className="relative w-full aspect-square overflow-hidden bg-ink-700">
        {listing.coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverArtUrl}
            alt={listing.title || ''}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-gray-600">
            NO ASSET
          </div>
        )}
        {/* Token ID — micro pill, top-left */}
        <div className="absolute top-1 left-1 px-1 py-[1px] bg-ink-900/90 text-[8px] font-mono tracking-wide text-neon-cyan/90 leading-none">
          #{listing.tokenId || '?'}
        </div>
        {/* Selection check — sweep mode only */}
        {sweepMode && (
          <div
            className={`absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold border ${
              selected
                ? 'bg-neon-magenta text-black border-neon-magenta'
                : 'bg-ink-900/80 text-transparent border-white/30'
            }`}
            style={{ clipPath: 'polygon(3px 0,100% 0,100% calc(100% - 3px),calc(100% - 3px) 100%,0 100%,0 3px)' }}
          >
            ✓
          </div>
        )}
        {/* Inline play button — only when card has audio and we're not in sweep mode */}
        {hasAudio && !sweepMode && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={`absolute bottom-1 right-1 w-7 h-7 flex items-center justify-center text-xs font-bold border transition-all ${
              isPlaying
                ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan'
                : 'bg-ink-900/85 text-neon-cyan border-neon-cyan/60 hover:bg-neon-cyan hover:text-black'
            }`}
            style={{ clipPath: 'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)' }}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        )}
        {/* Audio-active pulse ring on card border when playing */}
        {isPlaying && (
          <div className="absolute inset-0 border-2 border-neon-cyan animate-pulse pointer-events-none" />
        )}
      </div>
      <div className="px-1.5 py-1 flex-1 flex flex-col justify-between gap-0.5">
        <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate leading-tight">
          {listing.title || `Token #${listing.tokenId}`}
        </div>
        <div className="text-[9px] text-gray-500 truncate leading-tight">
          {listing.artist || '—'}
        </div>
        {/* Price + edition fraction strip — always renders so cards have a consistent shape */}
        <div className="flex items-center justify-between gap-1 mt-0.5 font-mono leading-none">
          {/* Price (when set) — token symbol always attached */}
          {listing.price != null && listing.priceToken ? (
            <span className="text-[10px] text-neon-cyan tracking-wide tabular-nums truncate">
              {formatPrice(listing.price)} <span className="text-[8px] text-neon-cyan/70">{listing.priceToken}</span>
            </span>
          ) : (
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">—</span>
          )}
          {/* Edition fraction — X/N. Editions of 1 render as "1/1" so the
              card shape stays consistent across 1/1s and multi-editions. */}
          {listing.editionSize != null && (
            <span className={`text-[9px] tabular-nums flex-shrink-0 ${
              listing.editionSize > 1 ? 'text-neon-magenta' : 'text-gray-500'
            }`}>
              {listing.editionListed != null && listing.editionListed > 0
                ? `${listing.editionListed}/${listing.editionSize}`
                : `1/${listing.editionSize}`}
            </span>
          )}
        </div>
      </div>
    </>
  )

  return (
    <button
      type="button"
      onClick={() => {
        if (sweepMode && isForSale) onSelect(listing.id)
        else onOpenDetail(listing.id)
      }}
      className={`${baseClass} flex flex-col text-left`}
    >
      {inner}
    </button>
  )
}

// Pagination controls — Prev / Page X of Y / Next + jump-to-page input.
// Renders as a sticky-feeling bar under the grid with a "Showing X-Y of Z"
// position indicator so the user always knows where they are in the catalog.
function PaginationControls({
  currentPage,
  totalPages,
  pageStart,
  pageEnd,
  totalItems,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  pageStart: number
  pageEnd: number
  totalItems: number
  onPageChange: (p: number) => void
}) {
  const [jumpValue, setJumpValue] = useState<string>('')

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(jumpValue, 10)
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
      onPageChange(n)
      setJumpValue('')
    }
  }

  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 sm:mt-6 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2"
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 tabular-nums">
        Showing{' '}
        <span className="text-neon-cyan">{pageStart.toLocaleString()}</span>–
        <span className="text-neon-cyan">{pageEnd.toLocaleString()}</span>{' '}
        of{' '}
        <span className="text-neon-mint">{totalItems.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] border transition-colors ${
            canPrev
              ? 'border-white/15 text-gray-300 hover:border-neon-cyan/60 hover:text-neon-cyan'
              : 'border-white/5 text-gray-700 cursor-not-allowed'
          }`}
          style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
        >
          ← PREV
        </button>

        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] border border-neon-magenta/60 bg-neon-magenta/10 text-neon-magenta tabular-nums">
          {currentPage} / {totalPages}
        </div>

        <button
          type="button"
          onClick={() => canNext && onPageChange(currentPage + 1)}
          disabled={!canNext}
          className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] border transition-colors ${
            canNext
              ? 'border-white/15 text-gray-300 hover:border-neon-cyan/60 hover:text-neon-cyan'
              : 'border-white/5 text-gray-700 cursor-not-allowed'
          }`}
          style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
        >
          NEXT →
        </button>

        {totalPages > 5 && (
          <form onSubmit={handleJump} className="hidden sm:flex items-center gap-1.5 ml-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder="JUMP"
              className="w-16 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest tabular-nums bg-ink-800 border border-white/10 text-white placeholder:text-gray-600 focus:border-neon-cyan/60 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-white/15 text-gray-400 hover:border-neon-cyan/60 hover:text-neon-cyan"
            >
              GO
            </button>
          </form>
        )}
      </div>
    </nav>
  )
}
