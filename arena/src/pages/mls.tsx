import Head from 'next/head'
import { Trophy } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'

/**
 * MLS hub — Phase 1: hero + Major League Soccer official channel highlights.
 * Live fixtures + table + match centers roll in next ship via ESPN
 * (soccerMls SportKey already wired in lib/espn.ts).
 */
export default function MlsPage() {
  return (
    <>
      <Head>
        <title>MLS · SoundChain Arena</title>
        <meta name="description" content="MLS highlights, fixtures, and match centers on SoundChain Arena." />
      </Head>
      <ArenaShell>
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              <Trophy className="w-3 h-3" />
              <span>MAJOR LEAGUE SOCCER · USA · CANADA</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">Major League Soccer.</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
              Highlights from MLS&apos;s official channel. Live fixtures, table, and match centers
              roll in next ship.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Highlights
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">
              @MLS
            </span>
          </div>
          <HighlightsStrip sport="soccerMls" limit={12} />
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Highlights via MLS&apos;s official YouTube channel · Live fixtures + table next ship.
        </div>
      </ArenaShell>
    </>
  )
}
