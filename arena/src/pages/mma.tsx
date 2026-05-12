import Head from 'next/head'
import { Zap } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'

/**
 * UFC / MMA hub — Phase 1: hero + UFC official channel highlights.
 * Live fight cards, P4P rankings, and fight centers roll in next ship
 * (mma SportKey already wired in lib/espn.ts; ESPN scoreboard supports it).
 */
export default function MmaPage() {
  return (
    <>
      <Head>
        <title>UFC / MMA · SoundChain Arena</title>
        <meta name="description" content="UFC + MMA highlights, fight cards, and fighter centers on SoundChain Arena." />
      </Head>
      <ArenaShell>
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              <Zap className="w-3 h-3" />
              <span>UFC · MMA · WORLDWIDE</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">It&apos;s time.</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
              UFC highlights, knockouts, and fight-card recaps. Live event scoreboards, P4P
              rankings, and fight centers roll in next ship.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Highlights
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">
              @UFC
            </span>
          </div>
          <HighlightsStrip sport="mma" limit={12} />
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Highlights via UFC&apos;s official YouTube channel · Live fight cards + P4P rankings next ship.
        </div>
      </ArenaShell>
    </>
  )
}
