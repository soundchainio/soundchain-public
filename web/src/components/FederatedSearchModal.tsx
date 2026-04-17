/**
 * FederatedSearchModal — SoundChain's open-source meta-search.
 *
 * Keyboard shortcut `/` opens it from anywhere. Type and results stream in
 * from four sources in parallel (SoundChain, Wikipedia, DuckDuckGo, GitHub)
 * via /api/search/federated. Source tabs filter the combined list;
 * "ALL" (default) interleaves the top hits.
 *
 * Privacy-respecting by construction: the user's query only hits the
 * SoundChain server, which fans out to public APIs with no user identifier.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Search as SearchIcon, ExternalLink, Loader2 } from 'lucide-react'
import type { SearchResult, SearchSource } from 'pages/api/search/federated'

type Tab = 'all' | SearchSource

const TAB_LABELS: Record<Tab, string> = {
  all: 'ALL',
  soundchain: 'SOUNDCHAIN',
  wikipedia: 'WIKI',
  duckduckgo: 'WEB',
  github: 'CODE',
}

const SOURCE_ACCENT: Record<SearchSource, string> = {
  soundchain: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300',
  wikipedia: 'border-neutral-400/60 bg-neutral-500/10 text-neutral-200',
  duckduckgo: 'border-orange-500/60 bg-orange-500/10 text-orange-300',
  github: 'border-purple-500/60 bg-purple-500/10 text-purple-300',
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function FederatedSearchModal({ open, onClose }: Props) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [loading, setLoading] = useState(false)
  const [tookMs, setTookMs] = useState<number | null>(null)
  const [results, setResults] = useState<Record<SearchSource, SearchResult[]>>({
    soundchain: [], wikipedia: [], duckduckgo: [], github: [],
  })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30)
    } else {
      setQ(''); setResults({ soundchain: [], wikipedia: [], duckduckgo: [], github: [] }); setTookMs(null); setTab('all')
    }
  }, [open])

  // Debounce query → /api/search/federated. Abort in-flight on next keystroke.
  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (term.length < 2) {
      setResults({ soundchain: [], wikipedia: [], duckduckgo: [], github: [] })
      setTookMs(null)
      return
    }
    const ac = new AbortController()
    abortRef.current?.abort()
    abortRef.current = ac
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search/federated?q=${encodeURIComponent(term)}`, { signal: ac.signal })
        if (!res.ok) return
        const data = await res.json()
        setResults(data.sources)
        setTookMs(data.tookMs)
      } catch { /* aborted or network */ }
      finally { if (!ac.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(t); ac.abort() }
  }, [q, open])

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null

  const allInterleaved: SearchResult[] = []
  const max = Math.max(
    results.soundchain.length, results.wikipedia.length,
    results.duckduckgo.length, results.github.length,
  )
  for (let i = 0; i < max; i++) {
    if (results.soundchain[i]) allInterleaved.push(results.soundchain[i])
    if (results.wikipedia[i]) allInterleaved.push(results.wikipedia[i])
    if (results.duckduckgo[i]) allInterleaved.push(results.duckduckgo[i])
    if (results.github[i]) allInterleaved.push(results.github[i])
  }
  const shown: SearchResult[] = tab === 'all' ? allInterleaved : results[tab]
  const totalCount = results.soundchain.length + results.wikipedia.length + results.duckduckgo.length + results.github.length

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4" onClick={close}>
      <div
        className="w-full max-w-3xl bg-neutral-950 border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.4)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* SEARCH INPUT */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
          <SearchIcon size={18} className="text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search SoundChain, Wikipedia, the open web, GitHub..."
            className="flex-1 bg-transparent text-sm font-mono text-white placeholder-neutral-500 outline-none"
          />
          {loading && <Loader2 size={14} className="text-cyan-400 animate-spin" />}
          <kbd className="hidden sm:inline-block text-[9px] font-mono text-neutral-500 border border-neutral-700 rounded px-1.5 py-0.5">ESC</kbd>
          <button onClick={close} className="p-1 rounded hover:bg-neutral-800"><X size={16} className="text-neutral-400" /></button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 overflow-x-auto">
          {(['all', 'soundchain', 'wikipedia', 'duckduckgo', 'github'] as Tab[]).map(t => {
            const count = t === 'all' ? totalCount : results[t].length
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition whitespace-nowrap ${
                  tab === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                {TAB_LABELS[t]} {count > 0 && <span className="text-neutral-500">· {count}</span>}
              </button>
            )
          })}
          <div className="ml-auto text-[9px] font-mono text-neutral-600 pr-2">
            {tookMs !== null && `${tookMs}ms · open-source`}
          </div>
        </div>

        {/* RESULTS */}
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 && (
            <div className="p-8 text-center text-xs font-mono text-neutral-500">
              <div className="text-lg mb-2">🌐</div>
              Type 2+ characters to search<br />
              <span className="text-neutral-600">SoundChain · Wikipedia · DuckDuckGo · GitHub</span>
            </div>
          )}
          {q.trim().length >= 2 && !loading && shown.length === 0 && (
            <div className="p-8 text-center text-xs font-mono text-neutral-500">No results</div>
          )}
          {shown.map((r, i) => (
            <a
              key={`${r.source}-${i}-${r.url}`}
              href={r.url}
              target={r.url.startsWith('/') ? '_self' : '_blank'}
              rel="noopener noreferrer"
              onClick={r.url.startsWith('/') ? close : undefined}
              className="flex gap-3 px-5 py-3 border-b border-neutral-800 hover:bg-cyan-500/5 transition group"
            >
              {r.thumb ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.thumb} alt="" className="w-12 h-12 rounded object-cover bg-neutral-800 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-neutral-800 shrink-0 flex items-center justify-center text-xl">
                  {r.source === 'soundchain' ? '🎵' : r.source === 'wikipedia' ? '📖' : r.source === 'github' ? '💻' : '🌐'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${SOURCE_ACCENT[r.source]}`}>
                    {r.meta || r.source.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-white truncate">{r.title}</span>
                  {!r.url.startsWith('/') && <ExternalLink size={10} className="text-neutral-500 shrink-0" />}
                </div>
                <div className="text-xs text-neutral-400 line-clamp-2">{r.snippet}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
