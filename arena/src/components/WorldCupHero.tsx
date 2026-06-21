import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, MapPin, CalendarDays, GitBranch, ArrowRight } from 'lucide-react'
import { WC_KICKOFF_ISO, WC_FINAL_ISO } from '@/lib/worldcup'

/**
 * PlayerSilhouette — a dynamic soccer-striker cutout, composed from SVG shapes
 * (head + torso + posed arms/legs mid-kick). Royalty-free + no-likeness-risk
 * (stylized, not a real person), zero-weight (vector), battery-free. Filled with
 * a team-color gradient. This is the "superstar cutout" without stock/IP/GPU.
 */
function PlayerSilhouette({ id, from, to, className = '', flip }: { id: string; from: string; to: string; className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 200" className={className} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        {/* head */}
        <circle cx="62" cy="22" r="13" />
        {/* torso, leaning into the strike */}
        <path d="M50 36 q14 -6 26 2 l6 40 q-20 8 -38 0 z" />
        {/* back arm raised for balance */}
        <path d="M52 42 q-22 -6 -30 12 q-3 8 4 10 q6 -2 9 -10 q8 -8 19 -8 z" />
        {/* front arm */}
        <path d="M78 44 q18 4 24 22 q2 7 -5 8 q-6 -1 -8 -9 q-6 -10 -14 -13 z" />
        {/* planted leg */}
        <path d="M52 74 q8 4 14 2 l-2 50 q-1 30 -9 44 q-3 5 -9 3 q-4 -2 -2 -8 q6 -16 6 -40 z" />
        {/* striking leg, swung up to the ball */}
        <path d="M66 76 q9 2 14 -2 q14 18 30 22 q6 2 4 9 q-3 6 -10 3 q-22 -6 -36 -24 q-4 -4 -6 -11 z" />
      </g>
    </svg>
  )
}

/**
 * WorldCupHero — the arena homepage takeover for FIFA World Cup 2026.
 *
 * Replaces the NBA FinalsCollision hero (ghosted until next year's finals).
 * Eye-candy first, in the SoundChain deck/Fable5 grammar: a stadium-pitch
 * gradient band, hologram title, host-nation flags, a LIVE countdown to first
 * kick, headline tournament stats, a scrolling flag marquee, and a big
 * overlapping trophy + flag-disc "cutout" cluster.
 *
 * BATTERY-SAFE (Frank's older-iPhone heat concern): pure CSS effects + ONE 1s
 * countdown interval — no rAF, no canvas, no WebGL. The marquee + glows are
 * GPU-composited CSS animations and are killed by prefers-reduced-motion.
 */

// Host + headline nations — flag discs for the marquee + cutout cluster. Real
// qualified field fills in on /worldcup; this is the landing's visual roll-call.
const FLAG_ROLL = [
  '🇲🇽', '🇺🇸', '🇨🇦', '🇧🇷', '🇦🇷', '🇫🇷', '🇪🇸', '🇩🇪', '🇬🇧', '🇵🇹',
  '🇳🇱', '🇮🇹', '🇧🇪', '🇭🇷', '🇺🇾', '🇯🇵', '🇰🇷', '🇲🇦', '🇸🇳', '🇨🇴',
  '🇨🇮', '🇳🇬', '🇨🇱', '🇨🇭', '🇩🇰', '🇷🇸', '🇵🇱', '🇪🇨',
]

const STATS = [
  { n: '48', label: 'Nations' },
  { n: '104', label: 'Matches' },
  { n: '16', label: 'Host Cities' },
  { n: '3', label: 'Countries' },
]

function useCountdown(targetIso: string) {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number; live: boolean } | null>(null)
  useEffect(() => {
    const target = new Date(targetIso).getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setLeft({ d: 0, h: 0, m: 0, s: 0, live: true }); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLeft({ d, h, m, s, live: false })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])
  return left
}

export function WorldCupHero() {
  const cd = useCountdown(WC_KICKOFF_ISO)
  const finalYear = new Date(WC_FINAL_ISO).getFullYear()

  return (
    <section className="relative overflow-hidden border-b border-arena-border-l dark:border-arena-border-d wc-hero-pitch">
      {/* pitch stripes + glow (CSS only) */}
      <div className="absolute inset-0 wc-hero-stripes pointer-events-none" aria-hidden />
      <div className="absolute inset-0 wc-hero-glow pointer-events-none" aria-hidden />

      <div className="relative max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 pt-9 sm:pt-12 lg:pt-14 pb-8 lg:pb-10">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-center">
          {/* ── Left: title + countdown + stats + CTAs ── */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.4em] text-emerald-300 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-arena-pulse-live" />
              FIFA WORLD CUP {finalYear} · UNITED — 🇺🇸 🇨🇦 🇲🇽
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight mb-4">
              The <span className="arena-hologram-text">whole world</span><br className="hidden sm:block" /> plays here.
            </h1>
            <p className="max-w-2xl lg:max-w-none text-sm sm:text-lg text-arena-muted-l dark:text-arena-muted-d leading-relaxed mb-6 mx-auto lg:mx-0">
              48 nations. 104 matches. 16 cities across three countries. Every group, every
              bracket, every Golden Boot race — live on Arena, free, ad-free.
            </p>

            {/* LIVE countdown to first kick */}
            <div className="mb-6">
              <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">
                {cd?.live ? 'TOURNAMENT IS LIVE' : 'Kickoff in'}
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3">
                {cd && !cd.live ? (
                  [['DAYS', cd.d], ['HRS', cd.h], ['MIN', cd.m], ['SEC', cd.s]].map(([lab, val]) => (
                    <div key={lab as string} className="wc-count-cell">
                      <div className="text-2xl sm:text-4xl font-black tabular-nums arena-hologram-text leading-none">
                        {String(val).padStart(2, '0')}
                      </div>
                      <div className="text-[8px] font-mono tracking-[0.25em] text-arena-muted-l dark:text-arena-muted-d mt-1">{lab as string}</div>
                    </div>
                  ))
                ) : (
                  <span className="text-2xl font-black text-emerald-400 animate-arena-pulse-live">● LIVE NOW</span>
                )}
              </div>
            </div>

            {/* headline stats */}
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto lg:mx-0 mb-6">
              {STATS.map(s => (
                <div key={s.label} className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card/70 dark:bg-arena-surface/70 backdrop-blur-sm px-2 py-2.5 text-center">
                  <div className="text-xl sm:text-2xl font-black arena-hologram-text leading-none">{s.n}</div>
                  <div className="text-[7px] sm:text-[8px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
              <Link href="/worldcup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-sm uppercase tracking-wider hover:opacity-90 transition shadow-[0_0_24px_rgba(16,185,129,0.4)]">
                <Trophy className="w-4 h-4" /> Enter the World Cup <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/worldcup?tab=bracket" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-arena-border-l dark:border-arena-border-d hover:border-emerald-400 font-bold text-sm uppercase tracking-wider transition">
                <GitBranch className="w-4 h-4" /> Bracket
              </Link>
            </div>
          </div>

          {/* ── Right: big overlapping STRIKER CUTOUTS + trophy + flags ──
              Mobile-visible (shorter on phones), the standout hero imagery. */}
          <div className="relative flex items-center justify-center min-h-[240px] lg:min-h-[380px]" aria-hidden>
            {/* spotlight wash behind the cutouts */}
            <div className="absolute w-[260px] h-[260px] lg:w-[360px] lg:h-[360px] rounded-full bg-emerald-400/15 blur-3xl" />
            {/* two overlapping striker silhouettes */}
            <PlayerSilhouette id="wcp1" from="#34d399" to="#0e7490" className="wc-player wc-player-1" />
            <PlayerSilhouette id="wcp2" from="#f59e0b" to="#b91c1c" className="wc-player wc-player-2" flip />
            {/* trophy + ball + host flag discs layered over */}
            <div className="wc-trophy">🏆</div>
            <div className="wc-flag-disc wc-disc-1">🇲🇽</div>
            <div className="wc-flag-disc wc-disc-2">🇺🇸</div>
            <div className="wc-flag-disc wc-disc-3">🇨🇦</div>
            <div className="wc-ball">⚽</div>
          </div>
        </div>
      </div>

      {/* ── Flag marquee (CSS scroll; killed by reduced-motion) ── */}
      <div className="relative border-t border-arena-border-l/60 dark:border-arena-border-d/60 bg-black/30 backdrop-blur-sm overflow-hidden">
        <div className="wc-marquee flex items-center gap-5 py-2.5 text-2xl whitespace-nowrap">
          {[...FLAG_ROLL, ...FLAG_ROLL].map((f, i) => (
            <span key={i} className="opacity-80 hover:opacity-100 transition">{f}</span>
          ))}
        </div>
      </div>

      {/* quick links into the hub */}
      <div className="relative max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-3 flex flex-wrap items-center justify-center lg:justify-start gap-2">
        {[
          { href: '/worldcup?tab=schedule', icon: CalendarDays, label: 'Schedule' },
          { href: '/worldcup?tab=groups', icon: Trophy, label: 'Groups' },
          { href: '/worldcup?tab=scorers', icon: Trophy, label: 'Golden Boot' },
          { href: '/worldcup?tab=hosts', icon: MapPin, label: '16 Host Cities' },
        ].map(l => (
          <Link key={l.label} href={l.href} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-arena-border-l dark:border-arena-border-d bg-arena-card/60 dark:bg-arena-surface/60 text-[11px] font-bold hover:border-emerald-400 transition">
            <l.icon className="w-3 h-3 text-emerald-400" /> {l.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
