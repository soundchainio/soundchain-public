/**
 * GifPicker — GIPHY search + trending grid for the chat composer.
 *
 * Same flow as the SC wall + feed + comments + DM picker (web/src/components/GifPicker.tsx)
 * — port with arena's red/dark palette + modal shell that matches ReactionPicker
 * so the composer's pill row stays visually consistent.
 *
 * Tap a GIF → onSelect(gifUrl, title) fires; the parent posts the URL as a
 * sticker take via the standard chat POST (mediaUrl + mediaType:'image'). The
 * server-side allow-list (chat.ts MEDIA_URL_ALLOW) accepts media[0-4].giphy.com
 * + i.giphy.com hosts — same source-of-truth pattern as the emote CDNs.
 *
 * Requires NEXT_PUBLIC_GIPHY_API_KEY set on the soundchain-arena Vercel
 * project. If unset, render a graceful fallback explaining how to wire it
 * up — never blow up the composer.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'
import { Search, X } from 'lucide-react'

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''

interface Props {
  onSelect: (gifUrl: string, title: string) => void
  onClose: () => void
}

export function GifPicker({ onSelect, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const gfRef = useRef<GiphyFetch | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize GiphyFetch only if key exists — module-load creation can throw.
  useEffect(() => {
    if (GIPHY_KEY) {
      gfRef.current = new GiphyFetch(GIPHY_KEY)
    }
  }, [])

  // Measure container width for the Grid (it needs an explicit pixel value).
  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.offsetWidth - 16
      setWidth(w > 0 ? w : 300)
    }
  }, [])

  // Debounced search — fires 300ms after typing stops.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const fetchGifs = useCallback(
    (offset: number) => {
      if (!gfRef.current) {
        return Promise.resolve({
          data: [],
          pagination: { total_count: 0, count: 0, offset: 0 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      }
      return searchTerm
        ? gfRef.current.search(searchTerm, { offset, limit: 10 })
        : gfRef.current.trending({ offset, limit: 10 })
    },
    [searchTerm],
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleGifClick = useCallback((gif: any, e: any) => {
    e.preventDefault()
    const url: string = gif.images?.fixed_height?.url || gif.images?.original?.url
    const title: string = gif.title || 'GIF'
    onSelect(url, title)
    onClose()
  }, [onSelect, onClose])

  if (!GIPHY_KEY) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="w-full sm:max-w-md bg-arena-paper dark:bg-arena-carbon border-t sm:border border-arena-border-l dark:border-arena-border-d sm:rounded-2xl shadow-2xl p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-3xl mb-3">🎬</div>
          <p className="text-sm font-bold mb-2">GIF search requires a GIPHY API key</p>
          <p className="text-[10px] text-arena-muted-l dark:text-arena-muted-d">
            Add{' '}
            <code className="text-arena-red bg-arena-card dark:bg-arena-surface px-1 py-0.5 rounded">
              NEXT_PUBLIC_GIPHY_API_KEY
            </code>{' '}
            to the soundchain-arena Vercel project. Free key at{' '}
            <a
              href="https://developers.giphy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-arena-red hover:underline"
            >
              developers.giphy.com
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={containerRef}
        className="w-full sm:max-w-md bg-arena-paper dark:bg-arena-carbon border-t sm:border border-arena-border-l dark:border-arena-border-d sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-3 py-3 border-b border-arena-border-l dark:border-arena-border-d">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arena-muted-l dark:text-arena-muted-d pointer-events-none" />
              <input
                type="text"
                placeholder="Search GIFs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }}
                autoFocus
                className="w-full rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-arena-red"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition"
              aria-label="Close GIF picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="h-72 sm:h-80 overflow-y-auto overflow-x-hidden p-2">
          {width > 0 && (
            <Grid
              key={searchTerm}
              width={width}
              columns={2}
              fetchGifs={fetchGifs}
              onGifClick={handleGifClick}
              noLink
            />
          )}
        </div>

        <footer className="px-3 py-2 text-[10px] text-arena-muted-l dark:text-arena-muted-d border-t border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
          <span>{searchTerm ? `Results for "${searchTerm}"` : 'Trending GIFs'}</span>
          <span className="text-arena-red">Powered by GIPHY</span>
        </footer>
      </div>
    </div>
  )
}
