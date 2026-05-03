import { useEffect, useState } from 'react'
import { fetchLeaders, type EspnLeaderCategory, type SportKey } from '@/lib/espn'
import { PlayerHeadshot } from './PlayerHeadshot'

interface LeadersBoardProps {
  sport: SportKey
  seasonType?: 1 | 2 | 3
  topN?: number                 // per category — default 5
}

/** Renders 1–3 stat-leader columns (PTS/REB/AST etc.) with player headshots. */
export function LeadersBoard({ sport, seasonType, topN = 5 }: LeadersBoardProps) {
  const [cats, setCats] = useState<EspnLeaderCategory[]>([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLeaders(sport, { topN, seasonType })
      .then((c) => { if (!cancelled) { setCats(c); setLoaded(true) } })
      .catch((e: any) => {
        if (!cancelled) { setErr(e?.message || 'Leaders unavailable'); setLoaded(true) }
      })
    return () => { cancelled = true }
  }, [sport, seasonType, topN])

  if (!loaded) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d p-6 text-center text-xs font-mono text-arena-muted-l dark:text-arena-muted-d">
        Loading stat leaders…
      </div>
    )
  }
  if (err || cats.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cats.map((cat) => (
        <LeaderColumn key={cat.name} cat={cat} />
      ))}
    </div>
  )
}

function LeaderColumn({ cat }: { cat: EspnLeaderCategory }) {
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.3em]">{cat.displayName}</h3>
        <span className="text-[10px] font-mono tracking-wider text-arena-muted-l dark:text-arena-muted-d">
          {cat.abbreviation}
        </span>
      </div>
      <ol>
        {cat.leaders.map((l, i) => (
          <li
            key={`${l.athlete.id}-${i}`}
            className="flex items-center gap-3 px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d last:border-b-0 hover:bg-arena-paper dark:hover:bg-arena-carbon"
          >
            <span className="w-5 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d arena-tabular text-center">
              {i + 1}
            </span>
            <PlayerHeadshot
              src={l.athlete.headshotUrl}
              name={l.athlete.fullName}
              size={36}
              ringColor={l.athlete.team?.color}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{l.athlete.fullName}</div>
              <div className="text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate flex items-center gap-1.5">
                {l.athlete.team?.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.athlete.team.logo}
                    alt={l.athlete.team.abbr}
                    className="w-3.5 h-3.5 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <span>{l.athlete.team?.abbr || ''}</span>
                {l.athlete.position && (
                  <>
                    <span className="opacity-50">·</span>
                    <span>{l.athlete.position}</span>
                  </>
                )}
              </div>
            </div>
            <span className="text-base font-black text-arena-red arena-tabular">
              {l.displayValue}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default LeadersBoard
