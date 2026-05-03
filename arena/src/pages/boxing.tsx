import Head from 'next/head'
import { useEffect, useState } from 'react'
import { Newspaper, MapPin, Clock } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'
import { PlayerHeadshot } from '@/components/PlayerHeadshot'
import {
  fetchBoxingFights, fetchBoxingNews, bucketFights, formatFightDate, formatFightTime,
  type BoxingFight, type BoxingNewsItem,
} from '@/lib/boxing'

function FightCard({ fight }: { fight: BoxingFight }) {
  const { red, blue } = fight.fighters
  const isLive = fight.state === 'in'
  const isFinal = fight.state === 'post'
  const winnerWasRed = isFinal && fight.winnerId && red?.id === fight.winnerId
  const winnerWasBlue = isFinal && fight.winnerId && blue?.id === fight.winnerId

  return (
    <article
      className={`rounded-xl border bg-arena-card dark:bg-arena-surface p-4 transition-colors ${
        isLive
          ? 'border-arena-red shadow-[0_0_0_1px_rgba(220,38,38,0.4)]'
          : 'border-arena-border-l dark:border-arena-border-d'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive && <span className="arena-live-dot" />}
          <span
            className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              isLive
                ? 'text-arena-red'
                : isFinal
                  ? 'text-arena-yellow'
                  : 'text-arena-orange'
            }`}
          >
            {isLive ? 'LIVE' : isFinal ? 'FINAL' : formatFightDate(fight.date)}
          </span>
        </div>
        {fight.network && (
          <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d uppercase">
            {fight.network}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
        <div className={`flex flex-col items-center gap-2 ${winnerWasRed ? '' : winnerWasBlue ? 'opacity-50' : ''}`}>
          <PlayerHeadshot
            src={red?.headshotUrl}
            name={red?.displayName ?? 'TBD'}
            size={64}
            ringColor={winnerWasRed ? '#dc2626' : undefined}
          />
          <div className="text-center">
            <p className="text-sm font-bold leading-tight line-clamp-2">{red?.displayName ?? 'TBD'}</p>
            {red?.record && (
              <p className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d arena-tabular">
                {red.record}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs font-black tracking-widest text-arena-muted-l dark:text-arena-muted-d">VS</span>
        <div className={`flex flex-col items-center gap-2 ${winnerWasBlue ? '' : winnerWasRed ? 'opacity-50' : ''}`}>
          <PlayerHeadshot
            src={blue?.headshotUrl}
            name={blue?.displayName ?? 'TBD'}
            size={64}
            ringColor={winnerWasBlue ? '#dc2626' : undefined}
          />
          <div className="text-center">
            <p className="text-sm font-bold leading-tight line-clamp-2">{blue?.displayName ?? 'TBD'}</p>
            {blue?.record && (
              <p className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d arena-tabular">
                {blue.record}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-[11px] text-arena-muted-l dark:text-arena-muted-d">
        {fight.weightClass && (
          <p className="font-mono uppercase tracking-wider">{fight.weightClass}</p>
        )}
        {fight.detail && !isLive && <p>{fight.detail}</p>}
        {fight.venue?.name && (
          <p className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>
              {fight.venue.name}
              {fight.venue.city ? `, ${fight.venue.city}` : ''}
            </span>
          </p>
        )}
        {!isFinal && !isLive && fight.date && (
          <p className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatFightTime(fight.date)}</span>
          </p>
        )}
      </div>
    </article>
  )
}

export default function BoxingPage() {
  const [fights, setFights] = useState<BoxingFight[]>([])
  const [news, setNews] = useState<BoxingNewsItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [f, n] = await Promise.all([
          fetchBoxingFights().catch(() => [] as BoxingFight[]),
          fetchBoxingNews(15).catch(() => [] as BoxingNewsItem[]),
        ])
        if (!cancelled) {
          setFights(f)
          setNews(n)
          setLoaded(true)
          setErr(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? 'Boxing data unavailable')
          setLoaded(true)
        }
      }
    }
    run()
    const id = setInterval(run, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const { live, upcoming, recent } = bucketFights(fights)

  return (
    <>
      <Head>
        <title>Boxing · SoundChain Arena</title>
        <meta name="description" content="Live fight cards, recent results, weight-class watch, and highlights from Top Rank, PBC, Matchroom, DAZN and more." />
      </Head>

      <ArenaShell>
        {/* Hero */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              {live.length > 0 && <span className="arena-live-dot" />}
              <span>BOXING · FIGHT NIGHT</span>
              {live.length > 0 && (
                <span className="text-arena-red font-bold">
                  · {live.length} LIVE
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-2">
              <span className="arena-hologram-text">Boxing</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
              Fight cards, weight-class watch, and highlights from Top Rank, PBC, Matchroom and DAZN — auto-refreshed.
            </p>
          </div>
        </section>

        {/* Live + upcoming + recent */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10 space-y-8">
          {!loaded && (
            <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d p-10 text-center text-sm text-arena-muted-l dark:text-arena-muted-d">
              Loading fight cards…
            </div>
          )}

          {loaded && fights.length === 0 && !err && (
            <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-6 py-10 text-center">
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">
                No fight cards on ESPN's board right now. Highlights below.
              </p>
            </div>
          )}

          {live.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-red mb-3 flex items-center gap-2">
                <span className="arena-live-dot" /> Live now
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {live.map((f) => <FightCard key={f.id} fight={f} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-orange mb-3">Upcoming</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map((f) => <FightCard key={f.id} fight={f} />)}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-3">Recent</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recent.map((f) => <FightCard key={f.id} fight={f} />)}
              </div>
            </div>
          )}
        </section>

        {/* Highlights — multi-promotion aggregate */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Highlights
            </h2>
            <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
              Top Rank · PBC · Matchroom · DAZN · YouTube
            </span>
          </div>
          <HighlightsStrip sport="boxing" limit={16} />
        </section>

        {/* News */}
        {news.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4 flex items-center gap-2">
              <Newspaper className="w-3.5 h-3.5" /> News
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {news.slice(0, 9).map((n) => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden hover:border-arena-red transition-colors group"
                >
                  {n.imageUrl && (
                    <div className="aspect-video overflow-hidden bg-arena-bg-l dark:bg-arena-bg-d">
                      <img
                        src={n.imageUrl}
                        alt={n.headline}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-bold line-clamp-2 leading-tight mb-1">{n.headline}</p>
                    {n.description && (
                      <p className="text-[11px] text-arena-muted-l dark:text-arena-muted-d line-clamp-2">{n.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Data: ESPN public boxing scoreboard · Auto-refresh 60s · Highlights via official YouTube channels.
        </div>
      </ArenaShell>
    </>
  )
}
