import Head from 'next/head'
import { ArenaShell } from '@/components/ArenaShell'

// Horse Racing hub — curated since ESPN doesn't expose a tote/scoreboard
// endpoint. Triple Crown + Breeders Cup calendar + recent stakes winners.
// Edit arrays as new races finish. Frank May 6: "NOW not SOON" — v1 ships
// real, polishes next.

interface Race { name: string; date: string; track: string; grade: string; purse: string; winner?: string }
interface Champion { award: string; horse: string; year: number; trainer?: string; jockey?: string }

const TRIPLE_CROWN: Race[] = [
  { name: 'Kentucky Derby',   date: '2026-05-02', track: 'Churchill Downs · Louisville, KY', grade: 'G1', purse: '$5M',  winner: 'TBD post-race' },
  { name: 'Preakness Stakes', date: '2026-05-16', track: 'Pimlico · Baltimore, MD',           grade: 'G1', purse: '$2M' },
  { name: 'Belmont Stakes',   date: '2026-06-06', track: 'Saratoga · Saratoga Springs, NY',   grade: 'G1', purse: '$2M' },
]

const STAKES_AHEAD: Race[] = [
  { name: 'Met Mile',                    date: '2026-06-06', track: 'Saratoga',          grade: 'G1', purse: '$1M' },
  { name: 'Manhattan Stakes',            date: '2026-06-06', track: 'Saratoga',          grade: 'G1', purse: '$1M' },
  { name: 'Stephen Foster',              date: '2026-06-28', track: 'Churchill Downs',   grade: 'G1', purse: '$1M' },
  { name: 'Whitney Stakes',              date: '2026-08-01', track: 'Saratoga',          grade: 'G1', purse: '$1M' },
  { name: 'Travers Stakes (Mid-Summer Derby)', date: '2026-08-22', track: 'Saratoga',    grade: 'G1', purse: '$1.25M' },
  { name: 'Pacific Classic',             date: '2026-08-30', track: 'Del Mar',           grade: 'G1', purse: '$1M' },
  { name: 'Breeders\' Cup World Championships', date: '2026-10-30', track: 'Del Mar',    grade: 'G1', purse: '$31M total' },
]

const HORSE_OF_THE_YEAR: Champion[] = [
  { award: 'Eclipse Horse of the Year',        horse: 'Sierra Leone',    year: 2025, trainer: 'Chad Brown',    jockey: 'Flavien Prat' },
  { award: 'Champion 3-Year-Old Male',         horse: 'Fierceness',      year: 2025 },
  { award: 'Champion Older Dirt Male',         horse: 'White Abarrio',   year: 2025 },
  { award: 'Champion Female Sprinter',         horse: 'Goodnight Olive', year: 2025 },
  { award: 'Champion Turf Female',             horse: 'Inspiral',        year: 2025 },
  { award: 'Triple Crown',                     horse: 'Justify',         year: 2018, trainer: 'Bob Baffert',   jockey: 'Mike Smith' },
]

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function daysFromNow(iso: string): number {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 0
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

export default function HorseRacingPage() {
  const now = Date.now()
  const upcomingTC = TRIPLE_CROWN.filter((r) => new Date(r.date).getTime() > now - 86_400_000)
  const upcomingStakes = STAKES_AHEAD.filter((r) => new Date(r.date).getTime() > now - 86_400_000)
  const nextRace = [...upcomingTC, ...upcomingStakes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )[0]

  return (
    <>
      <Head>
        <title>Horse Racing · SoundChain Arena</title>
        <meta name="description" content="Triple Crown calendar, Breeders Cup, Grade-1 stakes ahead, Horse of the Year + Eclipse award winners." />
      </Head>

      <ArenaShell>
        {/* Hero w/ next race */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
            <div className="text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              HORSE RACING · STAKES + TRIPLE CROWN
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">Horse Racing</span>
            </h1>
            {nextRace && (
              <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
                Next up: <span className="font-black text-arena-text-l dark:text-arena-text-d">{nextRace.name}</span>
                {' · '}
                <span className="text-arena-red font-bold">
                  {(() => {
                    const d = daysFromNow(nextRace.date)
                    if (d <= 0) return 'Today'
                    if (d === 1) return 'Tomorrow'
                    return `${d} days out`
                  })()}
                </span>
                {' · '}{nextRace.track}{' · '}{nextRace.purse}
              </p>
            )}
          </div>
        </section>

        {/* Triple Crown */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Triple Crown · 2026
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TRIPLE_CROWN.map((r) => {
              const past = new Date(r.date).getTime() < now - 86_400_000
              return (
                <div
                  key={r.name}
                  className={`rounded-xl border bg-arena-card dark:bg-arena-surface p-4 transition ${
                    past
                      ? 'border-arena-border-l/40 dark:border-arena-border-d/40 opacity-75'
                      : 'border-arena-red/40 hover:shadow-[0_0_18px_rgba(220,38,38,0.25)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-black leading-tight">{r.name}</h3>
                    <span className="flex-shrink-0 text-[9px] font-mono tracking-wider text-arena-red border border-arena-red/40 bg-arena-red/5 px-1.5 py-0.5 rounded-full">
                      {r.grade}
                    </span>
                  </div>
                  <div className="text-[12px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                    {fmtDate(r.date)}
                  </div>
                  <div className="text-[12px] text-arena-text-l dark:text-arena-text-d mt-1">
                    {r.track}
                  </div>
                  <div className="text-[11px] font-mono text-arena-orange mt-1">{r.purse}</div>
                  {r.winner && (
                    <div className="mt-2 pt-2 border-t border-arena-border-l/50 dark:border-arena-border-d/50 text-[11px]">
                      Winner: <span className="font-black text-arena-red">{r.winner}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Stakes calendar */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Stakes Calendar Ahead
          </h2>
          <div className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface overflow-hidden">
            <table className="w-full text-sm arena-tabular">
              <thead>
                <tr className="border-b border-arena-border-l dark:border-arena-border-d">
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Race</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Date</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">Track</th>
                  <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Purse</th>
                </tr>
              </thead>
              <tbody>
                {upcomingStakes.map((r) => (
                  <tr key={r.name} className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0 hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 transition">
                    <td className="px-3 py-2 font-bold text-[13px]">
                      {r.name}
                      <span className="ml-2 text-[9px] font-mono text-arena-red border border-arena-red/40 bg-arena-red/5 px-1.5 py-0.5 rounded-full">
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-arena-muted-l dark:text-arena-muted-d">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2 text-[12px] hidden sm:table-cell">{r.track}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-arena-orange">{r.purse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Eclipse Awards */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Recent Champions
          </h2>
          <div className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface overflow-hidden">
            <table className="w-full text-sm arena-tabular">
              <thead>
                <tr className="border-b border-arena-border-l dark:border-arena-border-d">
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Award</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Horse</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">Connections</th>
                </tr>
              </thead>
              <tbody>
                {HORSE_OF_THE_YEAR.map((c, i) => (
                  <tr key={`${c.award}-${i}`} className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0">
                    <td className="px-3 py-2 font-bold text-[13px]">{c.award} <span className="ml-1 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">· {c.year}</span></td>
                    <td className="px-3 py-2 text-[13px] text-arena-red font-bold">{c.horse}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">
                      {[c.trainer && `T: ${c.trainer}`, c.jockey && `J: ${c.jockey}`].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Triple Crown + Breeders Cup calendar curated by SoundChain Arena · Live tote board + race results coming next ship.
        </div>
      </ArenaShell>
    </>
  )
}
