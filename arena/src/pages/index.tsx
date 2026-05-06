import Head from 'next/head'
import Link from 'next/link'
import { Trophy, Swords, Activity, Flag, Zap, ArrowRight } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'
import { LiveTakesFeed } from '@/components/LiveTakesFeed'
import { LiveScoresStrip } from '@/components/LiveScoresStrip'

const PULSE_NOW = [
  { href: '/nba',    label: 'NBA Playoffs',     emoji: '🏀', accent: 'NOW' },
  { href: '/nhl',    label: 'Stanley Cup',      emoji: '🏒', accent: 'NOW' },
  { href: '/mlb',    label: 'MLB Daily',        emoji: '⚾', accent: 'TODAY' },
  { href: '/f1',     label: 'Formula 1',        emoji: '🏎️', accent: 'WKND' },
]

const FEATURE_BULLETS = [
  '✓ Every league, one app — NBA · NHL · MLB · F1 · UFC · EPL · MLS',
  '✓ Live scoreboard auto-refreshes every 60 seconds',
  '✓ Free-to-play fantasy + 1v1 console challenges',
  '✓ Trophy NFTs for season champs (soulbound, non-transferable)',
  '✓ Light by default, dark mode one tap away',
  '✓ Native iOS + Android coming via Capacitor',
]

export default function ArenaHub() {
  return (
    <>
      <Head>
        <title>SoundChain Arena · Real stats, free fantasy, every league</title>
        <meta
          name="description"
          content="The all-in-one stats app for sports fans. Live scores across NBA, NHL, MLB, F1, UFC, EPL — auto-refreshing, ad-free. Free-to-play fantasy + 1v1 console challenges layered on top. Bragging rights only."
        />
        <meta property="og:title" content="SoundChain Arena" />
        <meta
          property="og:description"
          content="Every league, one app. Live stats + free-to-play fantasy + 1v1 console challenges. Bragging rights only."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://arena.soundchain.io" />
      </Head>

      <ArenaShell>
        {/* ESPN-style live scores ticker — top of every hub page, auto-refresh
            60s, hidden when no games. Frank May 6: pointed at espn.com main
            page as macro reference; this is the anchor of that pattern. */}
        <LiveScoresStrip />

        {/* Hero */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-12 pb-14 sm:pt-20 sm:pb-20 text-center">
            <div className="text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-4">
              FREE-TO-PLAY · NO ENTRY FEES · REAL STATS
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5">
              The <span className="arena-hologram-text">stats app</span> sports fans deserve.
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-arena-muted-l dark:text-arena-muted-d leading-relaxed mb-8">
              Every league. Live scores. Standings. Trophies. Free-to-play fantasy + 1v1
              console challenges layered on top. Ad-free. Bet-free. Just real sports.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <PillButton href="/live" variant="primary">
                <Activity className="w-4 h-4" /> WHAT&apos;S LIVE NOW
              </PillButton>
              <PillButton href="/nba" variant="secondary">
                <Trophy className="w-4 h-4" /> NBA PLAYOFFS
              </PillButton>
            </div>
          </div>
        </section>

        {/* Pulse strip — what's hot RIGHT NOW */}
        <section className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            The Pulse · Right now
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PULSE_NOW.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-5 hover:border-arena-red transition flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <span className="text-[10px] font-mono tracking-wider text-arena-red border border-arena-red/40 bg-arena-red/5 px-2 py-0.5 rounded-full">
                    {p.accent}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mb-2">{p.label}</h3>
                <span className="mt-auto text-xs font-bold text-arena-red flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Live takes — cross-game fan engagement stream */}
        <LiveTakesFeed />

        {/* Free-to-play layer cards */}
        <section className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
            Layer up · Free-to-play
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-6 hover:border-arena-red transition">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-arena-red/10 border border-arena-red/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-arena-red" />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5">
                  LIVE
                </span>
              </div>
              <h3 className="text-xl font-black mb-2">Fantasy Football</h3>
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d leading-relaxed mb-4">
                12-team snake draft · Live PPR scoring · Top-4 playoffs · Soulbound
                trophy NFT for the champ. No entry fees, no prize pools, ever.
              </p>
              <PillButton href="/fantasy" variant="secondary">
                ENTER FANTASY <ArrowRight className="w-3.5 h-3.5" />
              </PillButton>
            </div>

            <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-6 hover:border-arena-orange transition">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-arena-orange/10 border border-arena-orange/30 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-arena-orange" />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-arena-yellow px-2 py-1 rounded-full border border-arena-yellow/30 bg-arena-yellow/5">
                  PREVIEW
                </span>
              </div>
              <h3 className="text-xl font-black mb-2">1v1 Console Challenges</h3>
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d leading-relaxed mb-4">
                Challenge anyone — NBA 2K, Madden, Street Fighter, FIFA, Apex, COD, FN.
                Xbox · PlayStation · Switch · PC. Bragging rights only.
              </p>
              <PillButton href="https://soundchain.io/arena#challenges" external variant="ghost">
                POST CHALLENGE <ArrowRight className="w-3.5 h-3.5" />
              </PillButton>
            </div>
          </div>
        </section>

        {/* Feature bullets */}
        <section className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
          <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-6">
              Built different. Built <span className="arena-hologram-text">free</span>.
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-arena-text-l dark:text-arena-text-d mb-8">
              {FEATURE_BULLETS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <PillButton href="/live" variant="primary">
                <Activity className="w-4 h-4" /> OPEN LIVE BOARD
              </PillButton>
              <PillButton href="/f1" variant="secondary">
                <Flag className="w-4 h-4" /> NEXT F1 RACE
              </PillButton>
              <PillButton href="https://soundchain.io" external variant="ghost">
                <Zap className="w-4 h-4" /> SOUNDCHAIN.IO
              </PillButton>
            </div>
          </div>
        </section>

        {/* Notice strip */}
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="rounded-xl border border-arena-orange/30 bg-arena-orange/5 px-4 py-3 text-xs text-arena-orange leading-relaxed font-mono">
            <span className="font-bold">Note:</span> Real-money sports picks were paused
            platform-wide May 2, 2026. Arena is free-to-play only — bragging rights,
            leaderboards, and trophy NFTs. Streaming rewards, SCID royalties, and OGUN
            utility on soundchain.io continue uninterrupted.
          </div>
        </section>
      </ArenaShell>
    </>
  )
}
