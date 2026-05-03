import Head from 'next/head'
import { Trophy, Swords, Gamepad2, Users, Eye, Zap } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'

const SUPPORTED_PLATFORMS = [
  { id: 'parsec', name: 'Parsec', tag: 'P2P · low latency' },
  { id: 'gfn', name: 'GeForce NOW', tag: 'NVIDIA cloud' },
  { id: 'xcloud', name: 'Xbox Cloud', tag: 'Microsoft' },
  { id: 'remote', name: 'PlayStation Remote', tag: 'Sony WebRTC' },
  { id: 'steam', name: 'Steam Remote Play', tag: 'Valve' },
]

const FEATURE_BULLETS = [
  '✓ Free-to-play 1v1 console challenges',
  '✓ NFL fantasy leagues with live PPR scoring',
  '✓ Top-4 playoff brackets + championship trophy NFTs',
  '✓ Spectator mode for residents',
  '✓ On-chain leaderboards + bragging rights',
]

export default function ArenaHub() {
  return (
    <>
      <Head>
        <title>SoundChain Arena · Free-to-play fantasy + 1v1 console challenges</title>
        <meta
          name="description"
          content="Free-to-play NFL fantasy leagues + 1v1 console challenges. Live scoring, brackets, trophy NFTs, bragging rights. No entry fees, no payouts — just glory."
        />
        <meta property="og:title" content="SoundChain Arena" />
        <meta
          property="og:description"
          content="Free-to-play fantasy leagues + 1v1 console challenges. Bragging rights only."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://arena.soundchain.io" />
      </Head>

      <ArenaShell>
        {/* Hero */}
        <section className="arena-mesh-bg border-b border-arena-border">
          <div className="max-w-6xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
            <div className="text-[10px] font-mono tracking-[0.4em] text-cyan-400/80 mb-4">
              FREE-TO-PLAY · NO ENTRY FEES · BRAGGING RIGHTS ONLY
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight mb-5">
              Welcome to <span className="arena-hologram-text">the Arena</span>
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 leading-relaxed mb-8">
              NFL fantasy leagues with live PPR scoring. 1v1 console challenges across
              Xbox / PlayStation / Switch / PC. Live spectator mode. No wagers, no fees —
              just leaderboards, trophy NFTs, and the glory of saying you won.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <PillButton href="/fantasy" variant="primary">
                <Trophy className="w-4 h-4" /> ENTER FANTASY
              </PillButton>
              <PillButton href="#challenges" variant="secondary">
                <Swords className="w-4 h-4" /> 1V1 CHALLENGES
              </PillButton>
            </div>
          </div>
        </section>

        {/* What's inside */}
        <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-xs font-black tracking-[0.3em] text-cyan-400/80 mb-6">
            WHAT'S INSIDE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fantasy card */}
            <div className="rounded-2xl border border-arena-border bg-arena-surface p-6 hover:border-cyan-500/40 transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-cyan-300" />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5">
                  LIVE
                </span>
              </div>
              <h3 className="text-xl font-black mb-2">Fantasy Football</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Free-to-play · Live PPR scoring · Snake draft · Top-4 playoffs · Bragging
                rights + leaderboard glory + trophy NFT for the champ.
              </p>
              <PillButton href="/fantasy" variant="secondary">
                ENTER FANTASY →
              </PillButton>
            </div>

            {/* Challenges card */}
            <div
              id="challenges"
              className="rounded-2xl border border-arena-border bg-arena-surface p-6 hover:border-purple-500/40 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-purple-300" />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-amber-400 px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/5">
                  PREVIEW
                </span>
              </div>
              <h3 className="text-xl font-black mb-2">1v1 Console Challenges</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Challenge anyone to NBA 2K, Madden, Street Fighter, FIFA, Apex, COD, FN.
                Xbox / PlayStation / Switch / PC. Auto-posted to feed by @arena_agent.
              </p>
              <PillButton href="https://soundchain.io/arena#challenges" external variant="ghost">
                POST CHALLENGE on soundchain.io →
              </PillButton>
            </div>
          </div>
        </section>

        {/* Streaming platforms */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xs font-black tracking-[0.3em] text-cyan-400/80 mb-6">
            CONNECT YOUR CONSOLE — ANY OF THESE WORKS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SUPPORTED_PLATFORMS.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-arena-border bg-arena-surface px-3 py-4 text-center hover:border-cyan-500/30 transition"
              >
                <div className="text-sm font-bold text-white mb-1">{p.name}</div>
                <div className="text-[10px] font-mono text-gray-500 tracking-wider">
                  {p.tag}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature bullets + CTA */}
        <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="rounded-2xl border border-arena-border bg-gradient-to-br from-arena-surface to-black p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-6">
              Everything in <span className="arena-hologram-text">Arena</span> is free.
            </h2>
            <ul className="space-y-2 text-sm text-gray-300 mb-8">
              {FEATURE_BULLETS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <PillButton href="/fantasy" variant="primary">
                START A LEAGUE
              </PillButton>
              <PillButton
                href="https://soundchain.io"
                external
                variant="ghost"
              >
                <Zap className="w-4 h-4" /> SOUNDCHAIN.IO
              </PillButton>
            </div>
          </div>
        </section>

        {/* Notice strip */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90 font-mono leading-relaxed">
            <span className="font-bold">Note:</span> Real-money sports picks were paused
            platform-wide on May 2, 2026. Arena is now free-to-play only — bragging
            rights, leaderboards, and trophy NFTs. Stream rewards, SCID royalties, and
            OGUN utility on soundchain.io continue uninterrupted.
          </div>
        </section>
      </ArenaShell>
    </>
  )
}
