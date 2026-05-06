import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'

// Stub for sports we've surfaced in PULSE_NOW but don't yet have a real hub
// for — WWE, FIFA WC, Horse Racing, NCAA Hoops. Better than a hard 404.
// `?sport=` query string controls the title. Pages get added as Frank flags
// individual ones for buildout.

const SPORT_COPY: Record<string, { label: string; emoji: string; tease: string }> = {
  ncaa:  { label: 'NCAA Hoops',   emoji: '🏀', tease: 'March Madness mode coming next season' },
  wwe:   { label: 'WWE',          emoji: '🤼', tease: 'PPV cards, results, title histories — wiring up' },
  fifa:  { label: 'FIFA World Cup', emoji: '🌍', tease: 'Group stage + bracket goes live during the next tournament' },
  horse: { label: 'Horse Racing', emoji: '🐎', tease: 'Triple Crown + Breeders Cup + live tote boards' },
}

export default function ComingSoonPage() {
  const router = useRouter()
  const sport = String(router.query.sport ?? '').toLowerCase()
  const copy = SPORT_COPY[sport] ?? { label: 'This sport', emoji: '⚡', tease: 'On the roadmap, lighting up soon' }

  return (
    <>
      <Head>
        <title>{copy.label} · Coming soon · SoundChain Arena</title>
      </Head>
      <ArenaShell>
        <section className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="text-6xl mb-4" aria-hidden>{copy.emoji}</div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-arena-orange/40 text-[10px] font-mono tracking-[0.3em] uppercase text-arena-orange mb-4">
            <Clock className="w-3 h-3" />
            <span>Coming soon</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
            <span className="arena-hologram-text">{copy.label}</span>
          </h1>
          <p className="text-sm sm:text-base text-arena-muted-l dark:text-arena-muted-d max-w-xl mx-auto mb-8">
            {copy.tease}.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red hover:text-arena-red transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to live sports
          </Link>
        </section>
      </ArenaShell>
    </>
  )
}
