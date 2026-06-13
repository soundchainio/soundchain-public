/**
 * StarshipBay — the shared ambient capsule frame (SoundChain Starship)
 *
 * DRY generalization of the Fable5 per-page capsules (nodes/FlightDeck +
 * profile/CrewQuarters). Every remaining pill is a DECK of the same vessel, so
 * they share ONE hull frame, tuned per page by an accent palette + stencil
 * labels + a CapsuleWall theme:
 *
 *   pill        bay                wall       accent
 *   ──────────  ─────────────────  ─────────  ───────
 *   Library     Space Library      quarters   amber    (reading capsule, locker spines)
 *   Explore     Observation Deck   deck       emerald  (sensors, sweep)
 *   Users       Crew Manifest      deck       pink     (roster console)
 *   Playlists   Media Bay          deck       fuchsia  (audio console)
 *   Archive     Cargo Vault        quarters   lime     (stowage lockers)
 *   Manager     Booking Ops        deck       violet   (comms console)
 *
 * Same construction as FlightDeck: fixed, pointer-events-none, z-40 (below the
 * sticky navs at z-50, above the scrolling content edges). Pure CSS, no rAF.
 * The page's content + plumbing underneath are NEVER touched — this is an
 * ambient frame painted into the viewport dead-space at the edges. The full
 * instrument/locker walls (CapsuleWall) only mount ≥1540px so they can never
 * cover content; set `walls={false}` for full-bleed pages with no max-width
 * column to keep the wall off content entirely.
 */

import React from 'react'
import { CapsuleWall } from 'components/starship/CapsuleWall'

export type BayAccent = 'amber' | 'emerald' | 'pink' | 'fuchsia' | 'lime' | 'violet' | 'cyan' | 'orange'

type Palette = { leds: [string, string, string]; rail: string; stencil: string; glow: string }

// Each accent → console LED colors + flywheel rail gradient + stencil tint.
// The rail always carries a hint of the SC spectrum so every bay reads as the
// same ship, just a different deck.
const PALETTES: Record<BayAccent, Palette> = {
  amber:   { leds: ['#ffb000', '#ffd700', '#39ff7a'], rail: 'linear-gradient(90deg,#ffb000,#ff6a3d,#ffd700,#a07bff,#37e6ff)', stencil: '#ffb24d', glow: 'rgba(255,176,0,0.5)' },
  emerald: { leds: ['#39ff7a', '#37e6ff', '#b8ff4d'], rail: 'linear-gradient(90deg,#39ff7a,#37e6ff,#b8ff4d,#a07bff,#ff6a3d)', stencil: '#5eead4', glow: 'rgba(52,211,153,0.5)' },
  pink:    { leds: ['#ff3d9a', '#ff6a3d', '#37e6ff'], rail: 'linear-gradient(90deg,#ff3d9a,#a07bff,#37e6ff,#b8ff4d,#ffd700)', stencil: '#f9a8d4', glow: 'rgba(244,114,182,0.5)' },
  fuchsia: { leds: ['#e879f9', '#a07bff', '#37e6ff'], rail: 'linear-gradient(90deg,#e879f9,#a07bff,#37e6ff,#b8ff4d,#ff6a3d)', stencil: '#f0abfc', glow: 'rgba(232,121,249,0.5)' },
  lime:    { leds: ['#b8ff4d', '#39ff7a', '#ffd700'], rail: 'linear-gradient(90deg,#b8ff4d,#39ff7a,#ffd700,#37e6ff,#a07bff)', stencil: '#bef264', glow: 'rgba(163,230,53,0.5)' },
  violet:  { leds: ['#a07bff', '#37e6ff', '#ff3d9a'], rail: 'linear-gradient(90deg,#a07bff,#ff3d9a,#37e6ff,#b8ff4d,#ffd700)', stencil: '#c4b5fd', glow: 'rgba(167,139,250,0.5)' },
  cyan:    { leds: ['#37e6ff', '#39ff7a', '#a07bff'], rail: 'linear-gradient(90deg,#37e6ff,#a07bff,#39ff7a,#b8ff4d,#ffd700)', stencil: '#67e8f9', glow: 'rgba(34,211,238,0.5)' },
  orange:  { leds: ['#ff6a3d', '#ffb000', '#ff3d9a'], rail: 'linear-gradient(90deg,#ff6a3d,#ffb000,#ff3d9a,#a07bff,#37e6ff)', stencil: '#fdba74', glow: 'rgba(251,146,60,0.5)' },
}

const PLATE = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 42px), linear-gradient(90deg, #181e26 0%, #10141a 60%, #090b0f 100%)'
const PLATE_R = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 42px), linear-gradient(270deg, #181e26 0%, #10141a 60%, #090b0f 100%)'
const PLATE_Q = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), linear-gradient(90deg, #181023 0%, #0e0917 60%, #080510 100%)'
const PLATE_QR = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), linear-gradient(270deg, #181023 0%, #0e0917 60%, #080510 100%)'

const LED = ({ color, dur, delay }: { color: string; dur: string; delay?: string }) => (
  <span
    className="w-1 h-1 rounded-full animate-pulse"
    style={{ background: color, boxShadow: `0 0 5px ${color}`, animationDuration: dur, animationDelay: delay }}
  />
)

export function StarshipBay({
  wall = 'deck',
  accent = 'cyan',
  leftLabel = 'SC · Deck',
  rightLabel = 'Bus A·B Nominal',
  walls = true,
  sweep = false,
}: {
  wall?: 'deck' | 'quarters'
  accent?: BayAccent
  leftLabel?: string
  rightLabel?: string
  /** mount the full CapsuleWall instrument/locker walls (≥1540px). Off for full-bleed pages. */
  walls?: boolean
  /** an accent scanline that drifts down the hull — observation-deck flavor. */
  sweep?: boolean
}) {
  const p = PALETTES[accent]
  const isQ = wall === 'quarters'
  const lBg = isQ ? PLATE_Q : PLATE
  const rBg = isQ ? PLATE_QR : PLATE_R
  const seam = isQ ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.07)'

  return (
    <>
      {/* Full instrument/locker walls — Fable5 buildWall port. ≥1540px, never content. */}
      {walls && <>
        <CapsuleWall side="l" theme={wall} />
        <CapsuleWall side="r" theme={wall} />
      </>}

      <div className="fixed inset-0 z-40 pointer-events-none select-none" aria-hidden>
        {/* LEFT console strip — bezel seam + instrument LEDs */}
        <div className="absolute top-0 bottom-0 left-0 w-2.5 md:w-5" style={{ background: lBg, borderRight: seam }}>
          <div className="absolute top-24 left-0 right-0 flex flex-col items-center gap-2">
            <LED color={p.leds[0]} dur="2.1s" />
            <LED color={p.leds[1]} dur="3.4s" delay="0.7s" />
            <LED color={p.leds[2]} dur="1.6s" delay="1.2s" />
          </div>
          <div className="hidden md:flex absolute top-[44%] left-0 right-0 flex-col items-center gap-3">
            <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
            <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
          </div>
          <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-2">
            <LED color={p.leds[2]} dur="4.3s" delay="0.4s" />
            <LED color={p.leds[0]} dur="2.8s" delay="1.6s" />
          </div>
        </div>

        {/* RIGHT console strip */}
        <div className="absolute top-0 bottom-0 right-0 w-2.5 md:w-5" style={{ background: rBg, borderLeft: seam }}>
          <div className="absolute top-32 left-0 right-0 flex flex-col items-center gap-2">
            <LED color={p.leds[1]} dur="2.5s" />
            <LED color={p.leds[2]} dur="3.9s" delay="0.9s" />
          </div>
          <div className="hidden md:flex absolute top-[58%] left-0 right-0 flex-col items-center gap-3">
            <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
            <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
          </div>
          <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-2">
            <LED color={p.leds[0]} dur="1.9s" delay="0.3s" />
            <LED color={p.leds[1]} dur="3.1s" delay="1.4s" />
          </div>
        </div>

        {/* optional accent scanline sweep (observation deck) */}
        {sweep && (
          <div
            className="absolute left-2.5 right-2.5 md:left-5 md:right-5 h-px hidden md:block"
            style={{ background: `linear-gradient(90deg, transparent, ${p.glow}, transparent)`, animation: 'scBaySweep 9s linear infinite' }}
          />
        )}

        {/* deck floor — hull strip + flywheel guide rail (desktop; mobile bottom nav owns the edge) */}
        <div className="absolute bottom-0 left-0 right-0 h-3.5 hidden md:flex items-center"
          style={{ background: 'linear-gradient(0deg, #0b0d11 0%, #07090c 70%, transparent 100%)' }}>
          <div className="w-full h-[2px] opacity-40" style={{ background: p.rail }} />
        </div>
        <span className="hidden md:block absolute bottom-1 left-7 text-[8px] font-mono tracking-[0.4em] uppercase" style={{ color: p.stencil, opacity: 0.45 }}>{leftLabel}</span>
        <span className="hidden md:block absolute bottom-1 right-7 text-[8px] font-mono tracking-[0.4em] text-white/15 uppercase">{rightLabel}</span>

        {/* corner bolts */}
        <span className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/15" />
        <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-white/15" />
        <span className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-white/15 hidden md:block" />
        <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-white/15 hidden md:block" />
      </div>
    </>
  )
}

export default StarshipBay
