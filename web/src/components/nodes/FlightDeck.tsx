/**
 * FlightDeck — the working cockpit (SoundChain Starship: Nodes capsule)
 *
 * Fable5 spec port (soundchain-nodes-flightdeck.html): /nodes is the vessel's
 * flight deck — the main operations hall. This layer mounts the cockpit hull
 * around the live dashboard: console strips at the viewport edges with bezel
 * seams, toggle-switch nubs and Falcon-flicker instrument LEDs (phosphor /
 * amber / cyan — irregular cycles, like a powered console), corner bolts, a
 * flywheel guide rail along the deck floor, and stencil plate labels.
 *
 * Always-on ambient frame: fixed, pointer-events-none, z-40 (below the sticky
 * navs at z-50, below modals, above the scrolling dashboard edges). Pure CSS,
 * no rAF. The data dashboard itself is untouched.
 */

import React from 'react'

const PLATE = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 42px), linear-gradient(90deg, #181e26 0%, #10141a 60%, #090b0f 100%)'
const PLATE_R = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 42px), linear-gradient(270deg, #181e26 0%, #10141a 60%, #090b0f 100%)'
const FLYWHEEL_H = 'linear-gradient(90deg, #ff6a3d, #ff3d9a, #a07bff, #3fd9ff, #b8ff4d, #ffd700)'

const LED = ({ color, dur, delay }: { color: string; dur: string; delay?: string }) => (
  <span
    className="w-1 h-1 rounded-full animate-pulse"
    style={{ background: color, boxShadow: `0 0 5px ${color}`, animationDuration: dur, animationDelay: delay }}
  />
)

export function FlightDeck() {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none" aria-hidden>
      {/* LEFT console strip — bezel seams + switch nubs + instrument LEDs */}
      <div className="absolute top-0 bottom-0 left-0 w-2.5 md:w-5" style={{ background: PLATE, borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="absolute top-24 left-0 right-0 flex flex-col items-center gap-2">
          <LED color="#39ff7a" dur="2.1s" />
          <LED color="#ffb000" dur="3.4s" delay="0.7s" />
          <LED color="#3fd9ff" dur="1.6s" delay="1.2s" />
        </div>
        <div className="hidden md:flex absolute top-[44%] left-0 right-0 flex-col items-center gap-3">
          <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
          <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
        </div>
        <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-2">
          <LED color="#ff3b30" dur="4.3s" delay="0.4s" />
          <LED color="#39ff7a" dur="2.8s" delay="1.6s" />
        </div>
      </div>

      {/* RIGHT console strip */}
      <div className="absolute top-0 bottom-0 right-0 w-2.5 md:w-5" style={{ background: PLATE_R, borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="absolute top-32 left-0 right-0 flex flex-col items-center gap-2">
          <LED color="#ffb000" dur="2.5s" />
          <LED color="#39ff7a" dur="3.9s" delay="0.9s" />
        </div>
        <div className="hidden md:flex absolute top-[58%] left-0 right-0 flex-col items-center gap-3">
          <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
          <span className="w-1.5 h-3 rounded-sm bg-[#2a323d] border border-white/10" />
        </div>
        <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-2">
          <LED color="#3fd9ff" dur="1.9s" delay="0.3s" />
          <LED color="#ffb000" dur="3.1s" delay="1.4s" />
        </div>
      </div>

      {/* deck floor — hull strip + flywheel guide rail (desktop; mobile bottom nav owns the edge) */}
      <div className="absolute bottom-0 left-0 right-0 h-3.5 hidden md:flex items-center"
        style={{ background: 'linear-gradient(0deg, #0b0d11 0%, #07090c 70%, transparent 100%)' }}>
        <div className="w-full h-[2px] opacity-40" style={{ background: FLYWHEEL_H }} />
      </div>
      <span className="hidden md:block absolute bottom-1 left-7 text-[8px] font-mono tracking-[0.4em] text-white/20 uppercase">SC · Flt Deck</span>
      <span className="hidden md:block absolute bottom-1 right-7 text-[8px] font-mono tracking-[0.4em] text-white/15 uppercase">Bus A·B Nominal</span>

      {/* corner bolts */}
      <span className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/15" />
      <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-white/15" />
      <span className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-white/15 hidden md:block" />
      <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-white/15 hidden md:block" />
    </div>
  )
}

export default FlightDeck
