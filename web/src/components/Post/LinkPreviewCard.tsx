/**
 * LinkPreviewCard — Rich link preview for URLs in posts (like X/iMessage/Discord)
 * Fetches OG metadata from /api/og-preview and renders a clickable card
 * with thumbnail, title, description, and domain.
 */

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface OGData {
  url: string
  domain: string
  title: string
  description: string | null
  image: string | null
  siteName: string | null
}

export function LinkPreviewCard({ url }: { url: string }) {
  const [og, setOg] = useState<OGData | null>(null)
  const [failed, setFailed] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.title) setOg(data)
        else if (!cancelled) setFailed(true)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [url])

  if (failed) return null
  if (!og) {
    // Loading skeleton
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden animate-pulse">
        <div className="h-40 bg-neutral-800/50" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-neutral-800/50 rounded w-3/4" />
          <div className="h-3 bg-neutral-800/50 rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <a
      href={og.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 rounded-xl border border-white/10 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-cyan-500/20 overflow-hidden transition-colors group"
    >
      {/* Thumbnail */}
      {og.image && !imgError && (
        <div className="relative w-full bg-neutral-800" style={{ maxHeight: '280px' }}>
          <img
            src={og.image}
            alt=""
            className="w-full object-cover"
            style={{ maxHeight: '280px' }}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Text content */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-cyan-300 transition-colors">
              {og.title}
            </p>
            {og.description && (
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                {og.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">
                {og.siteName || og.domain}
              </span>
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}
