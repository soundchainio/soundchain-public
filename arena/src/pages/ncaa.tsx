import Head from 'next/head'
import { useState } from 'react'
import { SportHubTemplate } from '@/components/SportHubTemplate'
import type { SportKey } from '@/lib/espn'

// NCAA Hoops hub — toggle between Mens + Womens college basketball. Both feed
// from ESPN's public scoreboard. Tournament time = March Madness mode.
type Division = { key: SportKey; label: string; hologram: string; description: string }

const DIVISIONS: Division[] = [
  {
    key: 'ncaaMens',
    label: "Men's",
    hologram: 'NCAA · MARCH MADNESS',
    description: "Live D-I men's college basketball — scoreboard + AP top-25 standings + Final Four bracket. Auto-refreshes every 60 seconds.",
  },
  {
    key: 'ncaaWomens',
    label: "Women's",
    hologram: 'NCAA · WOMEN · BRACKET',
    description: "Live D-I women's college basketball — scoreboard + AP top-25 + bracket. Auto-refreshes every 60 seconds.",
  },
]

export default function NcaaPage() {
  const [active, setActive] = useState<Division>(DIVISIONS[0])

  return (
    <>
      <Head>
        <title>NCAA Hoops · SoundChain Arena</title>
      </Head>
      <SportHubTemplate
        sport={active.key}
        title={active.label === "Men's" ? "NCAA Men's Hoops" : "NCAA Women's Hoops"}
        hologramLabel={active.hologram}
        pageDescription={active.description}
        highlightSeasonType={3}
        extraSection={
          <div className="flex items-center justify-center gap-2">
            {DIVISIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setActive(d)}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border transition ${
                  active.key === d.key
                    ? 'bg-arena-red text-white border-arena-red shadow-[0_0_14px_rgba(220,38,38,0.4)]'
                    : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        }
      />
    </>
  )
}
