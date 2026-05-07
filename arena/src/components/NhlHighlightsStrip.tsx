import { useEffect, useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import type { NhlHighlight } from '@/lib/nhlContent'

interface Props {
  espnGameId: string
  date: string                     // YYYY-MM-DD
  away: string                     // ESPN tricode (e.g. "MTL")
  home: string                     // ESPN tricode (e.g. "TOR")
  status?: 'pre' | 'live' | 'final'
}

/** NHL-native highlights via api-web.nhle.com → Brightcove iframe per goal.
 *  Falls back silently to nothing on miss; the universal YouTube strip in
 *  GameDetailModal serves as the user-facing fallback so this is purely
 *  additive depth above the existing strip.
 */
export function NhlHighlightsStrip({ espnGameId, date, away, home, status }: Props) {
  const [highlights, setHighlights] = useState<NhlHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<NhlHighlight | null>(null)

  useEffect(() => {
    if (status === 'pre') { setLoading(false); setHighlights([]); return }
    let cancelled = false
    setLoading(true); setHighlights([]); setActive(null)
    const params = new URLSearchParams({ date, away, home, status: status ?? '' })
    fetch(`/api/nhl/highlights/${espnGameId}?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (cancelled) return
        const list: NhlHighlight[] = d?.highlights ?? []
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
        <Loader2 className="w-3 h-3 animate-spin" /> Loading NHL.com highlights…
      </div>
    )
  }
  if (highlights.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Inline player — Brightcove iframe is the only auth-free way to embed
          NHL clips. autoplay disabled by default; user taps to play. */}
      {active && (
        <div className="rounded-xl overflow-hidden border border-arena-border-l dark:border-arena-border-d bg-black">
          <div className="aspect-video bg-black">
            <iframe
              key={active.id}
              src={active.embedUrl}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              title={active.title}
            />
          </div>
          <div className="px-3 py-2 text-xs">
            <div className="font-bold truncate">{active.title}</div>
            {active.shotType && (
              <div className="text-arena-muted-l dark:text-arena-muted-d text-[11px] mt-0.5">
                {active.shotType} · {active.awayScore}-{active.homeScore}
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-arena-muted-l dark:text-arena-muted-d">
                    <Play className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Play className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {h.period > 0 && (
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded">
                    P{h.period} {h.timeInPeriod}
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
