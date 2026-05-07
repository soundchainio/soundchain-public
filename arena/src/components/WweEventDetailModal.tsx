import { useEffect } from 'react'
import { X, Trophy, Swords, ScrollText, MapPin, CalendarClock } from 'lucide-react'

// Wrestler avatar — gradient-initial circle. No licensing surface, scales 1:1
// across all WWE pages, drop-in for any superstar name. Two-letter initials
// from first + last word of the display name; single-word names use first 2.
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Stable color per wrestler based on name hash → consistent across renders +
// across the same superstar appearing in multiple matches in one card.
function gradientFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const palette = [
    'from-red-600 to-orange-500',
    'from-amber-500 to-yellow-400',
    'from-emerald-600 to-teal-500',
    'from-cyan-500 to-blue-500',
    'from-indigo-600 to-purple-500',
    'from-fuchsia-600 to-pink-500',
    'from-rose-500 to-red-600',
    'from-slate-500 to-zinc-600',
  ]
  return palette[h % palette.length]
}

function WrestlerChip({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${gradientFor(name)} flex items-center justify-center text-white text-[11px] font-black shadow-lg ring-2 ring-arena-border-l/30 dark:ring-arena-border-d/30`}
      >
        {initialsFor(name)}
      </div>
      <span className="text-[13px] font-bold leading-tight truncate text-arena-text-l dark:text-arena-text-d">
        {name}
      </span>
    </div>
  )
}

export interface WweMatch {
  type: string
  stipulation?: string
  titleOnLine?: string
  participants: string[][]
  champion?: string
}

export interface WwePpvDetail {
  name: string
  date: string
  venue: string
  tag: string
  preview?: string
  card: WweMatch[]
}

interface Props {
  ppv: WwePpvDetail | null
  onClose: () => void
}

export function WweEventDetailModal({ ppv, onClose }: Props) {
  useEffect(() => {
    if (!ppv) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [ppv, onClose])

  if (!ppv) return null

  const dateLabel = (() => {
    const d = new Date(ppv.date)
    if (isNaN(d.getTime())) return ppv.date
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${ppv.name} match card`}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:w-[640px] lg:w-[760px] max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-arena-card dark:bg-arena-surface border border-arena-border-l/70 dark:border-arena-border-d/70 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-arena-border-l/50 dark:border-arena-border-d/50 bg-arena-card/95 dark:bg-arena-surface/95 backdrop-blur">
          <div className="min-w-0">
            <div className="text-[9px] font-mono tracking-[0.4em] text-arena-red mb-1">
              {ppv.tag}
            </div>
            <h2 className="text-lg sm:text-xl font-black leading-tight truncate">
              {ppv.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date + venue */}
        <div className="px-4 sm:px-5 py-3 border-b border-arena-border-l/30 dark:border-arena-border-d/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-[12px]">
            <CalendarClock className="w-3.5 h-3.5 text-arena-muted-l dark:text-arena-muted-d flex-shrink-0" />
            <span className="font-mono">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] min-w-0">
            <MapPin className="w-3.5 h-3.5 text-arena-muted-l dark:text-arena-muted-d flex-shrink-0" />
            <span className="truncate">{ppv.venue}</span>
          </div>
        </div>

        {/* Preview */}
        {ppv.preview && (
          <div className="px-4 sm:px-5 py-3 border-b border-arena-border-l/30 dark:border-arena-border-d/30">
            <div className="flex items-start gap-2">
              <ScrollText className="w-3.5 h-3.5 mt-0.5 text-arena-muted-l dark:text-arena-muted-d flex-shrink-0" />
              <p className="text-[13px] leading-relaxed text-arena-text-l dark:text-arena-text-d">
                {ppv.preview}
              </p>
            </div>
          </div>
        )}

        {/* Match card */}
        <div className="px-4 sm:px-5 py-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-3 flex items-center gap-2">
            <Swords className="w-3 h-3" />
            Match Card · {ppv.card.length} Matches
          </h3>
          <ol className="space-y-3">
            {ppv.card.map((match, idx) => {
              const isMain = idx === ppv.card.length - 1
              return (
                <li
                  key={idx}
                  className={`rounded-xl border bg-arena-bg-l/60 dark:bg-arena-bg-d/60 overflow-hidden transition ${
                    isMain
                      ? 'border-arena-red/60 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]'
                      : match.titleOnLine
                      ? 'border-amber-500/40'
                      : 'border-arena-border-l/40 dark:border-arena-border-d/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-arena-border-l/30 dark:border-arena-border-d/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider truncate">
                        {match.type}
                      </span>
                      {match.stipulation && (
                        <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded-full border border-arena-border-l/50 dark:border-arena-border-d/50 text-arena-muted-l dark:text-arena-muted-d uppercase truncate">
                          {match.stipulation}
                        </span>
                      )}
                    </div>
                    {isMain && (
                      <span className="flex-shrink-0 text-[9px] font-mono tracking-[0.2em] text-arena-red font-black">
                        MAIN EVENT
                      </span>
                    )}
                  </div>

                  {match.titleOnLine && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30">
                      <Trophy className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 truncate">
                        {match.titleOnLine}
                      </span>
                      {match.champion && (
                        <span className="ml-auto text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">
                          c: {match.champion}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="px-3 py-3 space-y-2">
                    {match.participants.map((side, sIdx) => (
                      <div key={sIdx}>
                        <div className="flex flex-wrap gap-2">
                          {side.map((wr) => (
                            <WrestlerChip key={`${idx}-${sIdx}-${wr}`} name={wr} />
                          ))}
                        </div>
                        {sIdx < match.participants.length - 1 && (
                          <div className="flex items-center gap-2 my-1.5 text-[9px] font-mono tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d uppercase">
                            <span className="flex-grow border-t border-arena-border-l/40 dark:border-arena-border-d/40" />
                            VS
                            <span className="flex-grow border-t border-arena-border-l/40 dark:border-arena-border-d/40" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-arena-border-l/40 dark:border-arena-border-d/40 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Card subject to change · curated by SoundChain Arena
        </div>
      </div>
    </div>
  )
}
