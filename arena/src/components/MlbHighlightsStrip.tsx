import { useEffect, useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import type { MlbHighlight } from '@/lib/mlbContent'

interface Props {
  espnGameId: string
  date: string                     // YYYY-MM-DD (game date in EST)
  away: string                     // ESPN team display name (e.g. "Baltimore Orioles")
  home: string
  status?: 'pre' | 'live' | 'final'
}

/** MLB-native highlights via statsapi → direct mp4 (no HLS player dep).
 *  Falls back silently to nothing on miss; the universal YouTube strip in
 *  GameDetailModal serves as the user-facing fallback so this is purely
 *  additive depth above the existing strip.
 */
export function MlbHighlightsStrip({ espnGameId, date, away, home, status }: Props) {
  const [highlights, setHighlights] = useState<MlbHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<MlbHighlight | null>(null)

  useEffect(() => {
    if (status === 'pre') { setLoading(false); setHighlights([]); return }
    let cancelled = false
    setLoading(true); setHighlights([]); setActive(null)
    const params = new URLSearchParams({ date, away, home, status: status ?? '' })
    fetch(`/api/mlb/highlights/${espnGameId}?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (cancelled) return
        const list: MlbHighlight[] = d?.highlights ?? []
        setHighlights(list)
        if (list.length > 0) setActive(list[0])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [espnGameId, date, away, home, status])

  if (status === 'pre') return null
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-arena-muted-l dark:text-arena-muted-d py-3">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading MLB.com highlights…
      </div>
    )
  }
  if (highlights.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Inline player */}
      {active?.mp4Url && (
        <div className="rounded-xl overflow-hidden border border-arena-border-l dark:border-arena-border-d bg-black">
          <video
            key={active.id}
            src={active.mp4Url}
            poster={active.thumbnail}
            controls
            playsInline
            preload="metadata"
            className="w-full aspect-video"
          />
          <div className="px-3 py-2 text-xs">
            <div className="font-bold truncate">{active.title}</div>
            {active.description && (
              <div className="text-arena-muted-l dark:text-arena-muted-d text-[11px] mt-0.5 line-clamp-2">
                {active.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Horizontal strip — alt clips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {highlights.map((h) => {
          const isActive = active?.id === h.id
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setActive(h)}
              className={`flex-shrink-0 w-44 group text-left ${isActive ? 'ring-2 ring-arena-red rounded-lg' : ''}`}
            >
              <div className="relative rounded-lg overflow-hidden bg-arena-card dark:bg-arena-surface aspect-video">
                {h.thumbnail ? (
                  <img src={h.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-arena-muted-l dark:text-arena-muted-d">
                    <Play className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Play className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {h.duration && (
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded">
                    {h.duration.replace(/^00:/, '')}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold mt-1.5 line-clamp-2 leading-tight">{h.title}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
