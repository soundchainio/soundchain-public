import Head from 'next/head'
import { useState } from 'react'
import { SportHubTemplate } from '@/components/SportHubTemplate'
import type { SportKey } from '@/lib/espn'

// Soccer hub — toggle between EPL + MLS. Both feed from ESPN's public
// scoreboard. FIFA World Cup gets its own page (event-based) when in season.
type SoccerLeague = { key: SportKey; label: string; hologram: string; description: string }

const LEAGUES: SoccerLeague[] = [
  {
    key: 'soccerEpl',
    label: 'EPL',
    hologram: 'PREMIER LEAGUE · MATCHDAY',
    description: 'Live English Premier League scores + table + scorers. Auto-refreshes every 60 seconds.',
  },
  {
    key: 'soccerMls',
    label: 'MLS',
    hologram: 'MAJOR LEAGUE SOCCER',
    description: 'Live MLS scores + Eastern + Western Conference tables. Auto-refreshes every 60 seconds.',
  },
]

export default function SoccerPage() {
  const [active, setActive] = useState<SoccerLeague>(LEAGUES[0])

  return (
    <>
      <Head>
        <title>Soccer · SoundChain Arena</title>
      </Head>
      <SportHubTemplate
        sport={active.key}
        title={active.label === 'EPL' ? 'Premier League' : 'Major League Soccer'}
        hologramLabel={active.hologram}
        pageDescription={active.description}
        highlightSeasonType={2}
        extraSection={
          <div className="flex items-center justify-center gap-2">
            {LEAGUES.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setActive(l)}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border transition ${
                  active.key === l.key
                    ? 'bg-arena-red text-white border-arena-red shadow-[0_0_14px_rgba(220,38,38,0.4)]'
                    : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        }
      />
    </>
  )
}
