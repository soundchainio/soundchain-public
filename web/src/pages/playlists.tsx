/**
 * /playlists — PLAYLISTS BAY: the candy-shop window-shopping surface.
 *
 * Design lineage = the SoundChain Starship deck framework (Fable5 DNA): same
 * grammar as /nodes (Flight Deck) + /deck (Deck Map) — StarshipBay console
 * walls, sc-mfd panels, mono stencil labels, neon deck accents. Layout is
 * EYE-CANDY FIRST: horizontal snap-scroll RAILS of big cover-art cards (so
 * mobile lands like a record-shop window — swipe sideways, almost no vertical
 * scroll), not a text-heavy grid. Cards get a battery-safe CSS-3D tilt
 * (GPU-composited transforms only, desktop hover; static on coarse-pointer +
 * prefers-reduced-motion → no rAF/WebGL, keeps older iPhones cool).
 *
 * Data: one Vercel-direct fetch GET /api/playlists/list?scope=global&sort=played
 * then rails are derived client-side (Most Played / Fresh Drops / Biggest / by
 * genre). Tap a card → /dex/playlist/<id> (the live player).
 *
 * SCRAPER (the "Build" station): paste Spotify / YouTube / SoundCloud / Bandcamp
 * playlist links → POST /api/playlists/import-build → re-sources every song to a
 * PLAYABLE platform (YouTube native; SoundCloud + Bandcamp play natively;
 * Spotify is catalog-only → re-matched to YouTube) and builds one SC playlist.
 * The textarea is UNCONTROLLED (ref-read at submit) so mobile paste/autofill can
 * never desync state — the old "paste a link first on a filled box" bug.
 */
import { ReactElement, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { DexNavBar } from 'components/DexNavBar'
import MainPillNav from 'components/MainPillNav'
import { ListMusic, Play, Flame, Clock, Layers, Wand2, Loader2, CheckCircle2, Sparkles } from 'lucide-react'

const StarshipBay = dynamic(() => import('components/starship/StarshipBay'), { ssr: false })

type PlaylistNode = {
  id: string
  title: string
  description: string
  coverImage: string | null
  trackCount: number
  totalPlays: number
  genres: string[]
  profileId: string | null
  creatorName: string
  creatorHandle: string
  creatorAvatar: string | null
  createdAt: string | null
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

type ScrapeResult = { platform: string; total: number; tracks: Array<{ title: string; url: string; thumbnail: string | null }> }

export default function PlaylistsExplorePage() {
  const router = useRouter()
  const [nodes, setNodes] = useState<PlaylistNode[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Scraper — UNCONTROLLED inputs (refs) so a background re-render can't wipe the
  // pasted link out from under React state (the "Rebuild does nothing" bug).
  const taRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [scraped, setScraped] = useState<ScrapeResult | null>(null)
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)
  const [build, setBuild] = useState<{ playlistId: string; title: string; total: number; done: number; matched: number; status: string; sources: number } | null>(null)

  const parseUrls = (s: string) => Array.from(new Set((s || '').split(/[\n,]/).map(x => x.trim()).filter(Boolean)))
  const isSupportedUrl = (u: string) => /(?:open\.)?spotify\.com\/.*playlist|youtube\.com|youtu\.be|soundcloud\.com|bandcamp\.com/i.test(u)
  const liveUrls = () => parseUrls(taRef.current?.value || '')

  useEffect(() => {
    let on = true
    setLoading(true)
    fetch(`/api/playlists/list?scope=global&sort=played&limit=120`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { nodes: [], genres: [] }))
      .then(j => {
        if (!on) return
        setNodes(Array.isArray(j?.nodes) ? j.nodes : [])
        if (Array.isArray(j?.genres) && j.genres.length) setGenres(j.genres)
        setLoading(false)
      })
      .catch(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [])

  const runScrape = async () => {
    const url = liveUrls()[0]
    if (!url) { setScrapeError('Paste a Spotify, YouTube, SoundCloud or Bandcamp link first.'); return }
    if (!isSupportedUrl(url)) { setScrapeError('That link isn’t supported — use Spotify, YouTube, SoundCloud or Bandcamp.'); return }
    setScraping(true); setScrapeError(''); setScraped(null)
    try {
      const r = await fetch('/api/playlist/import-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
      })
      const d = await r.json()
      if (!r.ok) { setScrapeError(d.error || 'Could not read that link.'); return }
      setScraped({ platform: d.platform || 'Playlist', total: d.total || (d.tracks?.length ?? 0), tracks: d.tracks || [] })
    } catch {
      setScrapeError('Network error — try again.')
    } finally {
      setScraping(false)
    }
  }

  const runRebuild = async () => {
    const all = liveUrls()
    if (!all.length) { setBuildError('Paste a Spotify, YouTube, SoundCloud or Bandcamp link first.'); return }
    if (!all.some(isSupportedUrl)) { setBuildError('Those links aren’t supported — use Spotify, YouTube, SoundCloud or Bandcamp.'); return }
    setBuilding(true); setBuildError(''); setNeedsLogin(false); setBuild(null); setScraped(null)
    try {
      const r = await fetch('/api/playlists/import-build', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ urls: all, title: (nameRef.current?.value || '').trim() || undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.status === 401) { setNeedsLogin(true); setBuildError('Sign in to rebuild a playlist onto your profile.'); setBuilding(false); return }
      if (!r.ok) { setBuildError(d.error || 'Could not rebuild that playlist — make sure the links are public.'); setBuilding(false); return }
      setBuild({ playlistId: d.playlistId, title: d.title, total: d.total, done: 0, matched: 0, status: 'building', sources: d.sources || all.length })
      const poll = async () => {
        try {
          const pr = await fetch(`/api/playlists/list?playlistId=${d.playlistId}`, { credentials: 'include' })
          const pj = await pr.json()
          const st = pj?.playlist?.importStatus
          if (st) {
            setBuild(b => (b ? { ...b, done: st.done || 0, matched: st.matched || 0, status: st.status || 'building' } : b))
            if (st.status === 'building') { setTimeout(poll, 3000); return }
          }
        } catch { /* keep last state */ }
        setBuilding(false)
      }
      setTimeout(poll, 2000)
    } catch {
      setBuildError('Network error — try again.'); setBuilding(false)
    }
  }

  // Derive candy rails from one fetch (no extra round-trips).
  const byPlays = [...nodes].sort((a, b) => b.totalPlays - a.totalPlays)
  const fresh = [...nodes].sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)).slice(0, 18)
  const biggest = [...nodes].filter(n => n.trackCount > 0).sort((a, b) => b.trackCount - a.trackCount).slice(0, 18)
  const featured = byPlays.slice(0, 18)
  const topGenres = genres.slice(0, 5)

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Playlists — SoundChain</title>
        <meta name="description" content="Every playlist on SoundChain — most played, freshest, biggest, by genre. Build your own from Spotify, YouTube, SoundCloud or Bandcamp." />
      </Head>

      {/* Deck console side-walls — same frame as /nodes + /deck (Fable5 grammar). */}
      <StarshipBay wall="deck" accent="fuchsia" leftLabel="SC · Media Bay" rightLabel="Catalog Live" sweep />

      <DexNavBar />
      <MainPillNav active="playlist" />

      <div className="relative z-30 mx-auto max-w-[1380px] px-2.5 sm:px-4 pt-2 pb-24 space-y-3">
        {/* Bay header — single tight line */}
        <div className="sc-mfd flex items-center justify-between px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <ListMusic className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <span className="font-mono tracking-[0.3em] text-fuchsia-300/90 text-[10px] sm:text-xs uppercase truncate">SoundChain · Playlists Bay</span>
          </div>
          <span className="sc-readout text-[10px] text-[#39ff7a] hidden sm:block">{loading ? 'SCANNING…' : `${nodes.length} ON DECK`}</span>
        </div>

        {/* ── BUILD station — the scraper (tight, deck-styled) ─────────────── */}
        <div className="sc-mfd p-3 space-y-2 border-l-2 border-l-fuchsia-500/50">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <span className="font-mono tracking-[0.2em] text-fuchsia-300/90 text-[11px] uppercase">Build a Playlist · Scraper</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Paste <span className="text-gray-300">Spotify · YouTube · SoundCloud · Bandcamp</span> links (one per line). The scraper re-sources every song to a playable version and builds <span className="text-fuchsia-300">one</span> SoundChain queue. Drop several links to combine them.
          </p>
          <textarea
            ref={taRef}
            defaultValue=""
            onInput={() => { if (scrapeError) setScrapeError(''); if (buildError) { setBuildError(''); setNeedsLogin(false) } }}
            placeholder={'Paste playlist links — one per line\nhttps://open.spotify.com/playlist/…\nhttps://soundcloud.com/…  ·  https://…bandcamp.com/album/…'}
            spellCheck={false} autoCapitalize="none" autoCorrect="off" autoComplete="off" inputMode="url" rows={3}
            className="w-full bg-black/50 border border-fuchsia-500/25 focus:border-fuchsia-400/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono outline-none transition-colors resize-y"
          />
          <input
            ref={nameRef} defaultValue="" placeholder="Playlist name (optional)" spellCheck={false} autoCapitalize="none" autoCorrect="off"
            className="w-full bg-black/50 border border-fuchsia-500/25 focus:border-fuchsia-400/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono outline-none transition-colors"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button" onClick={runRebuild} disabled={building}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[13px] font-mono uppercase tracking-[0.1em] bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/60 hover:bg-fuchsia-500/30 active:bg-fuchsia-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-[0_0_16px_rgba(232,121,249,0.18)]"
            >
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {building ? 'Building…' : 'Rebuild on SoundChain'}
            </button>
            <button
              type="button" onClick={runScrape} disabled={scraping || building}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:py-2 rounded-lg text-[12px] font-mono uppercase tracking-[0.1em] text-fuchsia-300/80 border border-fuchsia-500/25 hover:bg-fuchsia-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {scraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Preview songs
            </button>
          </div>

          {(scrapeError || buildError) && (
            <p className="text-[11px] text-amber-400/90 leading-snug">
              {scrapeError || buildError}
              {needsLogin && (<>{' '}<a href="/login" className="text-fuchsia-300 underline hover:text-fuchsia-200">Sign in →</a></>)}
            </p>
          )}

          {build && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-black/40 p-2.5 mt-1">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-mono text-fuchsia-200 truncate">🛠 {build.title}</span>
                <button onClick={() => router.push(`/dex/playlist/${build.playlistId}`)} className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#39ff7a] hover:underline whitespace-nowrap flex-shrink-0">Open ▸</button>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all" style={{ width: `${build.total ? Math.round((build.done / build.total) * 100) : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                {build.status === 'done'
                  ? `✓ Done — ${build.matched}/${build.total} songs added${build.sources > 1 ? ` from ${build.sources} playlists` : ''}. Tap Open to play.`
                  : `Re-sourcing songs… ${build.done}/${build.total} (${build.matched} added)${build.sources > 1 ? ` · ${build.sources} playlists` : ''}`}
              </p>
            </div>
          )}

          {scraped && !build && (
            <div className="rounded-lg border border-fuchsia-500/20 bg-black/40 p-2.5 mt-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff7a]" />
                <span className="text-[11px] font-mono text-[#39ff7a]">Read {scraped.total} songs from {scraped.platform}</span>
              </div>
              <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-0.5 pr-1">
                {scraped.tracks.slice(0, 60).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="text-gray-600 font-mono w-7 text-right flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {scraped.tracks.length > 60 && <div className="text-[10px] text-gray-600 font-mono pl-9 pt-1">+ {scraped.tracks.length - 60} more…</div>}
              </div>
              <p className="text-[10px] text-gray-600 mt-2 leading-snug">Hit <span className="text-fuchsia-300">Rebuild on SoundChain</span> to turn these into a playable queue.</p>
            </div>
          )}
        </div>

        {/* ── Candy rails ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-fuchsia-400 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400 font-mono text-xs uppercase tracking-[0.2em]">Scanning the catalog…</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="sc-mfd text-center py-16 px-4">
            <ListMusic className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 font-mono uppercase tracking-[0.2em] text-sm mb-1">No playlists on deck yet</p>
            <p className="text-gray-500 text-xs">Build the first one from the station above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Rail title="Most Played" icon={Flame} accent="text-orange-300" items={featured} big onTap={(id) => router.push(`/dex/playlist/${id}`)} />
            <Rail title="Fresh Drops" icon={Sparkles} accent="text-cyan-300" items={fresh} onTap={(id) => router.push(`/dex/playlist/${id}`)} />
            <Rail title="Biggest Crates" icon={Layers} accent="text-fuchsia-300" items={biggest} onTap={(id) => router.push(`/dex/playlist/${id}`)} />
            {topGenres.map(g => {
              const items = nodes.filter(n => n.genres.includes(g)).slice(0, 18)
              if (items.length < 2) return null
              return <Rail key={g} title={g} icon={ListMusic} accent="text-emerald-300" items={items} onTap={(id) => router.push(`/dex/playlist/${id}`)} />
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Horizontal candy rail ──────────────────────────────────────────────────
function Rail({ title, icon: Icon, accent, items, big, onTap }: {
  title: string; icon: typeof Flame; accent: string; items: PlaylistNode[]; big?: boolean; onTap: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <section className="sc-mfd p-2.5 sm:p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} strokeWidth={2.25} />
        <h2 className={`font-mono tracking-[0.22em] text-[11px] sm:text-xs uppercase ${accent}`}>{title}</h2>
        <span className="ml-auto text-[9px] font-mono text-white/25 uppercase tracking-[0.2em]">{items.length} ▸</span>
      </div>
      {/* horizontal snap rail — swipe sideways, no scrollbar; the candy shelf */}
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 sc-rail-3d">
        {items.map(p => (
          <button
            key={p.id}
            onClick={() => onTap(p.id)}
            className={`sc-candy-card group relative flex-shrink-0 snap-start text-left ${big ? 'w-40 sm:w-48' : 'w-32 sm:w-36'}`}
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-fuchsia-500/15 to-cyan-500/10 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ListMusic className={`${big ? 'w-12 h-12' : 'w-9 h-9'} text-fuchsia-400/40`} /></div>
              )}
              {/* gradient + play badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10">
                <Play className="w-2.5 h-2.5 text-fuchsia-300" fill="currentColor" />
                <span className="text-[9px] font-mono text-fuchsia-200">{fmt(p.totalPlays)}</span>
              </div>
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-mono text-white/70 uppercase tracking-wider">{p.trackCount} trk</div>
            </div>
            <p className={`text-white font-semibold truncate mt-1.5 ${big ? 'text-sm' : 'text-[12px]'}`}>{p.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {p.creatorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.creatorAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
              ) : <span className="w-3.5 h-3.5 rounded-full bg-white/10 flex-shrink-0" />}
              <span className="text-[10px] text-gray-400 truncate">{p.creatorHandle ? `@${p.creatorHandle}` : p.creatorName}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

;(PlaylistsExplorePage as any).getLayout = (page: ReactElement) => page
