/**
 * ReactionPicker — emoji + emote + sticker picker for a take.
 *
 * Reuses the exact same emote catalog as the avatar picker:
 *   • QUICK_EMOJI sport-flavored row (instant, no network)
 *   • SC_EMOTES + TWITCH_EMOTES + PREFETCHED_EMOTES (build-baked, instant)
 *   • Live 7TV search (debounced 300ms)
 *
 * Quick-pick row at the top so taps stay one-handed; full grid scrolls
 * underneath for power users. Tapping any item closes the picker and
 * fires `onPick` with the canonical key + kind.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, Smile, X } from 'lucide-react'
import { PREFETCHED_EMOTES, SC_EMOTES, TWITCH_EMOTES, searchSevenTv, type ArenaEmote } from '@/lib/emotes'

const QUICK_EMOJI = ['❤️', '🔥', '💯', '😂', '😱', '🎯', '👀', '🚀', '🏆', '👑', '😤', '🥶']

interface Props {
  onPick: (args: { key: string; kind: 'emoji' | 'image' }) => void
  onClose: () => void
  /** Optional: keys this device has already reacted with — show a cyan check overlay so you don't double-tap. */
  myReactions?: string[]
}

export function ReactionPicker({ onPick, onClose, myReactions = [] }: Props) {
  const [emoteQuery, setEmoteQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ArenaEmote[]>([])
  const [searching, setSearching] = useState(false)
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())
  const myReactionsSet = new Set(myReactions)

  const markBroken = useCallback((url: string) => {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }, [])

  // Debounced 7TV search — same behavior as the avatar picker's modal.
  useEffect(() => {
    const q = emoteQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    let cancelled = false
    const t = setTimeout(async () => {
      const hits = await searchSevenTv(q, 50)
      if (!cancelled) {
        setSearchResults(hits)
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [emoteQuery])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-arena-paper dark:bg-arena-carbon border-t sm:border border-arena-border-l dark:border-arena-border-d sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-arena-red" />
            <h3 className="text-sm font-black uppercase tracking-wider">React</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="p-3 space-y-3">
          {/* Quick-pick row — 12 emojis, one-tap reactions */}
          <div className="grid grid-cols-12 gap-1">
            {QUICK_EMOJI.map((e) => {
              const active = myReactionsSet.has(e)
              return (
                <button
                  key={`q-${e}`}
                  type="button"
                  onClick={() => {
                    onPick({ key: e, kind: 'emoji' })
                    onClose()
                  }}
                  title={active ? 'Tap to remove your reaction' : `React with ${e}`}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xl transition ${
                    active
                      ? 'bg-arena-red ring-2 ring-arena-red'
                      : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'
                  }`}
                >
                  {e}
                </button>
              )
            })}
          </div>

          {/* Search any 7TV emote */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arena-muted-l dark:text-arena-muted-d pointer-events-none" />
            <input
              type="text"
              value={emoteQuery}
              onChange={(e) => setEmoteQuery(e.target.value)}
              placeholder="Search emotes (catjam, kekw, gigachad…)"
              className="w-full rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d pl-8 pr-8 py-2 text-xs focus:outline-none focus:border-arena-red"
            />
            {emoteQuery && (
              <button
                type="button"
                onClick={() => setEmoteQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-arena-border-l dark:hover:bg-arena-border-d"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {searching && (
              <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-arena-muted-l dark:text-arena-muted-d" />
            )}
          </div>

          {/* Mixed grid: SC + Twitch + 7TV global + BTTV + FFZ — all baked
              into the bundle for instant render. Live 7TV search results
              replace the catalog when the query field has content. */}
          <div className="grid grid-cols-8 gap-1 max-h-72 overflow-y-auto p-1 rounded-lg bg-arena-paper/40 dark:bg-arena-carbon/40 border border-arena-border-l dark:border-arena-border-d">
            {(emoteQuery.trim()
              ? searchResults
              : [...SC_EMOTES, ...TWITCH_EMOTES, ...PREFETCHED_EMOTES]
            )
              .filter((e) => !brokenUrls.has(e.url))
              .map((e) => {
                const active = myReactionsSet.has(e.url)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      onPick({ key: e.url, kind: 'image' })
                      onClose()
                    }}
                    title={active ? 'Tap to remove your reaction' : e.name}
                    className={`aspect-square rounded-lg flex items-center justify-center transition overflow-hidden ${
                      active
                        ? 'bg-arena-red ring-2 ring-arena-red'
                        : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.url}
                      alt={e.name}
                      loading="lazy"
                      className="w-full h-full object-contain p-0.5"
                      onError={() => markBroken(e.url)}
                    />
                  </button>
                )
              })}
            {emoteQuery.trim() && !searching && searchResults.length === 0 && (
              <div className="col-span-8 py-4 text-center text-[11px] text-arena-muted-l dark:text-arena-muted-d">
                No emotes match "{emoteQuery.trim()}". Try another keyword.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
