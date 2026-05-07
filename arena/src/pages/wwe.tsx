import Head from 'next/head'
import { ArenaShell } from '@/components/ArenaShell'

// WWE hub — curated since ESPN doesn't expose a WWE scoreboard endpoint.
// Hand-maintained arrays of upcoming PPVs + current champions. Edit as new
// events happen. Frank May 6: "NOW not SOON" — this is v1, ship real, polish
// next ship. RSS-based news pull is a follow-up.

interface PPV { name: string; date: string; venue: string; tag: string; spoiler?: string }
interface Champion { title: string; champ: string; since: string; notes?: string }

// Upcoming pay-per-views (calendar). ISO dates so we can sort + filter past.
const UPCOMING_PPVS: PPV[] = [
  { name: 'Backlash France', date: '2026-05-10', venue: 'LDLC Arena · Lyon', tag: 'PREMIUM LIVE EVENT' },
  { name: 'King and Queen of the Ring', date: '2026-05-25', venue: 'Jeddah · Saudi Arabia', tag: 'TOURNAMENT' },
  { name: 'Money in the Bank', date: '2026-07-12', venue: 'Intuit Dome · Inglewood, CA', tag: 'BRIEFCASE' },
  { name: 'SummerSlam', date: '2026-08-02', venue: 'MetLife Stadium · East Rutherford, NJ', tag: 'BIGGEST PARTY' },
]

const CHAMPIONS: Champion[] = [
  { title: 'Undisputed WWE',          champ: 'Cody Rhodes',           since: 'Apr 2026', notes: 'Won at WrestleMania' },
  { title: 'World Heavyweight',       champ: 'Gunther',               since: 'Apr 2026', notes: 'Defeated Damian Priest' },
  { title: 'WWE Women\'s World',      champ: 'Bayley',                since: 'Mar 2026' },
  { title: 'WWE Women\'s',            champ: 'Tiffany Stratton',      since: 'Jan 2026' },
  { title: 'Intercontinental',        champ: 'Bron Breakker',         since: 'Jan 2026' },
  { title: 'United States',           champ: 'LA Knight',             since: 'Apr 2026' },
  { title: 'WWE Tag Team',            champ: 'The Wyatt Sicks',       since: 'Apr 2026' },
  { title: 'WWE Women\'s Tag Team',   champ: 'Liv Morgan & Raquel Rodriguez', since: 'Mar 2026' },
]

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function daysFromNow(iso: string): number {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 0
  const ms = d.getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

export default function WwePage() {
  const now = Date.now()
  const upcoming = UPCOMING_PPVS
    .filter((p) => new Date(p.date).getTime() > now - 86_400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const next = upcoming[0]

  return (
    <>
      <Head>
        <title>WWE · SoundChain Arena</title>
        <meta name="description" content="WWE PPV calendar, current champions, premium live events. Updated each cycle." />
      </Head>

      <ArenaShell>
        {/* Hero w/ next-PPV countdown */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
            <div className="text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
              WWE · PREMIUM LIVE EVENTS
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
              <span className="arena-hologram-text">WWE</span>
            </h1>
            {next && (
              <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-2xl">
                Next up: <span className="font-black text-arena-text-l dark:text-arena-text-d">{next.name}</span>
                {' · '}
                <span className="text-arena-red font-bold">
                  {(() => {
                    const d = daysFromNow(next.date)
                    if (d < 0) return 'Tonight'
                    if (d === 0) return 'Tonight'
                    if (d === 1) return 'Tomorrow'
                    return `${d} days out`
                  })()}
                </span>
                {' · '}{next.venue}
              </p>
            )}
          </div>
        </section>

        {/* Upcoming PPVs */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Upcoming Premium Live Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface p-4 hover:border-arena-red transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-black leading-tight">{p.name}</h3>
                  <span className="flex-shrink-0 text-[9px] font-mono tracking-wider text-arena-red border border-arena-red/40 bg-arena-red/5 px-1.5 py-0.5 rounded-full uppercase">
                    {p.tag}
                  </span>
                </div>
                <div className="text-[12px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                  {fmtDate(p.date)}
                </div>
                <div className="text-[12px] text-arena-text-l dark:text-arena-text-d mt-1">
                  {p.venue}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Current champions */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Current Champions
          </h2>
          <div className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface overflow-hidden">
            <table className="w-full text-sm arena-tabular">
              <thead>
                <tr className="border-b border-arena-border-l dark:border-arena-border-d">
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Title</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Holder</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">Since</th>
                </tr>
              </thead>
              <tbody>
                {CHAMPIONS.map((c) => (
                  <tr key={c.title} className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0">
                    <td className="px-3 py-2 font-bold text-[13px]">{c.title}</td>
                    <td className="px-3 py-2 text-[13px]">
                      <span className="text-arena-red font-bold">{c.champ}</span>
                      {c.notes && (
                        <span className="ml-2 text-[10px] text-arena-muted-l dark:text-arena-muted-d font-mono">· {c.notes}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">{c.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          WWE roster + calendar curated by SoundChain Arena · Live PPV scoring + winners feed coming next ship.
        </div>
      </ArenaShell>
    </>
  )
}
