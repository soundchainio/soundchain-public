import Head from 'next/head'
import { Trophy, Flag } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'

/**
 * Horse racing hub — Phase 1: hero + YouTube highlights via multi-channel
 * aggregator (currently @AtTheRaces, more channels can be added in
 * `lib/youtube.ts → HORSE_RACING_CHANNELS` as Frank ratifies them).
 *
 * Future ships: live race odds, post times, Triple Crown leaderboard,
 * jockey/horse stats. The infra mirrors boxing's multi-channel pattern.
 */

// Triple Crown anchor — the three Grade 1 stakes US racing fans care about most.
const TRIPLE_CROWN = [
  { name: 'Kentucky Derby', track: 'Churchill Downs', date: 'First Sat in May', purse: '$5M' },
  { name: 'Preakness Stakes', track: 'Pimlico', date: 'Third Sat in May', purse: '$2M' },
  { name: 'Belmont Stakes', track: 'Saratoga (2026)', date: 'Mid-June', purse: '$1.5M' },
]

// Other Grade 1 majors worth marking for fans navigating the calendar.
const NOTABLE = [
  { name: 'Breeders\' Cup Classic', track: 'Rotating venue', when: 'Early Nov', purse: '$7M' },
  { name: 'Dubai World Cup', track: 'Meydan', when: 'Late March', purse: '$12M' },
  { name: 'Royal Ascot', track: 'Ascot (UK)', when: 'Mid-June', purse: 'Multi-stake meet' },
  { name: 'Pegasus World Cup', track: 'Gulfstream Park', when: 'Late January', purse: '$3M' },
]

export default function HorseRacingPage() {
  return (
    <>
      <Head>
        <title>Horse Racing · SoundChain Arena</title>
        <meta name="description" content="Horse racing highlights, Triple Crown calendar, and Grade 1 stakes on SoundChain Arena." />
      </Head>
      <ArenaShell>
        {/* Hero */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              <Flag className="w-3 h-3" />
              <span>HORSE RACING · POST TIME COMING</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">The Sport of Kings</span>
            </h1>
            <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
              Triple Crown calendar, Grade 1 stakes highlights, and post-race recaps from major racing networks.
              Live odds + entries roll in next ship.
            </p>
          </div>
        </section>

        {/* Highlights */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Highlights
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">
              @AtTheRaces + more
            </span>
          </div>
          <HighlightsStrip sport="horseRacing" limit={12} />
        </section>

        {/* Triple Crown */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Triple Crown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TRIPLE_CROWN.map((race) => (
              <div
                key={race.name}
                className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface p-4 hover:border-arena-red transition-colors"
              >
                <div className="flex items-center gap-2 text-arena-red mb-2">
                  <Trophy className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">G1 STAKES</span>
                </div>
                <div className="font-black text-lg leading-tight mb-1">{race.name}</div>
                <div className="text-sm text-arena-muted-l dark:text-arena-muted-d">{race.track}</div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-arena-border-l/50 dark:border-arena-border-d/50 font-mono text-[11px]">
                  <span className="text-arena-muted-l dark:text-arena-muted-d">{race.date}</span>
                  <span className="text-arena-orange font-bold">{race.purse}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Other Grade 1 majors */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Other Majors
          </h2>
          <div className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface overflow-hidden">
            <table className="w-full text-sm arena-tabular">
              <thead>
                <tr className="border-b border-arena-border-l dark:border-arena-border-d">
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Race</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">Track</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">When</th>
                  <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Purse</th>
                </tr>
              </thead>
              <tbody>
                {NOTABLE.map((race) => (
                  <tr key={race.name} className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0">
                    <td className="px-3 py-2 font-bold text-[13px]">{race.name}</td>
                    <td className="px-3 py-2 text-[13px] hidden sm:table-cell text-arena-muted-l dark:text-arena-muted-d">{race.track}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-arena-muted-l dark:text-arena-muted-d">{race.when}</td>
                    <td className="px-3 py-2 text-right text-arena-orange font-bold text-[12px]">{race.purse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Horse racing calendar curated by SoundChain Arena · Live odds + post times + jockey stats coming next ship.
        </div>
      </ArenaShell>
    </>
  )
}
