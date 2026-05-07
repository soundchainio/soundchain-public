import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { relativeAgo, type YouTubeVideo } from '@/lib/youtube'
import type { SportKey } from '@/lib/espn'
import { HighlightModal } from './HighlightModal'

interface HighlightsStripProps {
  sport: SportKey | 'f1' | 'boxing' | 'wwe'
  limit?: number
}

export function HighlightsStrip({ sport, limit = 12 }: HighlightsStripProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [active, setActive] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/highlights?sport=${encodeURIComponent(sport)}&limit=${limit}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setVideos(data.videos ?? [])
          setLoaded(true)
          setErr(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? 'Highlights unavailable')
          setLoaded(true)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [sport, limit])

  if (loaded && videos.length === 0) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-6 py-8 text-center">
        <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">
          {err ? 'Highlights temporarily unavailable.' : 'No highlights yet — check back after the next game.'}
        </p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-72 aspect-video rounded-xl bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <div
        className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setActive(v)}
            className="group relative flex-shrink-0 w-72 sm:w-80 rounded-xl overflow-hidden border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface hover:border-arena-red transition-colors snap-start text-left"
          >
            <div className="relative aspect-video bg-arena-bg-l dark:bg-arena-bg-d overflow-hidden">
              <img
                src={v.thumbnail}
                alt={v.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-arena-red/90 group-hover:bg-arena-red flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                {relativeAgo(v.publishedAt)}
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold line-clamp-2 leading-tight mb-1">{v.title}</p>
              <p className="text-[11px] text-arena-muted-l dark:text-arena-muted-d font-mono uppercase tracking-wider">
                {v.channelTitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <HighlightModal
          videoId={active.id}
          title={active.title}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}
