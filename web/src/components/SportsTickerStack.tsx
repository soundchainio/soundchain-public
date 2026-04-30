/**
 * SportsTickerStack — 4 live tickers (MLB, NHL, NBA, ESPN)
 *
 * Each row has its own scrolling speed/rhythm:
 *   MLB:  30s (steady — baseball pace)
 *   NHL:  20s (fast — hockey pace)
 *   NBA:  22s (quick — basketball pace)
 *   ESPN: 90s (cross-sport news headlines, longer read time per item)
 *
 * Stacks below Bloomberg ticker in DexNavBar.
 * Full stack: FURL → Bloomberg → MLB → NHL → NBA → ESPN
 *
 * ESPN public API — free, no key. MLB/NHL/NBA rows pull live scoreboard data;
 * ESPN row pulls cross-league news (NFL/NBA/MLB/NHL/NCAAF/etc.) so it stays
 * populated year-round regardless of any single league's seasonal cycle.
 *
 * History: NFL row was draft-picks → games → NFL-only news → REMOVED Apr 30, 2026
 * in favor of cross-sport ESPN news (NFL articles still appear when in-season).
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

interface NewsItem {
  id: string
  kind: 'news'
  headline: string
  league: string          // URL slug: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'college-football' | ...
  leagueLabel: string     // Friendly label: 'NFL' | 'NBA' | 'NCAAF' | ...
  teams: { league: string; abbr: string; logo: string }[]
  ago: string
  state: string
}

interface SportsData {
  mlb: Game[]
  nhl: Game[]
  nba: Game[]
  espn: NewsItem[]
}

const LEAGUE_CONFIG = {
  mlb: { label: 'MLB', emoji: '⚾', color: 'text-red-400', bgColor: 'bg-red-950/80', borderColor: 'border-red-500/20', speed: '30s' },
  nhl: { label: 'NHL', emoji: '🏒', color: 'text-blue-400', bgColor: 'bg-blue-950/80', borderColor: 'border-blue-500/20', speed: '20s' },
  nba: { label: 'NBA', emoji: '🏀', color: 'text-orange-400', bgColor: 'bg-orange-950/80', borderColor: 'border-orange-500/20', speed: '22s' },
  espn: { label: 'ESPN', emoji: '📰', color: 'text-cyan-300', bgColor: 'bg-zinc-950/85', borderColor: 'border-cyan-500/20', speed: '90s' },
}

function isNewsItem(item: Game | NewsItem): item is NewsItem {
  return (item as NewsItem).kind === 'news'
}

function LeagueTicker({
  items: rawItems,
  league,
  badgeLabel,
}: {
  items: (Game | NewsItem)[]
  league: keyof typeof LEAGUE_CONFIG
  badgeLabel?: string
}) {
  const cfg = LEAGUE_CONFIG[league]

  if (rawItems.length === 0) return null

  const items = rawItems.map(item => {
    if (isNewsItem(item)) {
      // News item: small league pill (NFL/NBA/MLB/NHL/NCAAF/etc.) → team logos →
      // headline → ago. Reader gets context on the article's league before the
      // teams + story. Team logos use league-specific abbr; cap at 4 upstream.
      return (
        <span key={item.id} className="flex items-center gap-1.5 flex-shrink-0">
          {item.leagueLabel && (
            <span className="text-[8px] font-bold text-cyan-400/80 px-1 py-0.5 border border-cyan-500/30 rounded-sm">
              {item.leagueLabel}
            </span>
          )}
          {item.teams.length > 0 && (
            <span className="flex items-center gap-0.5">
              {item.teams.map(t => (
                <img
                  key={`${t.league}:${t.abbr}`}
                  src={t.logo}
                  alt={t.abbr}
                  title={`${t.abbr} · ${(LEAGUE_CONFIG as any)[t.league]?.label || t.league.toUpperCase()}`}
                  className="w-4 h-4 object-contain"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget.style.display = 'none') }}
                />
              ))}
            </span>
          )}
          <span className="font-bold text-white">{item.headline}</span>
          {item.ago && (
            <span className="text-[8px] text-gray-500">· {item.ago}</span>
          )}
          <span className="text-white/10 mx-1">│</span>
        </span>
      )
    }

    const g = item
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
    <div className={`sc-ticker w-full ${cfg.bgColor} border-b ${cfg.borderColor} flex items-center overflow-hidden`}>
      {/* Static league badge — pinned left */}
      <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 ${cfg.bgColor} border-r ${cfg.borderColor} z-10`}>
        <span className={`${cfg.color} font-bold text-[10px] flex items-center gap-1`}>
          {cfg.emoji} {badgeLabel || cfg.label}
        </span>
      </div>
      {/* Scrolling items — inline-flex + w-max so -50% = exactly one copy */}
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

  // Only show rows that have content right now
  const hasMLB = data.mlb.length > 0
  const hasNHL = data.nhl.length > 0
  const hasNBA = data.nba.length > 0
  const hasESPN = data.espn && data.espn.length > 0

  if (!hasMLB && !hasNHL && !hasNBA && !hasESPN) return null

  return (
    <>
      {hasMLB && <LeagueTicker items={data.mlb} league="mlb" />}
      {hasNHL && <LeagueTicker items={data.nhl} league="nhl" />}
      {hasNBA && <LeagueTicker items={data.nba} league="nba" />}
      {hasESPN && <LeagueTicker items={data.espn} league="espn" />}
    </>
  )
}
