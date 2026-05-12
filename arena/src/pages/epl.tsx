import Head from 'next/head'
import { Trophy } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'

/**
 * EPL hub — Phase 1: hero + Premier League official channel highlights.
 * Live fixtures + table + match centers roll in next ship via ESPN
 * (soccerEpl SportKey already wired in lib/espn.ts).
 */
export default function EplPage() {
  return (
    <>
      <Head>
        <title>Premier League · SoundChain Arena</title>
        <meta name="description" content="EPL highlights, fixtures, and match centers on SoundChain Arena." />
      </Head>
      <ArenaShell>
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              <Trophy className="w-3 h-3" />
              <span>PREMIER LEAGUE · ENGLAND</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">The Premier League.</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
              Highlights from the Premier League&apos;s official channel. Live fixtures, table, and
              match centers roll in next ship.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Highlights
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">
              @PremierLeague
            </span>
          </div>
          <HighlightsStrip sport="soccerEpl" limit={12} />
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Highlights via Premier League&apos;s official YouTube channel · Live fixtures + table next ship.
        </div>
      </ArenaShell>
    </>
  )
}
