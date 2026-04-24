/**
 * FantasyLiveTicker — horizontal marquee of top scoring events in this league's
 * current NFL week. Polls /api/arena/fantasy/[id]/live-feed every 30s.
 *
 * Hidden during offseason or when the league has zero scoring activity.
 * Drops itself from the layout entirely if items.length === 0.
 */
import { useEffect, useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import { teamColorHex, positionPillClass } from 'lib/arena/fantasy/teamColors'

interface FeedItem {
  playerId: string
  fullName: string
  position: string
  teamAbbr: string
  ownerHandle: string
  slot: string
  week: number
  points: number
  summary: string
}

interface FeedResponse {
  items: FeedItem[]
  nflWeek: number
  reason?: string
}

interface FantasyLiveTickerProps {
  leagueId: string
  pollIntervalMs?: number
}

export function FantasyLiveTicker({ leagueId, pollIntervalMs = 30_000 }: FantasyLiveTickerProps) {
  const [data, setData] = useState<FeedResponse | null>(null)

  useEffect(() => {
    if (!leagueId) return
    let cancelled = false
    let timer: any
    const pull = async () => {
      try {
        const r = await fetch(`/api/arena/fantasy/${leagueId}/live-feed`)
        if (!r.ok) return
        const json: FeedResponse = await r.json()
        if (!cancelled) setData(json)
      } catch {
        /* transient — ignore */
      }
    }
    pull()
    timer = setInterval(pull, pollIntervalMs)
    return () => { cancelled = true; clearInterval(timer) }
  }, [leagueId, pollIntervalMs])

  const items = data?.items || []
  // Duplicate the track so the CSS marquee loops seamlessly
  const loopedItems = useMemo(() => items.length ? [...items, ...items] : [], [items])

  if (!items.length) return null

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-green-950/80 via-black to-green-950/80 border-y border-green-500/20 py-1.5">
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-1 px-3 bg-green-950/95 border-r border-green-500/30">
        <Activity className="w-3 h-3 text-green-400 animate-pulse" />
        <span className="text-[10px] font-black text-green-300 tracking-widest">LIVE · WK {data?.nflWeek}</span>
      </div>
      <div className="flex w-max animate-fantasy-marquee hover:[animation-play-state:paused] pl-44">
        {loopedItems.map((it, i) => {
          const hex = teamColorHex(it.teamAbbr)
          return (
            <div
              key={`${it.playerId}-${i}`}
              className="flex items-center gap-2 px-4 whitespace-nowrap text-xs"
              style={{ borderLeft: i === 0 ? 'none' : `1px solid #${hex}33` }}
            >
              <span className={`px-1.5 py-0.5 rounded ring-1 ${positionPillClass(it.position)} text-[9px] font-bold`}>
                {it.position}
              </span>
              <span className="font-bold text-white">{it.fullName}</span>
              <span className="text-[10px] font-mono px-1" style={{ color: `#${hex}` }}>{it.teamAbbr}</span>
              <span className="text-green-300 font-black tabular-nums">{it.points.toFixed(1)}</span>
              <span className="text-gray-400 text-[10px]">{it.summary.split(' · ')[1] || ''}</span>
              <span className="text-gray-500 text-[10px]">@{it.ownerHandle}</span>
            </div>
          )
        })}
      </div>
      <style jsx>{`
        @keyframes fantasy-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-fantasy-marquee {
          animation: fantasy-marquee 90s linear infinite;
        }
      `}</style>
    </div>
  )
}
