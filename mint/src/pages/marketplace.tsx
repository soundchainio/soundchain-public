import React, { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface ListingPreview {
  id: string
  tokenId: string
  title?: string
  artist?: string
  coverArtUrl?: string
  audioUrl?: string
  priceLabel?: string
  priceWei?: string         // when sourced from active listings (POL or OGUN units)
  priceToken?: 'POL' | 'OGUN' | 'EDITION'
  href?: string
}

type Source = 'listings' | 'browse' | null

export default function Marketplace() {
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [source, setSource] = useState<Source>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sweepMode, setSweepMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Single shared audio element. Tapping play on a different chip swaps src
  // cleanly; tapping play on the active chip pauses. Stops on unmount.
  function togglePlay(id: string, audioUrl?: string) {
    if (!audioUrl) return
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('ended', () => setPlayingId(null))
    }
    audioRef.current.src = audioUrl
    audioRef.current.play().catch(() => setPlayingId(null))
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
        const res = await fetch('/api/marketplace/listings?limit=40')
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setListings(Array.isArray(data.listings) ? data.listings : [])
        setSource(data.source || null)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'feed offline')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Sweep-mode is only useful against active on-chain listings — browse-mode
  // cards link out to soundchain.io and have no priceWei to aggregate. Auto-
  // disable sweep when there's nothing buyable here.
  const sweepable = source === 'listings'
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

  const sourceLabel = source === 'listings'
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

        {/* Header strip — compact, single-row on mobile */}
        <section className="px-3 sm:px-5 py-3 sm:py-4 border-b border-white/5 bg-ink-800/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={`inline-block text-[8px] font-mono uppercase tracking-[0.3em] px-1.5 py-0.5 border ${sourceLabel.color} mb-1.5`}>
                {sourceLabel.tag}
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-none">
                <span className="neon-text-cyan">MARKET</span>
                <span className="text-white">PLACE</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] flex-shrink-0">
              <div className="border-l-2 border-neon-cyan/50 pl-2">
                <div className="text-[8px] uppercase tracking-[0.25em] text-gray-500">N</div>
                <div className="text-neon-cyan tabular-nums">{listings.length.toString().padStart(2, '0')}</div>
              </div>
              <div className="border-l-2 border-neon-magenta/50 pl-2">
                <div className="text-[8px] uppercase tracking-[0.25em] text-gray-500">FEE</div>
                <div className="text-neon-magenta">0.05%</div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid — dense blur.io-style, mobile 3-col, scales to 6-col wide */}
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

          {!loading && !error && listings.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {listings.map((listing) => (
                <NftChip
                  key={listing.id}
                  listing={listing}
                  selected={selected.has(listing.id)}
                  sweepMode={sweepMode}
                  onSelect={toggleSelect}
                  isPlaying={playingId === listing.id}
                  onTogglePlay={togglePlay}
                />
              ))}
            </div>
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

        {!sweepMode && (
          <footer className="mt-auto px-3 sm:px-5 py-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">
            <Link href="/" className="hover:text-neon-cyan transition-colors">← HOME</Link>
            <span>// MARKET.IDX</span>
          </footer>
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
  isPlaying,
  onTogglePlay,
}: {
  listing: ListingPreview
  selected: boolean
  sweepMode: boolean
  onSelect: (id: string) => void
  isPlaying: boolean
  onTogglePlay: (id: string, audioUrl?: string) => void
}) {
  const hasAudio = !!listing.audioUrl
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onTogglePlay(listing.id, listing.audioUrl)
  }
  const isExternal = (listing.href || '').startsWith('http')
  const baseClass = `relative aspect-[3/4] overflow-hidden border bg-ink-800/60 group transition-all duration-150 active:scale-[0.98] ${
    selected
      ? 'border-neon-magenta shadow-neon-magenta'
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
        {isExternal && !sweepMode && (
          <div className="absolute top-1 right-1 px-1 py-[1px] bg-ink-900/90 text-[8px] font-mono tracking-wide text-neon-magenta/90 leading-none">
            ↗
          </div>
        )}
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
      <div className="px-1.5 py-1 flex-1 flex flex-col justify-between">
        <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate leading-tight">
          {listing.title || `Token #${listing.tokenId}`}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-[9px] text-gray-500 truncate flex-1 leading-tight">
            {listing.artist || '—'}
          </span>
          {listing.priceLabel && (
            <span className="text-[9px] font-mono text-neon-cyan tracking-wide leading-tight flex-shrink-0">
              {listing.priceLabel.length > 12 ? listing.priceLabel.slice(0, 12) : listing.priceLabel}
            </span>
          )}
        </div>
      </div>
    </>
  )

  if (sweepMode) {
    return (
      <button
        type="button"
        onClick={() => onSelect(listing.id)}
        className={`${baseClass} flex flex-col text-left`}
      >
        {inner}
      </button>
    )
  }

  if (isExternal) {
    return (
      <a
        href={listing.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} flex flex-col`}
      >
        {inner}
      </a>
    )
  }

  return (
    <Link href={listing.href || `/marketplace/${listing.id}`} className={`${baseClass} flex flex-col`}>
      {inner}
    </Link>
  )
}
