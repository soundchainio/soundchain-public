import Head from 'next/head'
import Link from 'next/link'
import { Trophy, Swords, Activity, Flag, Zap, ArrowRight, Globe2, Wifi } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'
import { LiveTakesFeed } from '@/components/LiveTakesFeed'
import { LiveScoresStrip } from '@/components/LiveScoresStrip'

// Every sport that has an arena hub or roadmap stub. Slim cyberpunk pills,
// horizontally-scrollable on mobile so nothing gets cropped at narrow widths.
// Frank May 6 feedback: only 4 cards rendered on mobile, missing MLS, Boxing,
// WWE, NFL, FIFA World Cup, Soccer. Treat this list as the canonical "sport
// universe" — extending it adds a tile w/ no other code change.
const PULSE_NOW: { href: string; label: string; emoji: string; accent: string; live?: boolean }[] = [
  { href: '/nba',          label: 'NBA Playoffs',  emoji: '🏀', accent: 'NOW',     live: true },
  { href: '/nhl',          label: 'Stanley Cup',   emoji: '🏒', accent: 'NOW',     live: true },
  { href: '/mlb',          label: 'MLB Daily',     emoji: '⚾', accent: 'TODAY' },
  { href: '/wnba',         label: 'WNBA',          emoji: '🏀', accent: 'TODAY' },
  { href: '/nfl',          label: 'NFL Offseason', emoji: '🏈', accent: 'NEWS' },
  { href: '/f1',           label: 'Formula 1',     emoji: '🏎️', accent: 'WKND' },
  { href: '/boxing',       label: 'Boxing',        emoji: '🥊', accent: 'CARD' },
  { href: '/mma',          label: 'UFC / MMA',     emoji: '🥋', accent: 'CAGE' },
  { href: '/epl',          label: 'EPL',           emoji: '⚽', accent: 'LIVE' },
  { href: '/mls',          label: 'MLS',           emoji: '⚽', accent: 'TABLE' },
  { href: '/ncaa',         label: 'NCAA Hoops',    emoji: '🏀', accent: 'BRACKET' },
  { href: '/wwe',          label: 'WWE',           emoji: '🤼', accent: 'PPV' },
  { href: '/fifa',         label: 'FIFA WC',       emoji: '🌍', accent: 'GLOBAL' },
  { href: '/horse-racing', label: 'Horse Racing',  emoji: '🐎', accent: 'STAKES' },
]

const FEATURE_BULLETS = [
  '✓ Every league, one app — NBA · NHL · MLB · F1 · UFC · EPL · MLS',
  '✓ Live scoreboard auto-refreshes every 60 seconds',
  '✓ Free-to-play fantasy + 1v1 console challenges',
  '✓ Trophy NFTs for season champs (soulbound, non-transferable)',
  '✓ Light by default, dark mode one tap away',
  '✓ Native iOS + Android coming via Capacitor',
]

// Form-factor manifest — every screen size + AR/VR target Arena thinks in.
// Pure copy on the desktop right-rail so the user feels the "every-screen"
// philosophy without needing to read a roadmap.
const FORM_FACTORS = [
  { label: 'PHONE',         spec: '375px+',                          status: 'LIVE',    tone: 'mint' },
  { label: 'TABLET',        spec: '768px+',                          status: 'LIVE',    tone: 'mint' },
  { label: 'DESKTOP',       spec: '1280px+',                         status: 'LIVE',    tone: 'mint' },
  { label: 'TV · 4K',       spec: '2160p+',                          status: 'TUNED',   tone: 'cyan' },
  { label: 'PROJECTOR',     spec: '1080p+',                          status: 'TUNED',   tone: 'cyan' },
  { label: 'APPLE VISION',  spec: 'visionOS',                        status: 'NEXT',    tone: 'magenta' },
  { label: 'RAY-BAN META',  spec: 'HUD',                             status: 'NEXT',    tone: 'magenta' },
  { label: 'NEURAL AGENTS', spec: 'Lucy · Furl · Smith · Forge',     status: 'IN LAB',  tone: 'yellow' },
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

        {/* ───── HERO — landscape-aware split layout ─────────────────────
            Mobile: vertical-centered single-col (unchanged).
            Desktop+ (lg): 2-col w/ left-aligned brand on left, "form-factor
            manifest" panel on right so empty space on wide screens becomes a
            visible declaration of where Arena renders. Frank May 13 ask: fill
            the landscape void w/ creative design. */}
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 pt-10 sm:pt-14 lg:pt-16 pb-12 lg:pb-16">
            <div className="grid lg:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.6fr_1fr] gap-10 lg:gap-12 items-center">
              {/* Left — hero brand text */}
              <div className="text-center lg:text-left">
                <div className="text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-4">
                  FREE-TO-PLAY · NO ENTRY FEES · REAL STATS
                </div>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.02] tracking-tight mb-5">
                  The <span className="arena-hologram-text">stats app</span> sports fans deserve.
                </h1>
                <p className="max-w-2xl lg:max-w-none text-base sm:text-lg lg:text-xl text-arena-muted-l dark:text-arena-muted-d leading-relaxed mb-8 mx-auto lg:mx-0">
                  Every league. Live scores. Standings. Trophies. Free-to-play fantasy + 1v1
                  console challenges layered on top. Ad-free. Bet-free. Just real sports.
                </p>
                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                  <PillButton href="/live" variant="primary">
                    <Activity className="w-4 h-4" /> WHAT&apos;S LIVE NOW
                  </PillButton>
                  <PillButton href="/nba" variant="secondary">
                    <Trophy className="w-4 h-4" /> NBA PLAYOFFS
                  </PillButton>
                </div>
              </div>

              {/* Right — form-factor manifest (desktop+ only).
                  Declares every render target Arena thinks in. Phone, Tablet,
                  Desktop are LIVE today; TV/projector are CSS-tuned; Vision
                  Pro / Ray-Ban Meta are next; neural agents (Lucy/Furl/Smith/
                  Forge) live in the lab. Visually fills the empty landscape
                  void w/ an honest map of where the platform's going. */}
              <div className="hidden lg:block">
                <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card/80 dark:bg-arena-surface/80 backdrop-blur-sm p-6 xl:p-7 relative overflow-hidden">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-arena-orange">
                        Render Targets · Live Map
                      </div>
                      <Globe2 className="w-4 h-4 text-arena-red animate-arena-pulse-live" />
                    </div>
                    <ul className="space-y-1.5">
                      {FORM_FACTORS.map((f) => (
                        <li
                          key={f.label}
                          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              f.status === 'LIVE' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-arena-pulse-live' :
                              f.status === 'TUNED' ? 'bg-arena-orange/80' :
                              f.status === 'NEXT' ? 'bg-arena-red/70' :
                              'bg-arena-yellow/80'
                            }`} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-black tracking-tight truncate">{f.label}</span>
                              <span className="text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">{f.spec}</span>
                            </div>
                          </div>
                          <span className={`text-[8px] font-mono uppercase tracking-[0.2em] flex-shrink-0 ml-3 ${
                            f.status === 'LIVE' ? 'text-emerald-600 dark:text-emerald-400' :
                            f.status === 'TUNED' ? 'text-arena-orange' :
                            f.status === 'NEXT' ? 'text-arena-red' :
                            'text-arena-yellow'
                          }`}>
                            {f.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 pt-4 border-t border-arena-border-l/60 dark:border-arena-border-d/60">
                      <div className="text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d leading-relaxed">
                        One codebase · every screen · stays compliant. Built<br />
                        for humans <span className="text-arena-orange">and</span> agents — Earth-scale + adaptive.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── SPORTS PULSE GRID — denser at landscape ─────────────────
            Mobile: 2 cols. lg: 7 cols (existing). 2xl: 14 cols so the entire
            sport universe fits in one row on a TV viewport without scroll. */}
        <section className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
              Sports · Right now
            </h2>
            <span className="text-[9px] font-mono tracking-wider text-arena-muted-l dark:text-arena-muted-d">
              {PULSE_NOW.length} leagues
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 2xl:grid-cols-14 gap-2 sm:gap-3">
            {PULSE_NOW.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group relative flex items-center gap-2 px-3 py-3 rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface hover:border-arena-red hover:bg-arena-paper dark:hover:bg-arena-carbon focus:border-arena-red focus:outline-none focus:ring-2 focus:ring-arena-red/40 transition min-h-[60px]"
              >
                {p.live && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-arena-red animate-arena-pulse-live shadow-[0_0_8px_rgba(220,38,38,0.7)]" />
                )}
                <span className="text-xl flex-shrink-0" aria-hidden>{p.emoji}</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[13px] font-black tracking-tight truncate group-hover:arena-hologram-text transition-colors">
                    {p.label}
                  </span>
                  <span className={`text-[8px] font-mono uppercase tracking-[0.2em] truncate ${
                    p.live ? 'text-arena-red' : p.accent === 'SOON' ? 'text-arena-muted-l dark:text-arena-muted-d opacity-60' : 'text-arena-orange'
                  }`}>
                    {p.accent}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ───── LANDSCAPE BODY GRID — center + right rail at xl+ ─────────
            Mobile/tablet: single column (default LiveTakesFeed full width).
            xl+ (1280): 2-col grid w/ center content + 360px right rail.
            2xl+ (1536): center expands proportionally, rail stays 360px.
            Empty void = ZERO. */}
        <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 grid xl:grid-cols-[1fr_360px] gap-8 xl:gap-10">
          {/* Center — feature cards + live takes feed */}
          <div className="min-w-0">
            {/* Live takes — cross-game fan engagement stream */}
            <div className="-mx-4 sm:-mx-8 lg:-mx-12 xl:mx-0">
              <LiveTakesFeed />
            </div>

            {/* Free-to-play layer cards */}
            <section className="py-8 sm:py-10">
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
            <section className="pb-10 sm:pb-14">
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
            <section className="pb-12 sm:pb-16">
              <div className="rounded-xl border border-arena-orange/30 bg-arena-orange/5 px-4 py-3 text-xs text-arena-orange leading-relaxed font-mono">
                <span className="font-bold">Note:</span> Real-money sports picks were paused
                platform-wide May 2, 2026. Arena is free-to-play only — bragging rights,
                leaderboards, and trophy NFTs. Streaming rewards, SCID royalties, and OGUN
                utility on soundchain.io continue uninterrupted.
              </div>
            </section>
          </div>

          {/* ───── RIGHT RAIL — desktop xl+ only ───────────────────────────
              Sticky column showing live cross-platform status + agent
              triangle + community signal. On mobile/tablet this entire
              column is hidden — the content above is canonical. */}
          <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-4 pt-4 pb-12">
              {/* Network · Live — shows the 3-app constellation status */}
              <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
                    Network · Live
                  </span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-arena-pulse-live" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'SC',     value: 'ONLINE',  href: 'https://soundchain.io' as string | undefined,  active: false },
                    { label: 'MINT',   value: 'ONLINE',  href: 'https://mint.soundchain.io' as string | undefined,  active: false },
                    { label: 'ARENA',  value: 'YOU',     href: undefined,                                       active: true  },
                  ].map((n) => {
                    const inner = (
                      <>
                        <div className="text-[8px] font-mono uppercase tracking-[0.25em] text-arena-muted-l dark:text-arena-muted-d">
                          {n.label}
                        </div>
                        <div className={`text-[10px] font-black tracking-wider mt-0.5 ${
                          n.active ? 'text-arena-red' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {n.value}
                        </div>
                      </>
                    )
                    return n.href ? (
                      <a
                        key={n.label}
                        href={n.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-arena-border-l/60 dark:border-arena-border-d/60 hover:border-arena-red px-2 py-2 transition"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div
                        key={n.label}
                        className="rounded-lg border border-arena-red/60 bg-arena-red/5 px-2 py-2"
                      >
                        {inner}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Agent Triangle — Furl · Smith · Forge */}
              <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
                    Agent Triangle
                  </span>
                  <span className="text-[8px] font-mono text-arena-yellow tracking-[0.2em]">IN LAB</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { name: 'FURL',  role: 'curate',  emoji: '🜂' },
                    { name: 'SMITH', role: 'forge',   emoji: '🜨' },
                    { name: 'FORGE', role: 'mint',    emoji: '🜍' },
                  ].map((a) => (
                    <div
                      key={a.name}
                      className="rounded-lg border border-arena-border-l/60 dark:border-arena-border-d/60 bg-arena-paper/60 dark:bg-arena-carbon/60 px-2 py-3"
                    >
                      <div className="text-xl mb-1" aria-hidden>{a.emoji}</div>
                      <div className="text-[10px] font-black tracking-wider">{a.name}</div>
                      <div className="text-[8px] font-mono text-arena-muted-l dark:text-arena-muted-d uppercase tracking-widest mt-0.5">
                        {a.role}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-arena-border-l/60 dark:border-arena-border-d/60 text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d leading-relaxed">
                  Original triangle of agents. Lucy &amp; Neural watch the biosignals;
                  the triangle moves the work. The win-win.
                </div>
              </div>

              {/* Compliance posture — bottom of rail, always-visible declaration */}
              <div className="rounded-2xl border border-arena-orange/30 bg-arena-orange/5 p-4">
                <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-arena-orange mb-2">
                  Compliance Posture
                </div>
                <p className="text-[10px] font-mono text-arena-orange/90 leading-relaxed">
                  Three apps, three boundaries: <span className="font-bold">soundchain.io</span> (music · SCid · rewards) ·
                  {' '}<span className="font-bold">arena</span> (free-to-play stats · soulbound trophies only) ·
                  {' '}<span className="font-bold">mint</span> (NFT · marketplace · wallet).
                  Split before regulation — not after.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </ArenaShell>
    </>
  )
}
