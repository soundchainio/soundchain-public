import Head from 'next/head'
import { Trophy, Plus, Users, Calendar, Award, Zap } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'

const HOW_IT_WORKS = [
  { title: 'Snake draft',          body: '12 teams, 15-round serpentine draft. Every NFL player + DST eligible. Auto-draft if you no-show.' },
  { title: 'PPR scoring · live',   body: 'Standard PPR. Receptions count 1.0. Stats sync from ESPN every 30 minutes during NFL games.' },
  { title: 'Top-4 playoffs',        body: 'Regular season Wks 1-14. Top 4 seed by record + total points. Wk 15 semis, Wk 16 final.' },
  { title: 'Trophy NFT for the champ', body: 'Champion mints a soulbound NFT trophy with league name, year, and stat line. Non-transferable — pure flex.' },
  { title: 'Free-to-play, no entry fees', body: 'No prize pools. No money in or out. Just leagues and leaderboards.' },
  { title: 'Bragging rights forever', body: 'League page stays live forever — historic rosters, scores, MVPs all preserved.' },
]

export default function FantasyDiscovery() {
  return (
    <>
      <Head>
        <title>Fantasy Football · SoundChain Arena</title>
        <meta
          name="description"
          content="Free-to-play NFL fantasy leagues. Live PPR scoring, snake draft, top-4 playoffs, trophy NFT for the champion. No entry fees, no prize pools — bragging rights only."
        />
      </Head>

      <ArenaShell>
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-5xl mx-auto px-4 pt-12 pb-12 sm:pt-16 sm:pb-16">
            <div className="text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3 flex items-center gap-2">
              <Trophy className="w-3 h-3" /> NFL FANTASY · 2026 SEASON
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">
              <span className="arena-hologram-text">Free-to-play</span> NFL fantasy.
            </h1>
            <p className="max-w-2xl text-base text-arena-muted-l dark:text-arena-muted-d leading-relaxed mb-6">
              Live PPR scoring · Snake draft · Top-4 playoffs · Trophy NFT for the
              champion. No entry fees, no prize pools — just bragging rights and
              leaderboard glory.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <PillButton href="https://soundchain.io/arena/fantasy" external variant="primary">
                <Plus className="w-4 h-4" /> CREATE LEAGUE on soundchain.io
              </PillButton>
              <PillButton href="https://soundchain.io/arena/fantasy" external variant="secondary">
                <Users className="w-4 h-4" /> JOIN A LEAGUE
              </PillButton>
            </div>
            <p className="mt-4 text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d tracking-wider">
              League creation + drafting still happens on soundchain.io while
              arena.soundchain.io rolls out. Same database, same leagues, same
              leaderboards — just a cleaner Arena home.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-6">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-5"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-arena-red/10 border border-arena-red/30 flex items-center justify-center text-arena-red font-mono text-sm font-bold flex-shrink-0 arena-tabular">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-bold pt-1">{step.title}</h3>
                </div>
                <p className="text-sm text-arena-muted-l dark:text-arena-muted-d leading-relaxed pl-11">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-6">
            Season at a glance
          </h2>
          <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Regular season" value="Wks 1–14" icon={Calendar} />
              <Stat label="Playoffs" value="Wks 15–16" icon={Trophy} />
              <Stat label="League size" value="12 teams" icon={Users} />
              <Stat label="Champion gets" value="🏆 NFT" icon={Award} />
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="rounded-2xl border border-arena-red/20 bg-gradient-to-r from-arena-red/10 via-arena-orange/5 to-arena-yellow/10 p-6 text-center">
            <Zap className="w-8 h-8 text-arena-red mx-auto mb-3" />
            <h3 className="text-xl sm:text-2xl font-black mb-2">
              Champion gets bragging rights forever.
            </h3>
            <p className="text-sm text-arena-muted-l dark:text-arena-muted-d mb-5">
              Plus a soulbound trophy NFT minted at season end. Non-transferable. Pure flex.
            </p>
            <PillButton href="https://soundchain.io/arena/fantasy" external variant="primary">
              CREATE LEAGUE →
            </PillButton>
          </div>
        </section>
      </ArenaShell>
    </>
  )
}

function Stat({
  label, value, icon: Icon,
}: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="text-center">
      <Icon className="w-5 h-5 text-arena-red mx-auto mb-2" />
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d tracking-wider mt-1">
        {label}
      </div>
    </div>
  )
}
