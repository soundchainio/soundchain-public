/**
 * CapsuleWall — SoundChain Starship sidewall generator (shared by every capsule)
 *
 * Faithful React port of the Fable5 buildWall() spec
 * (soundchain-profile-quarters_1.html / soundchain-nodes-flightdeck.html):
 * full-height instrument walls that FILL the viewport dead space — width is
 * calc'd against the 1380px content column (min 72 / max 220px) and the wall
 * only appears ≥1540px, so it can never cover content. Modules are seeded by
 * the same LCG as the spec (deterministic → SSR-safe, same wall every render):
 * knobs w/ colored position ticks, toggle switches, gauges, locker doors
 * (quarters), annunciator lamp grids + phosphor screens (deck), and LEDs on
 * Falcon-style steps() blink cycles. A porthole window w/ twinkling stars
 * tops each wall. CSS lives in globals.css under "SOUNDCHAIN STARSHIP".
 */

import React from 'react'

const LEDC = ['#ffb24d', '#ff5246', '#b8ff4d', '#37e6ff', '#fff3e0', '#ff3d9a']
const ANNUN = ['PWR', 'GRAV', 'LINK', 'MESH', 'BUS A', 'BUS B', 'O2', 'NAV']

// Spec LCG (rngW) — deterministic per wall id
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}
function hash32(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const Led = ({ r }: { r: () => number }) => (
  <span className="sc-led" style={{
    ['--lc' as string]: LEDC[Math.floor(r() * 6)],
    ['--d' as string]: `${(0.8 + r() * 3.6).toFixed(2)}s`,
    ['--dl' as string]: `${(r() * 3).toFixed(2)}s`,
  }} />
)

const QUARTER_LABELS = ['ENV', 'O2 TRIM', 'CABIN', 'AUDIO', 'STOW', 'THERMAL', 'COMMS', 'LIGHTS', 'EVA PREP', 'H2O', 'SLEEP CYC', 'PERSONAL']
const DECK_LABELS = ['PWR DIST', 'NAV', 'COMMS', 'THRUST', 'DOCKING', 'SENSORS', 'RELAY', 'MESH BUS', 'TELEMETRY', 'GUIDANCE', 'COOLANT', 'AUX']

export function CapsuleWall({ side, theme }: { side: 'l' | 'r'; theme: 'quarters' | 'deck' }) {
  const r = rng(hash32(`sw${side}-${theme}`))
  const labels = theme === 'quarters' ? QUARTER_LABELS : DECK_LABELS
  const mods: React.ReactNode[] = []

  // Porthole window first — every room looks out at space
  const stars = Array.from({ length: 9 }, (_, i) => (
    <b key={i} style={{
      left: `${8 + r() * 80}%`, top: `${8 + r() * 80}%`,
      ['--d' as string]: `${(2 + r() * 4).toFixed(2)}s`, ['--dl' as string]: `${(r() * 3).toFixed(2)}s`,
    }} />
  ))
  // 140px top margin clears the sticky navs (translucent — a porthole starting
  // under them reads as "cropped at top", Frank's Jun 12 bug report)
  mods.push(<div key="ph" className="sc-porthole" style={{ marginTop: 140 }}>{stars}</div>)

  // 14 modules ≈ tall-viewport coverage (spec: ceil(innerHeight/100)+2)
  for (let i = 0; i < 14; i++) {
    const label = labels[Math.floor(r() * labels.length)]
    const kind = Math.floor(r() * 5)
    let body: React.ReactNode
    if (kind === 0) {
      body = (<>
        <div className="sc-swrow">{[0, 1].map(k => (
          <span key={k} className="sc-knob" style={{
            ['--a' as string]: `${Math.floor(r() * 300 - 150)}deg`,
            ['--kc' as string]: LEDC[Math.floor(r() * 6)],
          }} />
        ))}</div>
        <div className="sc-swrow"><Led r={r} /><Led r={r} /><Led r={r} /></div>
      </>)
    } else if (kind === 1) {
      body = (<>
        <div className="sc-swrow">{[0, 1, 2].map(k => (
          <span key={k} className="sc-sw2" style={{ ['--p' as string]: r() < 0.5 ? '2px' : '11px' }} />
        ))}</div>
        <div className="sc-swrow"><Led r={r} /><Led r={r} /></div>
      </>)
    } else if (kind === 2) {
      body = (
        <div className="sc-swrow">
          <span className="sc-gauge" style={{ ['--a' as string]: `${Math.floor(r() * 220 - 110)}deg` }} />
          <Led r={r} /><Led r={r} />
        </div>
      )
    } else if (kind === 3) {
      body = theme === 'quarters'
        ? (<><div className="sc-locker" /><div className="sc-swrow" style={{ marginTop: 6 }}><Led r={r} /><Led r={r} /><Led r={r} /></div></>)
        : (<div className="sc-annun">{[0, 1, 2, 3].map(k => (
            <span key={k} style={{
              ['--ac' as string]: r() < 0.7 ? '#39ff7a' : '#ffb000',
              ['--d' as string]: `${(2 + r() * 5).toFixed(2)}s`, ['--dl' as string]: `${(r() * 4).toFixed(2)}s`,
            }}>{ANNUN[Math.floor(r() * ANNUN.length)]}</span>
          ))}</div>)
    } else {
      body = theme === 'deck'
        ? (<div className="sc-screen">{[0, 1, 2, 3, 4].map(k => (
            <i key={k} style={{ ['--h' as string]: `${20 + Math.floor(r() * 70)}%`, ['--d' as string]: `${(1.4 + r() * 2.4).toFixed(2)}s` }} />
          ))}</div>)
        : (<><div className="sc-swrow"><Led r={r} /><Led r={r} /><Led r={r} /><Led r={r} /></div>
           <div className="sc-swrow">{[0, 1].map(k => (
             <span key={k} className="sc-sw2" style={{ ['--p' as string]: r() < 0.5 ? '2px' : '11px' }} />
           ))}</div></>)
    }
    mods.push(<div key={i} className="sc-swmod"><div className="sc-lab">{label}</div>{body}</div>)
  }

  return <div className={`sc-sidewall sc-wall-${side} sc-theme-${theme}`} aria-hidden>{mods}</div>
}

export default CapsuleWall
