import Head from 'next/head'
import { useRouter } from 'next/router'
import { Trophy, ExternalLink, ArrowLeft } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'

export default function FantasyLeagueDetail() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const upstreamHref = id
    ? `https://soundchain.io/arena/fantasy/${id}`
    : 'https://soundchain.io/arena/fantasy'

  return (
    <>
      <Head>
        <title>League · SoundChain Arena</title>
        <meta name="description" content="Free-to-play NFL fantasy league on SoundChain Arena." />
      </Head>

      <ArenaShell>
        <section className="max-w-3xl mx-auto px-4 py-16">
          <button
            onClick={() => router.push('/fantasy')}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Fantasy
          </button>

          <div className="rounded-2xl border border-arena-border bg-arena-surface p-6 sm:p-10">
            <div className="text-[10px] font-mono tracking-[0.4em] text-cyan-400/80 mb-3 flex items-center gap-2">
              <Trophy className="w-3 h-3" /> LEAGUE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-3">
              League <span className="font-mono text-cyan-300">#{id || '?'}</span>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              League rosters, draft, scoring, and standings live on{' '}
              <code className="text-cyan-300">soundchain.io</code> while
              arena.soundchain.io rolls out. Your league, your data, your trophies — same
              database. This page is the Arena-branded entry point; the full league UI
              opens on soundchain.io.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <PillButton href={upstreamHref} external variant="primary">
                <ExternalLink className="w-4 h-4" /> OPEN LEAGUE on soundchain.io
              </PillButton>
              <PillButton href="/fantasy" variant="ghost">
                Back to Fantasy
              </PillButton>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs text-emerald-200/90 font-mono leading-relaxed">
                <span className="font-bold">Free-to-play league.</span> No stakes, no
                escrow, no entry fees. Bragging rights + leaderboard glory + champion
                trophy NFT only.
              </p>
            </div>
          </div>

          <div className="mt-6 text-[11px] font-mono text-gray-500 tracking-wider text-center">
            Arena Phase 1 · standalone shell · league CRUD shipping next
          </div>
        </section>
      </ArenaShell>
    </>
  )
}
