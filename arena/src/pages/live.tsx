import Head from 'next/head'
import { useEffect, useState } from 'react'
import { Activity, Tv } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { GameCard } from '@/components/GameCard'
import { GameDetailModal } from '@/components/GameDetailModal'
import { fetchScoreboard, todayYmd, type EspnGame, type SportKey } from '@/lib/espn'

interface SportBucket {
  sport: SportKey
  label: string
  emoji: string
  liveCount: number
  games: EspnGame[]
}

const SPORTS_TO_AGGREGATE: { sport: SportKey; label: string; emoji: string; seasonType?: 1 | 2 | 3 }[] = [
  { sport: 'nba',        label: 'NBA',          emoji: '🏀', seasonType: 3 },
  { sport: 'nhl',        label: 'NHL',          emoji: '🏒', seasonType: 3 },
  { sport: 'mlb',        label: 'MLB',          emoji: '⚾', seasonType: 2 },
  { sport: 'soccerEpl',  label: 'EPL',          emoji: '⚽' },
  { sport: 'soccerMls',  label: 'MLS',          emoji: '⚽' },
  { sport: 'mma',        label: 'UFC / MMA',    emoji: '🥊' },
]

export default function LiveScoreboardPage() {
  const [buckets, setBuckets] = useState<SportBucket[]>([])
  const [loaded, setLoaded] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selected, setSelected] = useState<{ game: EspnGame; sport: SportKey } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const date = todayYmd()
      const results = await Promise.all(
        SPORTS_TO_AGGREGATE.map(async (s) => {
          try {
            const games = await fetchScoreboard(s.sport, { date, seasonType: s.seasonType })
            const liveCount = games.filter((g) => g.status.state === 'in').length
            return { sport: s.sport, label: s.label, emoji: s.emoji, liveCount, games }
          } catch (_) {
            return { sport: s.sport, label: s.label, emoji: s.emoji, liveCount: 0, games: [] }
          }
        })
      )
      if (!cancelled) {
        setBuckets(results)
        setLoaded(true)
        setLastUpdated(new Date())
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const totalLive = buckets.reduce((sum, b) => sum + b.liveCount, 0)
  const totalGames = buckets.reduce((sum, b) => sum + b.games.length, 0)
  const liveGames = buckets.flatMap((b) =>
    b.games.filter((g) => g.status.state === 'in').map((g) => ({ ...g, _bucket: b }))
  )

  return (
    <>
      <Head>
        <title>Live Scoreboard · SoundChain Arena</title>
        <meta
          name="description"
          content="Every live game across every major league on one page. NBA, NHL, MLB, EPL, MLS, MMA — auto-refreshing every 60 seconds. The RedZone-style dashboard for stats fans."
        />
      </Head>

      <ArenaShell>
        {/* Hero */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              <Activity className="w-3 h-3" />
              <span>LIVE · ALL-SPORTS DASHBOARD</span>
              {totalLive > 0 && (
                <span className="text-arena-red font-bold flex items-center gap-1.5">
                  <span className="arena-live-dot" /> {totalLive} LIVE
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">What&apos;s on right now.</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl mb-2">
              Every live game across every major league. One page. Auto-refresh every 60 seconds.
              The RedZone-style dashboard — for free, without the cable bill.
            </p>
            {lastUpdated && (
              <p className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                Last refresh: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </section>

        {/* League pills */}
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {buckets.map((b) => (
              <a
                key={b.sport}
                href={`#bucket-${b.sport}`}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border border-arena-border-l dark:border-arena-border-d hover:border-arena-red text-xs font-bold transition"
              >
                <span>{b.emoji}</span>
                <span>{b.label}</span>
                {b.liveCount > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-arena-red text-white text-[10px]">
                    <span className="arena-live-dot" /> {b.liveCount}
                  </span>
                )}
                {b.liveCount === 0 && b.games.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-arena-muted-l dark:text-arena-muted-d border border-arena-border-l dark:border-arena-border-d text-[10px] arena-tabular">
                    {b.games.length}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>

        {/* LIVE NOW super-row */}
        {liveGames.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-red mb-4 flex items-center gap-2">
              <span className="arena-live-dot" /> Live now · {liveGames.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveGames.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono tracking-wider text-arena-muted-l dark:text-arena-muted-d">
                    <span>{g._bucket.emoji}</span>
                    <span>{g._bucket.label}</span>
                  </div>
                  <GameCard game={g} onSelect={(game) => setSelected({ game, sport: g._bucket.sport })} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Per-sport buckets */}
        <section className="max-w-7xl mx-auto px-4 pb-10">
          {loaded && totalGames === 0 && (
            <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-6 py-12 text-center">
              <Tv className="w-8 h-8 text-arena-muted-l dark:text-arena-muted-d mx-auto mb-3" />
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">
                Quiet day — no games scheduled across the major leagues right now.
              </p>
            </div>
          )}

          {buckets.filter((b) => b.games.length > 0).map((b) => (
            <div key={b.sport} id={`bucket-${b.sport}`} className="mb-8 sm:mb-10 scroll-mt-24">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <span>{b.emoji}</span>
                  <span>{b.label}</span>
                  {b.liveCount > 0 && (
                    <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-arena-red text-white text-[10px]">
                      <span className="arena-live-dot" /> LIVE
                    </span>
                  )}
                </h3>
                <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                  {b.games.length} game{b.games.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {b.games.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    onSelect={(game) => setSelected({ game, sport: b.sport })}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Data: ESPN public scoreboard · F1 via Jolpica · Auto-refresh 60s · No bets, no wagers, real stats only.
        </div>
      </ArenaShell>

      {selected && (
        <GameDetailModal
          sport={selected.sport}
          game={selected.game}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
