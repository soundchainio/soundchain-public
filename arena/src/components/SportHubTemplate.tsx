import Head from 'next/head'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ArenaShell } from './ArenaShell'
import { GameCard } from './GameCard'
import { GameDetailModal } from './GameDetailModal'
import { StandingsTable } from './StandingsTable'
import { LeadersBoard } from './LeadersBoard'
import { HighlightsStrip } from './HighlightsStrip'
import { fetchScoreboard, fetchStandings, todayYmd, SPORT_LEADER_CATEGORIES, type EspnGame, type EspnStandingsGroup, type SportKey } from '@/lib/espn'
import { getLeagueChannel } from '@/lib/youtube'

// ─── Date helpers ──────────────────────────────────────────────────────────

function addYmdDays(yyyymmdd: string, delta: number): string {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  const date = new Date(y, m, d)
  date.setDate(date.getDate() + delta)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function ymdToDate(yyyymmdd: string): Date {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  return new Date(y, m, d)
}

function ymdLabel(yyyymmdd: string, todayYmdStr: string): string {
  if (yyyymmdd === todayYmdStr) return 'Today'
  if (yyyymmdd === addYmdDays(todayYmdStr, -1)) return 'Yesterday'
  if (yyyymmdd === addYmdDays(todayYmdStr, 1)) return 'Tomorrow'
  const d = ymdToDate(yyyymmdd)
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function ymdToInput(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function inputToYmd(iso: string): string {
  return iso.replace(/-/g, '')
}

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
  const [selectedGame, setSelectedGame] = useState<EspnGame | null>(null)
  // Selected scoreboard date — defaults to today, can be navigated back/forward
  // for previous-game stats. Frank's macro feedback May 6: arena was today-only,
  // espn.com/nba.com both surface yesterday's finals + upcoming days too.
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd())
  const todayStr = useMemo(() => todayYmd(), [])
  const isToday = selectedDate === todayStr

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [g, s] = await Promise.all([
          fetchScoreboard(sport, { date: selectedDate, seasonType: highlightSeasonType }),
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
    setLoaded(false)
    load()
    // Only auto-refresh today's games (past dates are immutable, future dates
    // don't change until live)
    if (selectedDate !== todayStr) return () => { cancelled = true }
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [sport, highlightSeasonType, standingsGroupFilter, selectedDate, todayStr])

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
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12 lg:pt-20 lg:pb-16 xl:pt-24 xl:pb-20">
            <div className="flex items-center gap-2 text-[10px] lg:text-xs font-mono tracking-[0.4em] text-arena-orange mb-3">
              {liveGames.length > 0 && <span className="arena-live-dot" />}
              <span>{hologramLabel}</span>
              {liveGames.length > 0 && (
                <span className="text-arena-red font-bold">
                  · {liveGames.length} GAME{liveGames.length === 1 ? '' : 'S'} LIVE
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight mb-2">
              <span className="arena-hologram-text">{title}</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-arena-muted-l dark:text-arena-muted-d max-w-2xl lg:max-w-3xl">
              {pageDescription}
            </p>
          </div>
        </section>

        {/* Games for the selected date — defaults to today, navigable back/forward */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
                {ymdLabel(selectedDate, todayStr)}
              </h2>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red hover:text-arena-red transition"
                >
                  Jump to Today
                </button>
              )}
            </div>
            <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
              {loaded ? `${games.length} game${games.length === 1 ? '' : 's'}` : 'Loading…'}
              {err && ` · ${err}`}
            </span>
          </div>

          {/* Date navigator — prev/next pill row + native date input picker */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedDate(addYmdDays(selectedDate, -1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red hover:text-arena-red transition min-h-[36px]"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Prev</span>
            </button>
            {[-1, 0, 1].map((delta) => {
              const ymd = delta === 0 ? todayStr : addYmdDays(todayStr, delta)
              const label = delta === -1 ? 'Yesterday' : delta === 0 ? 'Today' : 'Tomorrow'
              const isActive = selectedDate === ymd
              return (
                <button
                  key={delta}
                  type="button"
                  onClick={() => setSelectedDate(ymd)}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition min-h-[36px] ${
                    isActive
                      ? 'bg-arena-red text-white border-arena-red shadow-sm'
                      : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setSelectedDate(addYmdDays(selectedDate, 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red hover:text-arena-red transition min-h-[36px]"
              aria-label="Next day"
            >
              <span>Next</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            {/* Native date picker for arbitrary historical dates — falls back gracefully on iOS */}
            <input
              type="date"
              value={ymdToInput(selectedDate)}
              onChange={(e) => e.target.value && setSelectedDate(inputToYmd(e.target.value))}
              className="ml-auto sm:ml-0 px-3 py-2 rounded-full text-[10px] font-mono bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red transition min-h-[36px]"
              aria-label="Pick a date"
            />
          </div>

          {loaded && games.length === 0 && (
            <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-6 py-10 text-center">
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">
                No games on {ymdLabel(selectedDate, todayStr).toLowerCase()}.
                {isToday ? ' Check back tomorrow.' : ' Pick another date above.'}
              </p>
            </div>
          )}

          {liveGames.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-red mb-2 flex items-center gap-2">
                <span className="arena-live-dot" /> Live now
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                {liveGames.map((g) => <GameCard key={g.id} game={g} onSelect={setSelectedGame} />)}
              </div>
            </div>
          )}

          {upcomingGames.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-orange mb-2">
                Upcoming
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                {upcomingGames.map((g) => <GameCard key={g.id} game={g} onSelect={setSelectedGame} />)}
              </div>
            </div>
          )}

          {finalGames.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">
                Final
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                {finalGames.map((g) => <GameCard key={g.id} game={g} onSelect={setSelectedGame} />)}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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

      {selectedGame && (
        <GameDetailModal
          sport={sport}
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  )
}

export default SportHubTemplate
