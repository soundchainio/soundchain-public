/**
 * Top-of-hub live scores ticker — ESPN-style horizontal strip showing the
 * live games across every sport in one scan. Frank May 6 feedback: arena hub
 * was "way too generic" — pointed at espn.com main page as the macro reference,
 * which leads with this exact pattern (top row of live game tiles).
 *
 * Mounts above the hero on `/` (hub) and could later extend to every sport
 * page. Auto-refreshes every 60s, fades in only when there are live games to
 * show — never renders an empty placeholder bar.
 *
 * Native-app-ready: server-side ESPN proxy already cached client-side via
 * `fetchScoreboard`, no new endpoints. Horizontal scroll uses native overflow,
 * no carousel libs.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchScoreboard, todayYmd, type EspnGame, type SportKey } from '@/lib/espn'

const TICKED_SPORTS: { sport: SportKey; href: string; emoji: string }[] = [
  { sport: 'nba',  href: '/nba',  emoji: '🏀' },
  { sport: 'nhl',  href: '/nhl',  emoji: '🏒' },
  { sport: 'mlb',  href: '/mlb',  emoji: '⚾' },
  { sport: 'wnba', href: '/wnba', emoji: '🏀' },
  { sport: 'nfl',  href: '/nfl',  emoji: '🏈' },
  { sport: 'mma',  href: '/boxing', emoji: '🥊' },
  { sport: 'soccerEpl', href: '/soccer', emoji: '⚽' },
  { sport: 'soccerMls', href: '/soccer', emoji: '⚽' },
]

interface SportGames {
  sport: SportKey
  href: string
  emoji: string
  games: EspnGame[]
}

export function LiveScoresStrip() {
  const [allGames, setAllGames] = useState<SportGames[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const results = await Promise.all(
        TICKED_SPORTS.map(async ({ sport, href, emoji }) => {
          try {
            const games = await fetchScoreboard(sport, { date: todayYmd() })
            return { sport, href, emoji, games }
          } catch {
            return { sport, href, emoji, games: [] as EspnGame[] }
          }
        }),
      )
      if (!cancelled) {
        setAllGames(results)
        setLoaded(true)
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Flatten across sports, prioritize live > final > upcoming
  const tiles = allGames.flatMap(({ sport, href, emoji, games }) =>
    games
      // Cap each sport's contribution so one mega-slate (e.g. MLB w/ 15 games)
      // doesn't drown the rest of the ticker
      .slice(0, 6)
      .map((game) => ({ sport, href, emoji, game })),
  )

  const liveTiles = tiles.filter((t) => t.game.status.state === 'in')
  const finalTiles = tiles.filter((t) => t.game.status.state === 'post')
  const upcomingTiles = tiles.filter((t) => t.game.status.state === 'pre')
  const ordered = [...liveTiles, ...finalTiles, ...upcomingTiles].slice(0, 50)

  // Don't render the strip on empty / loading — avoid layout shift
  if (!loaded || ordered.length === 0) return null

  return (
    <div className="border-y border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="flex items-stretch gap-2 overflow-x-auto py-2 -mx-4 px-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {liveTiles.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-1.5 pr-2 mr-1 border-r border-arena-border-l dark:border-arena-border-d">
              <span className="arena-live-dot" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-arena-red whitespace-nowrap">
                {liveTiles.length} Live
              </span>
            </div>
          )}
          {ordered.map(({ sport, href, emoji, game }) => (
            <ScoreTile key={`${sport}-${game.id}`} href={href} emoji={emoji} game={game} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScoreTile({ href, emoji, game }: { href: string; emoji: string; game: EspnGame }) {
  const away = game.competitors.find((c) => c.homeAway === 'away')
  const home = game.competitors.find((c) => c.homeAway === 'home')
  const isLive = game.status.state === 'in'
  const isFinal = game.status.state === 'post'
  const awayScore = Number(away?.score) || 0
  const homeScore = Number(home?.score) || 0
  const awayLeading = (isLive || isFinal) && awayScore > homeScore
  const homeLeading = (isLive || isFinal) && homeScore > awayScore

  return (
    <Link
      href={href}
      className="flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-arena-red hover:bg-arena-card dark:hover:bg-arena-surface transition min-w-[160px]"
    >
      <span className="text-base flex-shrink-0" aria-hidden>{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 leading-tight">
          <span className={`text-[11px] font-bold truncate ${awayLeading ? 'text-arena-red' : ''}`}>
            {away?.abbr ?? 'AWY'}
          </span>
          <span className="text-[11px] font-mono arena-tabular flex-shrink-0">
            {isLive || isFinal ? awayScore : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 leading-tight">
          <span className={`text-[11px] font-bold truncate ${homeLeading ? 'text-arena-red' : ''}`}>
            {home?.abbr ?? 'HME'}
          </span>
          <span className="text-[11px] font-mono arena-tabular flex-shrink-0">
            {isLive || isFinal ? homeScore : ''}
          </span>
        </div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d truncate">
          {isLive ? (
            <span className="text-arena-red">{game.status.detail || 'LIVE'}</span>
          ) : isFinal ? (
            <span>FINAL{game.status.detail?.includes('OT') ? '/OT' : ''}</span>
          ) : (
            <span>
              {(() => {
                const d = new Date(game.date)
                return isNaN(d.getTime())
                  ? game.status.description
                  : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              })()}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default LiveScoresStrip
