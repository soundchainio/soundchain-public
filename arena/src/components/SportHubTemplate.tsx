import Head from 'next/head'
import { ReactNode, useEffect, useState } from 'react'
import { ArenaShell } from './ArenaShell'
import { GameCard } from './GameCard'
import { StandingsTable } from './StandingsTable'
import { LeadersBoard } from './LeadersBoard'
import { HighlightsStrip } from './HighlightsStrip'
import { fetchScoreboard, fetchStandings, todayYmd, SPORT_LEADER_CATEGORIES, type EspnGame, type EspnStandingsGroup, type SportKey } from '@/lib/espn'
import { getLeagueChannel } from '@/lib/youtube'

interface SportHubTemplateProps {
  sport: SportKey
  title: string                  // "NBA Playoffs"
  pageDescription: string
  hologramLabel: string          // "NBA · PLAYOFFS"
  highlightSeasonType?: 1 | 2 | 3 // 3 = playoffs
  /** "Eastern Conference" / "Western Conference" — limits standings groups */
  standingsGroupFilter?: (name: string) => boolean
  showOtLosses?: boolean         // NHL
  highlightPlayoffSeeds?: number // top N rows = playoff seeds (red text)
  extraSection?: ReactNode       // any sport-specific add-on (e.g. F1 podium card)
}

/** Polls ESPN scoreboard + standings every 60s. Renders shared sport hub layout. */
export function SportHubTemplate(props: SportHubTemplateProps) {
  const {
    sport, title, pageDescription, hologramLabel,
    highlightSeasonType, standingsGroupFilter, showOtLosses, highlightPlayoffSeeds,
    extraSection,
  } = props

  const [games, setGames] = useState<EspnGame[]>([])
  const [standings, setStandings] = useState<EspnStandingsGroup[]>([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [g, s] = await Promise.all([
          fetchScoreboard(sport, { date: todayYmd(), seasonType: highlightSeasonType }),
          fetchStandings(sport),
        ])
        if (!cancelled) {
          setGames(g)
          const filtered = standingsGroupFilter ? s.filter((x) => standingsGroupFilter(x.name)) : s
          setStandings(filtered.length ? filtered : s)
          setLoaded(true)
          setErr(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'Data unavailable')
          setLoaded(true)
        }
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [sport, highlightSeasonType, standingsGroupFilter])

  const liveGames = games.filter((g) => g.status.state === 'in')
  const upcomingGames = games.filter((g) => g.status.state === 'pre')
  const finalGames = games.filter((g) => g.status.state === 'post')

  return (
    <>
      <Head>
        <title>{title} · SoundChain Arena</title>
        <meta name="description" content={pageDescription} />
      </Head>

      <ArenaShell>
        {/* Hero */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              {liveGames.length > 0 && <span className="arena-live-dot" />}
              <span>{hologramLabel}</span>
              {liveGames.length > 0 && (
                <span className="text-arena-red font-bold">
                  · {liveGames.length} GAME{liveGames.length === 1 ? '' : 'S'} LIVE
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-2">
              <span className="arena-hologram-text">{title}</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
              {pageDescription}
            </p>
          </div>
        </section>

        {/* Today's Games */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Today
            </h2>
            <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
              {loaded ? `${games.length} game${games.length === 1 ? '' : 's'}` : 'Loading…'}
              {err && ` · ${err}`}
            </span>
          </div>

          {loaded && games.length === 0 && (
            <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-6 py-10 text-center">
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">
                No games scheduled today. Check back tomorrow.
              </p>
            </div>
          )}

          {liveGames.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-red mb-2 flex items-center gap-2">
                <span className="arena-live-dot" /> Live now
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveGames.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}

          {upcomingGames.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-orange mb-2">
                Upcoming
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingGames.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}

          {finalGames.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">
                Final
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {finalGames.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}
        </section>

        {/* Stat Leaders — only when ESPN exposes them for this sport */}
        {SPORT_LEADER_CATEGORIES[sport] && (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
              Stat Leaders
            </h2>
            <LeadersBoard sport={sport} seasonType={highlightSeasonType} topN={5} />
          </section>
        )}

        {/* Highlights — only when official YouTube channel is mapped */}
        {getLeagueChannel(sport) && (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
                Highlights
              </h2>
              <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                via {getLeagueChannel(sport)?.name} · YouTube
              </span>
            </div>
            <HighlightsStrip sport={sport} limit={12} />
          </section>
        )}

        {extraSection && (
          <section className="max-w-7xl mx-auto px-4 py-6">{extraSection}</section>
        )}

        {/* Standings */}
        {standings.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
              Standings
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {standings.map((g) => (
                <StandingsTable
                  key={g.name}
                  group={g}
                  showOtLosses={showOtLosses}
                  highlightTop={highlightPlayoffSeeds}
                />
              ))}
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Data: ESPN public scoreboard · Auto-refresh every 60s · No bets, no wagers, real stats only.
        </div>
      </ArenaShell>
    </>
  )
}

export default SportHubTemplate
