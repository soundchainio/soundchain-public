import { useState, useRef, useEffect, useCallback } from 'react'
import classNames from 'classnames'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''

interface GifPickerProps {
  onSelect: (gifUrl: string, title: string) => void
  onClose?: () => void
  theme?: 'dark' | 'light'
}

export const GifPicker = ({ onSelect, onClose, theme = 'dark' }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const gfRef = useRef<GiphyFetch | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize GiphyFetch only if key exists
  useEffect(() => {
    if (GIPHY_KEY) {
      gfRef.current = new GiphyFetch(GIPHY_KEY)
    }
  }, [])

  // Measure container width for Grid
  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.offsetWidth - 16
      setWidth(w > 0 ? w : 300)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchQuery)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const fetchGifs = useCallback((offset: number) => {
    if (!gfRef.current) return Promise.resolve({ data: [], pagination: { total_count: 0, count: 0, offset: 0 } } as any)
    return searchTerm
      ? gfRef.current.search(searchTerm, { offset, limit: 10 })
      : gfRef.current.trending({ offset, limit: 10 })
  }, [searchTerm])

  const handleGifClick = useCallback((gif: any, e: any) => {
    e.preventDefault()
    const url = gif.images?.fixed_height?.url || gif.images?.original?.url
    const title = gif.title || 'GIF'
    onSelect(url, title)
  }, [onSelect])

  if (!GIPHY_KEY) {
    return (
      <div className={classNames('w-full max-w-[480px] rounded-xl shadow-2xl border p-6 text-center', {
        'bg-neutral-900 text-white border-neutral-700': theme === 'dark',
        'bg-white text-gray-900 border-gray-200': theme === 'light',
      })}>
        <div className="text-3xl mb-3">🎬</div>
        <p className="text-sm text-neutral-300 mb-2">GIF Search requires a GIPHY API key</p>
        <p className="text-[10px] text-neutral-500">
          Add <code className="text-cyan-400 bg-neutral-800 px-1 py-0.5 rounded">NEXT_PUBLIC_GIPHY_API_KEY</code> to your environment variables.
          Get a free key at{' '}
          <a href="https://developers.giphy.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            developers.giphy.com
          </a>
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={classNames('w-full max-w-[480px] rounded-xl shadow-2xl border', {
        'bg-neutral-900 text-white border-neutral-700': theme === 'dark',
        'bg-white text-gray-900 border-gray-200': theme === 'light',
      })}
    >
      {/* Search Header + Close */}
      <div className="p-3 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation() } }}
            className={classNames('flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500', {
              'bg-neutral-800 text-white placeholder-neutral-500': theme === 'dark',
              'bg-gray-100 text-gray-900 placeholder-gray-400': theme === 'light',
            })}
          />
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 7 10 10"/><path d="M7 17 17 7"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* GIF Grid */}
      <div className="h-56 sm:h-72 md:h-80 overflow-y-auto overflow-x-hidden p-2">
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

      {/* Footer with GIPHY attribution */}
      <div className="px-3 py-2 text-[10px] text-neutral-500 border-t border-neutral-700 flex items-center justify-between">
        <span>
          {searchTerm ? `Results for "${searchTerm}"` : 'Trending GIFs'}
        </span>
        <span className="text-pink-400">Powered by GIPHY</span>
      </div>
    </div>
  )
}
