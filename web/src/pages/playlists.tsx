/**
 * /playlists — PLAYLISTS EXPLORE: every playlist built on SoundChain.
 *
 * The Playlists pill used to bounce to the viewer's OWN profile playlists.
 * This is the global "explore" surface instead — all SC users' playlists,
 * ranked Most Played / Recent / Biggest, filterable by genre, in the same
 * flight-deck / Deck Map aesthetic as /nodes (StarshipBay deck console walls,
 * sc-mfd panels, mono stencil labels). Data is Vercel-direct:
 *   GET /api/playlists/list?scope=global&sort=played|recent|tracks&genre=
 * Tap a card → /dex/playlist/<id> (the existing rich playlist detail view).
 *
 * SCRAPER (below the sort pills): paste a Spotify / YouTube / SoundCloud
 * playlist link → POST /api/playlist/import-url → scrape every song's
 * title/artist. v1 reads the full song list (YouTube via the keyless Piped
 * API today). Rebuilding the scraped list into a playable SC playlist +
 * Spotify reading land in the next ship (needs embed-track support + the
 * Spotify app key).
 */
import { ReactElement, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { DexNavBar } from 'components/DexNavBar'
import MainPillNav from 'components/MainPillNav'
import { ListMusic, Play, Flame, Clock, Layers, Wand2, Loader2, CheckCircle2 } from 'lucide-react'

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

type SortKey = 'played' | 'recent' | 'tracks'

const SORTS: { key: SortKey; label: string; icon: typeof Flame }[] = [
  { key: 'played', label: 'Most Played', icon: Flame },
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'tracks', label: 'Biggest', icon: Layers },
]

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

type ScrapeResult = { platform: string; total: number; tracks: Array<{ title: string; url: string; thumbnail: string | null }> }

export default function PlaylistsExplorePage() {
  const router = useRouter()
  const [sort, setSort] = useState<SortKey>('played')
  const [genre, setGenre] = useState<string>('')
  const [nodes, setNodes] = useState<PlaylistNode[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Scraper
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [scraped, setScraped] = useState<ScrapeResult | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)
  const [build, setBuild] = useState<{ playlistId: string; title: string; total: number; done: number; matched: number; status: string; sources: number } | null>(null)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const parseUrls = (s: string) => Array.from(new Set(s.split(/[\n,]/).map(x => x.trim()).filter(Boolean)))
  // A link is "supported" only if it's a Spotify or YouTube playlist URL. Used to
  // give immediate inline feedback instead of letting a bad paste silently fail.
  const isSupportedUrl = (u: string) => /(?:open\.)?spotify\.com\/.*playlist|youtube\.com|youtu\.be/i.test(u)
  // Read the LIVE textarea value (DOM) — some mobile paste/autofill paths don't
  // fire React onChange, leaving `scrapeUrl` state empty while the box shows text.
  // Reading the ref makes Rebuild/Preview work off exactly what the user sees.
  const liveUrls = () => parseUrls((taRef.current?.value ?? scrapeUrl) || '')
  const urls = parseUrls(scrapeUrl)
  const hasSupported = urls.some(isSupportedUrl)

  useEffect(() => {
    let on = true
    setLoading(true)
    const q = new URLSearchParams({ scope: 'global', sort })
    if (genre) q.set('genre', genre)
    fetch(`/api/playlists/list?${q.toString()}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { nodes: [], genres: [] }))
      .then(j => {
        if (!on) return
        setNodes(Array.isArray(j?.nodes) ? j.nodes : [])
        if (Array.isArray(j?.genres) && j.genres.length) setGenres(j.genres)
        setLoading(false)
      })
      .catch(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [sort, genre])

  const runScrape = async () => {
    const all = liveUrls()
    const live = taRef.current?.value
    if (live != null && live !== scrapeUrl) setScrapeUrl(live) // sync state to what's shown
    const url = all[0] // preview the first link only
    if (!url) { setScrapeError('Paste a Spotify or YouTube playlist link first.'); return }
    if (!isSupportedUrl(url)) { setScrapeError('Paste a Spotify or YouTube playlist link (one per line).'); return }
    setScraping(true); setScrapeError(''); setScraped(null)
    try {
      const r = await fetch('/api/playlist/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const d = await r.json()
      if (!r.ok) { setScrapeError(d.error || 'Could not scrape that link.'); return }
      setScraped({ platform: d.platform || 'Playlist', total: d.total || (d.tracks?.length ?? 0), tracks: d.tracks || [] })
    } catch {
      setScrapeError('Network error — try again.')
    } finally {
      setScraping(false)
    }
  }

  // Rebuild: scrape → create SC playlist → background-match each song to YouTube.
  const runRebuild = async () => {
    const all = liveUrls()
    const live = taRef.current?.value
    if (live != null && live !== scrapeUrl) setScrapeUrl(live) // sync state to what's shown
    if (!all.length) { setBuildError('Paste a Spotify or YouTube playlist link first.'); return }
    if (!all.some(isSupportedUrl)) { setBuildError('Paste a Spotify or YouTube playlist link (one per line).'); return }
    setBuilding(true); setBuildError(''); setNeedsLogin(false); setBuild(null); setScraped(null)
    try {
      const r = await fetch('/api/playlists/import-build', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ urls: all, title: playlistName.trim() || undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.status === 401) { setNeedsLogin(true); setBuildError('Sign in to rebuild a playlist onto your profile.'); setBuilding(false); return }
      if (!r.ok) { setBuildError(d.error || 'Could not rebuild that playlist — make sure the links are public.'); setBuilding(false); return }
      setBuild({ playlistId: d.playlistId, title: d.title, total: d.total, done: 0, matched: 0, status: 'building', sources: d.sources || urls.length })
      const poll = async () => {
        try {
          const pr = await fetch(`/api/playlists/list?playlistId=${d.playlistId}`, { credentials: 'include' })
          const pj = await pr.json()
          const st = pj?.playlist?.importStatus
          if (st) {
            setBuild(b => (b ? { ...b, done: st.done || 0, matched: st.matched || 0, status: st.status || 'building' } : b))
            if (st.status === 'building') { setTimeout(poll, 3000); return }
          }
        } catch { /* keep the last known state */ }
        setBuilding(false)
      }
      setTimeout(poll, 2000)
    } catch {
      setBuildError('Network error — try again.'); setBuilding(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Playlists — SoundChain</title>
        <meta name="description" content="Every playlist on SoundChain — most played, newest, biggest, by genre. Built by the whole community." />
      </Head>

      {/* Deck console side-walls (matches /nodes + Deck Map). Rendered at root
          so the sticky DexNavBar (z-50) stays ABOVE them — no cropped logo. */}
      <StarshipBay wall="deck" accent="fuchsia" leftLabel="SC · Media Bay" rightLabel="Catalog Live" sweep />

      <DexNavBar />
      <MainPillNav active="playlist" />

      <div className="relative z-30 mx-auto max-w-[1380px] px-3 sm:px-4 pt-2 pb-24 space-y-3">
        {/* Flight-deck bay header */}
        <div className="sc-mfd flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <ListMusic className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <span className="font-mono tracking-[0.3em] text-fuchsia-300/90 text-[11px] sm:text-xs uppercase truncate">SoundChain · Playlists Bay</span>
          </div>
          <span className="sc-readout text-[10px] text-[#39ff7a] hidden sm:block">
            {loading ? 'SCANNING…' : `${nodes.length} ON DECK`}
          </span>
        </div>

        {/* Sort tabs + genre chips */}
        <div className="sc-mfd p-2 space-y-2">
          <div className="flex items-center gap-1.5">
            {SORTS.map(s => {
              const Icon = s.icon
              const on = sort === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.12em] transition-all border ${
                    on
                      ? 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/50 shadow-[0_0_12px_rgba(232,121,249,0.25)]'
                      : 'text-fuchsia-300/70 hover:text-fuchsia-200 border-fuchsia-500/20 hover:border-fuchsia-400/40'
                  }`}
                >
                  <Icon className="w-3 h-3" strokeWidth={2.25} />
                  {s.label}
                </button>
              )
            })}
          </div>
          {genres.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-0.5">
              <button
                onClick={() => setGenre('')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] whitespace-nowrap border ${
                  genre === '' ? 'bg-white/10 text-white border-white/30' : 'text-gray-400 border-white/10 hover:text-white hover:border-white/25'
                }`}
              >All Genres</button>
              {genres.map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] whitespace-nowrap border ${
                    genre === g ? 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/50' : 'text-gray-400 border-white/10 hover:text-white hover:border-white/25'
                  }`}
                >{g}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── SCRAPER — rebuild any playlist on SoundChain ─────────────── */}
        <div className="sc-mfd p-3 space-y-2 border-l-2 border-l-fuchsia-500/40">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <span className="font-mono tracking-[0.2em] text-fuchsia-300/90 text-[11px] uppercase">Rebuild a Playlist · Scraper</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Paste one or more <span className="text-gray-300">Spotify</span> or <span className="text-gray-300">YouTube</span> playlist links (one per line) — the scraper reads every song and rebuilds them into <span className="text-fuchsia-300">one</span> SoundChain playlist, matched to YouTube. Drop two links to combine two playlists into a single queue.
          </p>
          <textarea
            ref={taRef}
            value={scrapeUrl}
            onChange={e => { setScrapeUrl(e.target.value); if (scrapeError) setScrapeError(''); if (buildError) { setBuildError(''); setNeedsLogin(false) } }}
            placeholder={'Paste playlist links — one per line\nhttps://open.spotify.com/playlist/…\nhttps://www.youtube.com/playlist?list=…'}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            inputMode="url"
            rows={3}
            className="w-full bg-black/50 border border-fuchsia-500/25 focus:border-fuchsia-400/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono outline-none transition-colors resize-y"
          />
          <input
            value={playlistName}
            onChange={e => setPlaylistName(e.target.value)}
            placeholder="Combined playlist name (optional)"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full min-w-0 bg-black/50 border border-fuchsia-500/25 focus:border-fuchsia-400/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono outline-none transition-colors"
          />
          {/* Rebuild = the primary action (full-width on mobile so it's always
              reachable above the on-screen keyboard); Preview is optional. */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={runRebuild}
              disabled={building}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[13px] font-mono uppercase tracking-[0.1em] bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/60 hover:bg-fuchsia-500/30 active:bg-fuchsia-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-[0_0_16px_rgba(232,121,249,0.18)]"
            >
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {building ? 'Building…' : 'Rebuild on SoundChain'}
            </button>
            <button
              type="button"
              onClick={runScrape}
              disabled={scraping || building}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:py-2 rounded-lg text-[12px] font-mono uppercase tracking-[0.1em] text-fuchsia-300/80 border border-fuchsia-500/25 hover:bg-fuchsia-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {scraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Preview songs
            </button>
          </div>
          <p className="text-[10px] text-gray-600 font-mono leading-snug">
            Rebuild reads every song and matches it to YouTube — no preview needed. Spotify caps at 100 songs / link; paste two links to combine.
          </p>

          {(scrapeError || buildError) && (
            <p className="text-[11px] text-amber-400/90 leading-snug">
              {scrapeError || buildError}
              {needsLogin && (
                <>
                  {' '}
                  <a href="/login" className="text-fuchsia-300 underline hover:text-fuchsia-200">Sign in →</a>
                </>
              )}
            </p>
          )}

          {/* Live rebuild progress */}
          {build && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-black/40 p-2.5 mt-1">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-mono text-fuchsia-200 truncate">🛠 {build.title}</span>
                <button
                  onClick={() => router.push(`/dex/playlist/${build.playlistId}`)}
                  className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#39ff7a] hover:underline whitespace-nowrap flex-shrink-0"
                >Open ▸</button>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all" style={{ width: `${build.total ? Math.round((build.done / build.total) * 100) : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                {build.status === 'done'
                  ? `✓ Done — ${build.matched}/${build.total} songs added${build.sources > 1 ? ` from ${build.sources} playlists` : ''}. Tap Open to play.`
                  : `Matching to YouTube… ${build.done}/${build.total} (${build.matched} added)${build.sources > 1 ? ` · ${build.sources} playlists` : ''}`}
              </p>
            </div>
          )}

          {/* Preview list (read-only) */}
          {scraped && !build && (
            <div className="rounded-lg border border-fuchsia-500/20 bg-black/40 p-2.5 mt-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff7a]" />
                <span className="text-[11px] font-mono text-[#39ff7a]">Scraped {scraped.total} songs from {scraped.platform}</span>
              </div>
              <div className="max-h-44 overflow-y-auto scrollbar-hide space-y-0.5 pr-1">
                {scraped.tracks.slice(0, 60).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="text-gray-600 font-mono w-7 text-right flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {scraped.tracks.length > 60 && (
                  <div className="text-[10px] text-gray-600 font-mono pl-9 pt-1">+ {scraped.tracks.length - 60} more…</div>
                )}
              </div>
              <p className="text-[10px] text-gray-600 mt-2 leading-snug">
                Hit <span className="text-fuchsia-300">Rebuild on SoundChain</span> to turn these into a playable playlist on your profile.
              </p>
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-fuchsia-400 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400 font-mono text-xs uppercase tracking-[0.2em]">Scanning the catalog…</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="sc-mfd text-center py-16 px-4">
            <ListMusic className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 font-mono uppercase tracking-[0.2em] text-sm mb-1">No playlists on deck yet</p>
            <p className="text-gray-500 text-xs">{genre ? `Nothing in "${genre}" — try another genre.` : 'Be the first to build one from your library.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {nodes.map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/dex/playlist/${p.id}`)}
                className="sc-mfd group text-left p-2.5 transition-all hover:brightness-125"
              >
                <div className="relative aspect-square rounded-md overflow-hidden mb-2 bg-gradient-to-br from-fuchsia-500/15 to-cyan-500/10">
                  {p.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListMusic className="w-10 h-10 text-fuchsia-400/40" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                    <Play className="w-2.5 h-2.5 text-fuchsia-300" />
                    <span className="text-[9px] font-mono text-fuchsia-200">{fmt(p.totalPlays)}</span>
                  </div>
                </div>
                <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {p.creatorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.creatorAvatar} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-white/10 flex-shrink-0" />
                  )}
                  <span className="text-[11px] text-gray-400 truncate">{p.creatorHandle ? `@${p.creatorHandle}` : p.creatorName}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono uppercase tracking-[0.1em] text-gray-500">
                  <span className="inline-flex items-center gap-1"><ListMusic className="w-2.5 h-2.5" />{p.trackCount}</span>
                  {p.genres[0] && <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300/80 truncate max-w-[90px]">{p.genres[0]}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Standalone chrome — same pattern as /nodes + /deck (opt out of any global layout)
;(PlaylistsExplorePage as any).getLayout = (page: ReactElement) => page
