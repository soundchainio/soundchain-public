/**
 * SportsTickerStack — 3 live sports tickers (MLB, NHL, NBA)
 *
 * Each league has its own scrolling speed/rhythm:
 *   MLB: 30s (steady, relaxed — baseball pace)
 *   NHL: 20s (fast, intense — hockey pace)
 *   NBA: 22s (quick, dynamic — basketball pace)
 *
 * Stacks below Bloomberg ticker in DexNavBar.
 * Full stack: FURL → Bloomberg → MLB → NHL → NBA
 *
 * ESPN public API — free, no key, live scores.
 */
import { useState, useEffect } from 'react'

interface Game {
  id: string
  name: string
  status: string
  state: string
  home: { team: string; score: string }
  away: { team: string; score: string }
}

interface SportsData {
  mlb: Game[]
  nhl: Game[]
  nba: Game[]
}

const LEAGUE_CONFIG = {
  mlb: { label: 'MLB', emoji: '⚾', color: 'text-red-400', bgColor: 'bg-red-950/80', borderColor: 'border-red-500/20', speed: '30s' },
  nhl: { label: 'NHL', emoji: '🏒', color: 'text-blue-400', bgColor: 'bg-blue-950/80', borderColor: 'border-blue-500/20', speed: '20s' },
  nba: { label: 'NBA', emoji: '🏀', color: 'text-orange-400', bgColor: 'bg-orange-950/80', borderColor: 'border-orange-500/20', speed: '22s' },
}

function LeagueTicker({ games, league }: { games: Game[]; league: keyof typeof LEAGUE_CONFIG }) {
  const cfg = LEAGUE_CONFIG[league]

  if (games.length === 0) return null

  const items = games.map(g => {
    const isLive = g.state === 'in'
    const isFinal = g.state === 'post'
    const showScorers = (league === 'nba' || league === 'nhl') && (isLive || isFinal)
    const awayScorers = (g.away as any).topScorers || []
    const homeScorers = (g.home as any).topScorers || []
    return (
      <span key={g.id} className="flex items-center gap-1.5 flex-shrink-0">
        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        <span className="text-gray-400">{g.away.team}</span>
        <span className={`font-bold ${isLive ? 'text-white' : isFinal ? cfg.color : 'text-gray-500'}`}>{g.away.score}</span>
        {showScorers && awayScorers.length > 0 && (
          <span className="text-[8px] text-yellow-400/70">
            ({awayScorers.map((s: any) => `${s.name} ${s.points}`).join(', ')})
          </span>
        )}
        <span className="text-gray-600">@</span>
        <span className="text-gray-400">{g.home.team}</span>
        <span className={`font-bold ${isLive ? 'text-white' : isFinal ? cfg.color : 'text-gray-500'}`}>{g.home.score}</span>
        {showScorers && homeScorers.length > 0 && (
          <span className="text-[8px] text-yellow-400/70">
            ({homeScorers.map((s: any) => `${s.name} ${s.points}`).join(', ')})
          </span>
        )}
        <span className={`text-[8px] ${isLive ? 'text-red-400 font-bold' : isFinal ? 'text-gray-500' : 'text-gray-600'}`}>
          {isLive ? `LIVE · ${g.status}` : isFinal ? 'FINAL' : g.status}
        </span>
        {(g as any).series && (
          <span className="text-[7px] text-purple-400 font-bold">{(g as any).series}</span>
        )}
        <span className="text-white/10 mx-1">│</span>
      </span>
    )
  })

  return (
    <div className={`w-full ${cfg.bgColor} border-b ${cfg.borderColor} flex items-center overflow-hidden`}>
      {/* Static league badge — pinned left */}
      <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 ${cfg.bgColor} border-r ${cfg.borderColor} z-10`}>
        <span className={`${cfg.color} font-bold text-[10px] flex items-center gap-1`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>
      {/* Scrolling scores — inline-flex + w-max so -50% = exactly one copy */}
      <div className="flex-1 overflow-hidden">
        <div
          className="inline-flex items-center gap-4 px-2 py-0.5 whitespace-nowrap text-[10px] w-max"
          style={{ animation: `marquee ${cfg.speed} linear infinite` }}
        >
          {items}
          {items}
        </div>
      </div>
    </div>
  )
}

export function SportsTickerStack() {
  const [data, setData] = useState<SportsData | null>(null)

  useEffect(() => {
    const fetchSports = () => {
      fetch('/api/ticker/sports')
        .then(r => r.json())
        .then(setData)
        .catch(() => {})
    }
    fetchSports()
    const interval = setInterval(fetchSports, 60_000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [])

  if (!data) return null

  // Only show leagues that have games today
  const hasMLB = data.mlb.length > 0
  const hasNHL = data.nhl.length > 0
  const hasNBA = data.nba.length > 0

  if (!hasMLB && !hasNHL && !hasNBA) return null

  return (
    <>
      {hasMLB && <LeagueTicker games={data.mlb} league="mlb" />}
      {hasNHL && <LeagueTicker games={data.nhl} league="nhl" />}
      {hasNBA && <LeagueTicker games={data.nba} league="nba" />}
    </>
  )
}
