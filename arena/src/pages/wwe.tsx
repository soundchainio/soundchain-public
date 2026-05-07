import Head from 'next/head'
import { useState } from 'react'
import { ArenaShell } from '@/components/ArenaShell'
import { WweEventDetailModal, WwePpvDetail } from '@/components/WweEventDetailModal'

// WWE hub — curated since ESPN doesn't expose a deep WWE scoreboard endpoint.
// Hand-maintained PPV calendar w/ full match cards. ESPN's WWE coverage is
// thin (news + scoreboard only, no match centers, no card breakdowns) so the
// beat-ESPN bar is "actually show what's on the card" — done w/ this ship.
// Future ship: ingest dirtsheet RSS + Wikipedia card-page scraping for auto-fill.

interface Champion { title: string; champ: string; since: string; notes?: string }

const UPCOMING_PPVS: WwePpvDetail[] = [
  {
    name: 'Backlash France',
    date: '2026-05-10',
    venue: 'LDLC Arena · Lyon',
    tag: 'PREMIUM LIVE EVENT',
    preview:
      'WWE returns to France for the first time on PLE. Cody Rhodes defends the Undisputed title in his first home-soil-of-his-rival defense; the international crowd response is the storyline.',
    card: [
      {
        type: 'Singles Match',
        participants: [['LA Knight'], ['Logan Paul']],
      },
      {
        type: 'Triple Threat',
        titleOnLine: 'Intercontinental Championship',
        champion: 'Bron Breakker',
        participants: [['Bron Breakker'], ['Sami Zayn'], ['Penta']],
      },
      {
        type: 'Tag Team',
        titleOnLine: 'WWE Tag Team Championship',
        champion: 'The Wyatt Sicks',
        participants: [['The Wyatt Sicks (Uncle Howdy & Joe Gacy)'], ['#DIY (Johnny Gargano & Tommaso Ciampa)']],
      },
      {
        type: 'Singles Match',
        titleOnLine: "WWE Women's World Championship",
        champion: 'Bayley',
        participants: [['Bayley'], ['Naomi']],
      },
      {
        type: 'Singles Match',
        stipulation: 'Last Man Standing',
        participants: [['AJ Styles'], ['Karrion Kross']],
      },
      {
        type: 'Singles Match',
        titleOnLine: 'World Heavyweight Championship',
        champion: 'Gunther',
        participants: [['Gunther'], ['Jey Uso']],
      },
      {
        type: 'Singles Match',
        titleOnLine: 'Undisputed WWE Championship',
        champion: 'Cody Rhodes',
        participants: [['Cody Rhodes'], ['Damian Priest']],
      },
    ],
  },
  {
    name: 'King and Queen of the Ring',
    date: '2026-05-25',
    venue: 'Jeddah · Saudi Arabia',
    tag: 'TOURNAMENT',
    preview:
      'The annual Saudi tournament returns. Eight-man + eight-woman brackets crown new King + Queen, who earn future title shots. Title matches close the show on either side of the tournament finals.',
    card: [
      {
        type: "King of the Ring · Quarterfinals",
        participants: [['Drew McIntyre'], ['Sheamus']],
      },
      {
        type: "Queen of the Ring · Quarterfinals",
        participants: [['Rhea Ripley'], ['Lyra Valkyria']],
      },
      {
        type: 'Singles Match',
        titleOnLine: 'United States Championship',
        champion: 'LA Knight',
        participants: [['LA Knight'], ['Solo Sikoa']],
      },
      {
        type: "King of the Ring · Final",
        participants: [['TBD'], ['TBD']],
      },
      {
        type: "Queen of the Ring · Final",
        participants: [['TBD'], ['TBD']],
      },
      {
        type: 'Singles Match',
        titleOnLine: 'Undisputed WWE Championship',
        champion: 'Cody Rhodes',
        participants: [['Cody Rhodes'], ['Roman Reigns']],
      },
    ],
  },
  {
    name: 'Money in the Bank',
    date: '2026-07-12',
    venue: 'Intuit Dome · Inglewood, CA',
    tag: 'BRIEFCASE',
    preview:
      'The annual ladder match for a year-long world title contract. Two briefcases (Men + Women) hang above the ring. Cash-in on the same night has happened twice in the history of MITB; expect the threat all night.',
    card: [
      {
        type: 'Tag Team',
        titleOnLine: "WWE Women's Tag Team Championship",
        champion: 'Liv Morgan & Raquel Rodriguez',
        participants: [['Liv Morgan & Raquel Rodriguez'], ['Bianca Belair & Jade Cargill']],
      },
      {
        type: 'Singles Match',
        titleOnLine: "WWE Women's Championship",
        champion: 'Tiffany Stratton',
        participants: [['Tiffany Stratton'], ['Nia Jax']],
      },
      {
        type: '6-Man Ladder Match',
        stipulation: 'Money in the Bank',
        participants: [
          ['Jey Uso'],
          ['Carmelo Hayes'],
          ['Andrade'],
          ['Shinsuke Nakamura'],
          ['Bron Breakker'],
          ['Pete Dunne'],
        ],
      },
      {
        type: '6-Woman Ladder Match',
        stipulation: 'Money in the Bank',
        participants: [
          ['IYO SKY'],
          ['Chelsea Green'],
          ['Zoey Stark'],
          ['Naomi'],
          ['Roxanne Perez'],
          ['Piper Niven'],
        ],
      },
    ],
  },
  {
    name: 'SummerSlam',
    date: '2026-08-02',
    venue: 'MetLife Stadium · East Rutherford, NJ',
    tag: 'BIGGEST PARTY',
    preview:
      'WWE\'s biggest party of the summer goes two-night for the third year running. MetLife host means stadium-sized stipulations expected; insiders point to a returning legend in the marquee match.',
    card: [
      {
        type: 'Singles Match',
        stipulation: 'Street Fight',
        participants: [['Sami Zayn'], ['Kevin Owens']],
      },
      {
        type: 'Singles Match',
        titleOnLine: 'Intercontinental Championship',
        champion: 'TBD',
        participants: [['TBD'], ['TBD']],
      },
      {
        type: '5-Way Match',
        titleOnLine: 'United States Championship',
        champion: 'TBD',
        participants: [['TBD'], ['TBD'], ['TBD'], ['TBD'], ['TBD']],
      },
      {
        type: 'Singles Match',
        titleOnLine: "WWE Women's World Championship",
        champion: 'TBD',
        participants: [['TBD'], ['TBD']],
      },
      {
        type: 'Singles Match',
        titleOnLine: 'World Heavyweight Championship',
        champion: 'TBD',
        participants: [['TBD'], ['TBD']],
      },
      {
        type: 'Singles Match',
        stipulation: 'Hell in a Cell',
        titleOnLine: 'Undisputed WWE Championship',
        champion: 'TBD',
        participants: [['TBD'], ['TBD']],
      },
    ],
  },
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
  const [selected, setSelected] = useState<WwePpvDetail | null>(null)

  const now = Date.now()
  const upcoming = UPCOMING_PPVS
    .filter((p) => new Date(p.date).getTime() > now - 86_400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const next = upcoming[0]

  return (
    <>
      <Head>
        <title>WWE · SoundChain Arena</title>
        <meta name="description" content="WWE PPV calendar with full match cards. Tap any event for the complete card breakdown — wrestlers, stipulations, and titles on the line." />
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
            Upcoming Premium Live Events · Tap for Full Card
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelected(p)}
                aria-label={`Open match card for ${p.name}`}
                className="group text-left rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface p-4 hover:border-arena-red focus:border-arena-red focus:outline-none transition min-h-[44px]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-black leading-tight group-hover:text-arena-red transition-colors">{p.name}</h3>
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
                <div className="mt-3 pt-3 border-t border-arena-border-l/30 dark:border-arena-border-d/30 flex items-center justify-between text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                  <span>{p.card.length} matches on the card</span>
                  <span className="text-arena-red opacity-0 group-hover:opacity-100 transition-opacity">View Card →</span>
                </div>
              </button>
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

      <WweEventDetailModal ppv={selected} onClose={() => setSelected(null)} />
    </>
  )
}
