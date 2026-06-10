import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  fetchFinals,
  fetchFinalsRosters,
  fetchSeries,
  fetchPlayerStats,
  nbaHeadshot,
  type FinalsData,
  type FinalsPlayer,
  type SeriesGame,
  type PlayerStatLine,
} from '@/lib/nbaFinals'
import { HighlightsStrip } from './HighlightsStrip'

/**
 * FinalsCollision — 2026 NBA Finals takeover, Marvel-Infinity-War poster style.
 * Two ARMIES (New York Gotham-blue vs San Antonio silver) charge a converging
 * V toward the center, depth-layered in CSS 3D with mouse/gyro parallax. Anchors
 * Brunson (L) & Wemby (R) front-most; tiers recede into team-color fog. Center
 * stage: THE FINALS marquee, VS + tale-of-the-tape, casino countdown, trophy
 * god-ray. Entrance sequence runs once/session. All CSS/DOM — no three.js, real
 * text for SEO, 60fps, full prefers-reduced-motion fallback.
 *
 * Transform discipline: parallax lives in CSS vars (--px/--py) on the stage, a
 * single rAF lerp loop writes them, every layer composes its OWN transform from
 * those vars — nothing ever overwrites a flip/scale mid-tick. Rosters are
 * data-driven (anchor pinned by id, falls back to roster order).
 */

const BRUNSON = { pos: 'PG', ht: "6'2\"", wt: '190', age: '29' }
const WEMBY = { pos: 'C', ht: "7'4\"", wt: '235', age: '22' }

// Star priority per team (ids) — keeps the marquee names in the FRONT tiers
// (and guarantees the anchor is included even though ESPN rosters are
// alphabetical and slice Wemby out at index 17). Names/images still come from
// live ESPN data — this only orders it.
const STARS_NY = ['3934672', '3136195', '3147657', '3934719', '3062679', '4431823', '4351852'] // Brunson,Towns,Bridges,Anunoby,Hart,McBride,Robinson
const STARS_SA = ['5104157', '4066259', '4845367', '4395630', '6578', '4592479', '5037871'] // Wemby,Fox,Castle,Vassell,Barnes,Champagnie,Harper

// Wedge slots — a DENSE, bottom-anchored pyramid (Infinity-War logic): figures
// overlap 20-30%, grow out of the skyline, anchor huge + overlapping center.
// [x% from edge, bottom%, scale, z(px), tier]. tier: 0 front, 1 mid, 2 back.
type Slot = { x: number; b: number; s: number; z: number; t: 0 | 1 | 2 }
const SLOTS: Slot[] = [
  { x: 22, b: -10, s: 1.0, z: 80, t: 0 }, // ANCHOR — inner, huge, overlaps center
  { x: 9, b: -3, s: 0.6, z: 18, t: 1 }, // mid (outer shoulder)
  { x: 34, b: 3, s: 0.52, z: 12, t: 1 }, // mid (inner-upper, by the divider)
  { x: 2, b: 1, s: 0.42, z: -60, t: 2 }, // back
  { x: 18, b: 7, s: 0.38, z: -78, t: 2 }, // back
  { x: 30, b: 10, s: 0.34, z: -98, t: 2 }, // back
  { x: 11, b: 6, s: 0.32, z: -118, t: 2 }, // back
]
const TIER_RATE = [20, 13, 7] // parallax travel px per tier

// camera flashes + dust + windows (deterministic — no hydration drift)
const DUST: [number, number, number][] = [
  [5, 13, 0], [12, 16, 4], [19, 11, 7], [27, 18, 2], [34, 14, 9], [41, 12, 5],
  [48, 17, 1], [55, 13, 6], [62, 15, 3], [69, 11, 8], [76, 16, 2], [83, 14, 5],
  [90, 12, 7], [96, 18, 0], [9, 15, 10], [58, 16, 9], [88, 12, 4], [44, 13, 11],
]
const FLASH: [number, number, number, number][] = [
  [8, 30, 6, 0], [16, 56, 7, 2.5], [24, 24, 5, 4], [33, 62, 8, 1], [76, 28, 6, 3.5],
  [84, 58, 7, 0.8], [91, 38, 5, 5], [69, 52, 8, 2], [13, 68, 6, 6], [88, 22, 7, 4.5],
]
const WIN_NY: [number, number, number][] = [[10, 62, 0], [16, 50, 2], [22, 70, 4], [29, 44, 1], [35, 66, 3], [12, 78, 6], [31, 80, 2.5], [7, 68, 3.5]]
const WIN_SA: [number, number, number][] = [[62, 64, 1], [68, 52, 3], [74, 72, 0], [80, 46, 4], [86, 68, 2], [92, 58, 5], [70, 80, 3.5], [90, 74, 4.5]]

function useCountdown(targetIso?: string) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!targetIso || now == null) return null
  const diff = new Date(targetIso).getTime() - now
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true }
  return { d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000), done: false }
}

/** Order a roster by star priority (anchor first), so the marquee names fill
 *  the front tiers and the anchor is never sliced out. Falls back gracefully. */
function orderWedge(players: FinalsPlayer[], priority: string[]): FinalsPlayer[] {
  const rank = (id: string) => { const i = priority.indexOf(id); return i === -1 ? 99 + players.findIndex((p) => p.id === id) : i }
  return [...players].sort((a, b) => rank(a.id) - rank(b.id)).slice(0, SLOTS.length)
}

function PowerOn({ text }: { text: string }) {
  return <>{text.split('').map((ch, i) => <span key={i} className="fc-po" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>{ch === ' ' ? ' ' : ch}</span>)}</>
}

// Recognizable NYC silhouette — One WTC (antenna spire), Empire State (stepped
// needle), Chrysler (tapered crown), filler towers.
function GothamSkyline() {
  return (
    <svg viewBox="0 0 600 240" preserveAspectRatio="none" className="fc-skyline fc-skyline-ny" aria-hidden>
      <defs><linearGradient id="ny-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2552a8" stopOpacity="0.05" /><stop offset="55%" stopColor="#13294f" stopOpacity="1" /><stop offset="100%" stopColor="#060c18" stopOpacity="1" /></linearGradient></defs>
      <path fill="url(#ny-sky)" d="M0,240 L0,182 L26,182 L26,158 L48,158 L48,172 L60,172
        L60,96 L68,96 L68,150 L80,150 L80,40 L82,40 L82,10 L84,10 L84,40 L86,40 L86,96 L96,96 L96,172 L112,172
        L112,150 L134,150 L134,176 L150,176
        L150,84 L160,84 L160,60 L168,60 L168,34 L171,34 L171,8 L173,8 L173,34 L176,34 L176,60 L184,60 L184,84 L194,84 L194,176
        L214,176 L214,156 L236,156 L236,176 L250,176
        L250,104 L262,104 L262,80 L270,80 L270,44 L273,44 L273,22 L276,22 L276,44 L279,44 L279,80 L287,80 L287,104 L298,104 L298,176
        L322,176 L322,150 L346,150 L346,176
        L366,176 L366,116 L378,116 L378,176
        L398,176 L398,140 L420,140 L420,176 L600,176 L600,240 Z" />
    </svg>
  )
}
// San Antonio — Tower of the Americas (the giveaway: thin shaft + flared
// observation disc + antenna), Frost Tower faceted crown, downtown cluster.
function SilverSkyline() {
  return (
    <svg viewBox="0 0 600 240" preserveAspectRatio="none" className="fc-skyline fc-skyline-sa" aria-hidden>
      <defs><linearGradient id="sa-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4ced4" stopOpacity="0.06" /><stop offset="55%" stopColor="#1a2026" stopOpacity="1" /><stop offset="100%" stopColor="#0b0f14" stopOpacity="1" /></linearGradient></defs>
      <path fill="url(#sa-sky)" d="M0,240 L0,184 L40,184 L40,158 L66,158 L66,184 L96,184
        L96,150 L106,150 L106,122 L120,122 L120,184 L150,184
        L150,140 L162,140 L162,118 L172,108 L182,118 L182,140 L196,140 L196,184 L236,184
        L236,160 L262,160 L262,184 L286,184
        L286,86 L292,86 L292,76 L284,72 L284,64 L304,58 L324,64 L324,72 L316,76 L316,86 L322,86 L322,184
        L356,184 L356,120 L376,120 L376,184
        L406,184 L406,150 L430,150 L430,184 L466,184
        L466,104 L478,104 L478,184 L516,184 L516,140 L540,140 L540,184 L600,184 L600,240 Z" />
    </svg>
  )
}

function TapeRow({ label, ny, sa, i }: { label: string; ny: string; sa: string; i: number }) {
  return (
    <div className={`fc-tape-row ${i % 2 ? 'fc-from-right' : 'fc-from-left'}`} style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
      <span className="fc-tape-ny">{ny}</span><span className="fc-tape-lbl">{label}</span><span className="fc-tape-sa">{sa}</span>
    </div>
  )
}

function actionBase(name: string, side: 'ny' | 'sa'): string {
  const last = (name.split(' ').slice(-1)[0] || name).toLowerCase().replace(/[^a-z]/g, '')
  return `${side === 'ny' ? 'nyk' : 'sas'}-${last}-action`
}

function Wedge({ players, side, entering, actionSet }: { players: FinalsPlayer[]; side: 'ny' | 'sa'; entering: boolean; actionSet: Set<string> }) {
  return (
    <div className={`fc-wedge fc-wedge-${side}`} aria-hidden>
      <div className={`fc-fog fc-fog-${side}`} />
      {players.map((p, i) => {
        const slot = SLOTS[i]
        if (!slot) return null
        const pos = side === 'ny' ? { left: `${slot.x}%` } : { right: `${slot.x}%` }
        const anchor = i === 0
        const delay = entering ? 1.0 + (2 - slot.t) * 0.28 + i * 0.04 : 0
        const base = actionBase(p.name, side)
        const hasAction = actionSet.has(base)
        return (
          <div
            key={p.id}
            className={`fc-wp fc-wp-${side} fc-tier-${slot.t} ${anchor ? 'fc-anchor' : ''} ${hasAction ? 'fc-has-action' : ''} ${entering ? 'fc-wp-enter' : ''}`}
            style={{ ...pos, bottom: `${slot.b}%`, ['--s' as any]: slot.s, ['--z' as any]: `${slot.z}px`, ['--r' as any]: `${TIER_RATE[slot.t]}px`, animationDelay: `${delay}s` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hasAction ? `/players/action/${base}.png` : p.headshot}
              alt={p.name}
              className="fc-wp-img"
              loading={anchor ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => { const t = e.currentTarget; if (t.dataset.fb) return; t.dataset.fb = '1'; t.src = p.headshot; t.closest('.fc-wp')?.classList.remove('fc-has-action') }}
            />
            {anchor && <div className="fc-wp-name">{(p.name.split(' ').slice(-1)[0] || p.name).toUpperCase()}</div>}
          </div>
        )
      })}
    </div>
  )
}

export function FinalsCollision() {
  const [data, setData] = useState<FinalsData | null>(null)
  const [rosters, setRosters] = useState<{ home: FinalsPlayer[]; away: FinalsPlayer[] }>({ home: [], away: [] })
  const [series, setSeries] = useState<SeriesGame[]>([])
  const [entering, setEntering] = useState(false)
  const [expanded, setExpanded] = useState<{ player: FinalsPlayer; side: 'ny' | 'sa' } | null>(null)
  const [pstats, setPstats] = useState<PlayerStatLine | null>(null)
  const [pstatsLoading, setPstatsLoading] = useState(false)
  const [actionSet, setActionSet] = useState<Set<string>>(new Set())
  const didInit = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const openCard = (player: FinalsPlayer, side: 'ny' | 'sa') => {
    setExpanded({ player, side }); setPstats(null); setPstatsLoading(true)
    fetchPlayerStats(player.id).then((s) => { setPstats(s); setPstatsLoading(false) })
  }

  // data
  useEffect(() => {
    let alive = true
    const load = async () => {
      const d = await fetchFinals().catch(() => null)
      if (!alive || !d) return
      setData(d)
      if (!didInit.current) {
        didInit.current = true
        fetchFinalsRosters(d.home.id, d.away.id, 18).then((r) => alive && setRosters(r))
        fetchSeries(d.home.id, d.away.id).then((s) => alive && setSeries(s))
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  // entrance — once per session, skippable, never on reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (sessionStorage.getItem('fcEntranceSeen')) return
    sessionStorage.setItem('fcEntranceSeen', '1')
    setEntering(true)
    const end = () => setEntering(false)
    const t = setTimeout(end, 2600)
    window.addEventListener('pointerdown', end, { once: true })
    window.addEventListener('wheel', end, { once: true, passive: true })
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', end); window.removeEventListener('wheel', end) }
  }, [])

  // single rAF lerp parallax → writes --px/--py on the stage. Mouse on desktop,
  // slow auto-drift on touch. No per-element inline transforms (CSS composes).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const el = stageRef.current
    if (!el) return
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, start = Date.now()
    const onMove = (e: MouseEvent) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2 }
    const tick = () => {
      if (coarse) { const t = (Date.now() - start) / 1000; tx = Math.sin(t * 0.45) * 0.7; ty = Math.cos(t * 0.32) * 0.45 }
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06
      el.style.setProperty('--px', cx.toFixed(4)); el.style.setProperty('--py', cy.toFixed(4))
      raf = requestAnimationFrame(tick)
    }
    if (!coarse) window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove) }
  }, [])

  // Action-cutout manifest — lists which players have a licensed full-body
  // cutout in /public/players/action/. Empty by default (everyone falls back to
  // the broadcast-bust headshot); drop cutouts + update the manifest and those
  // players auto-upgrade to full-body, no rebuild.
  useEffect(() => {
    fetch('/players/action/manifest.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: string[]) => Array.isArray(arr) && setActionSet(new Set(arr)))
      .catch(() => {})
  }, [])

  const cd = useCountdown(data?.game.date)
  const ny = data ? (data.home.abbr === 'NY' ? data.home : data.away.abbr === 'NY' ? data.away : data.home) : null
  const sa = data ? (data.home.abbr === 'SA' ? data.home : data.away.abbr === 'SA' ? data.away : data.away) : null
  const nySide = data ? (data.game.home.teamId === ny?.id ? data.game.home : data.game.away) : null
  const saSide = data ? (data.game.home.teamId === sa?.id ? data.game.home : data.game.away) : null
  const state = data?.game.state ?? 'pre'
  const rawNy = rosters.home.length && ny && rosters.home[0]?.teamId === ny.id ? rosters.home : rosters.away
  const rawSa = rosters.home.length && sa && rosters.home[0]?.teamId === sa.id ? rosters.home : rosters.away
  const nyWedge = orderWedge(rawNy, STARS_NY)
  const saWedge = orderWedge(rawSa, STARS_SA)

  return (
    <div className="fc-root">
      <section className={`fc-hero ${entering ? 'fc-entrance' : ''}`}>
        <div className="fc-stage" ref={stageRef}>
          {/* cosmos + atmosphere (deep tiers) */}
          <div className="fc-cosmos">
            <div className="fc-split-ny" /><div className="fc-split-sa" />
            <div className="fc-stars" />
            <div className="fc-flashes">{FLASH.map(([l, t, d, dl], i) => <span key={i} className="fc-flash" style={{ left: `${l}%`, top: `${t}%`, animationDuration: `${d}s`, animationDelay: `${dl}s` }} />)}</div>
            <div className="fc-dust">{DUST.map(([l, d, dl], i) => <span key={i} className="fc-mote" style={{ left: `${l}%`, animationDuration: `${d}s`, animationDelay: `${dl}s` }} />)}</div>
          </div>
          <div className="fc-searchlights"><span className="fc-sl fc-sl-1" /><span className="fc-sl fc-sl-2" /></div>

          {/* team logo watermarks behind each wedge */}
          {ny?.logo && <img src={ny.logo} alt="" aria-hidden className="fc-wm fc-wm-ny" />}
          {sa?.logo && <img src={sa.logo} alt="" aria-hidden className="fc-wm fc-wm-sa" />}

          {/* skylines + windows + seam */}
          <div className="fc-skylines">
            <div className="fc-skyline-wrap fc-left"><GothamSkyline />{WIN_NY.map(([l, t, dl], i) => <span key={i} className="fc-win fc-win-ny" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${dl}s` }} />)}</div>
            <div className="fc-skyline-wrap fc-right"><SilverSkyline />{WIN_SA.map(([l, t, dl], i) => <span key={i} className="fc-win fc-win-sa" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${dl}s` }} />)}</div>
            <div className="fc-seam" />
          </div>

          {/* the two armies */}
          <Wedge players={nyWedge} side="ny" entering={entering} actionSet={actionSet} />
          <Wedge players={saWedge} side="sa" entering={entering} actionSet={actionSet} />

          {/* trophy + god-ray rising through the VS */}
          <div className="fc-trophy-wrap" aria-hidden>
            <div className="fc-godray" />
            <svg className="fc-trophy" viewBox="0 0 80 120" fill="none">
              <defs>
                <linearGradient id="fc-gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff3c4" /><stop offset="35%" stopColor="#f4d36a" /><stop offset="70%" stopColor="#c9972f" /><stop offset="100%" stopColor="#8a6314" />
                </linearGradient>
              </defs>
              {/* Larry O'Brien — ball on a tapered net/funnel stem + base */}
              <circle cx="40" cy="22" r="18" fill="url(#fc-gold)" />
              <path d="M28 36 Q40 50 52 36 L57 64 Q40 76 23 64 Z" fill="url(#fc-gold)" />
              <rect x="34" y="74" width="12" height="20" rx="2" fill="url(#fc-gold)" />
              <path d="M22 94 L58 94 L64 112 L16 112 Z" fill="url(#fc-gold)" />
            </svg>
          </div>

          {/* ── CENTER STAGE ── */}
          <div className="fc-core">
            <div className="fc-kicker"><span className="fc-dot" /> <span className="fc-eyebrow"><PowerOn text="NBA FINALS · 2026" /></span>{state === 'in' && <span className="fc-live">● LIVE</span>}</div>
            <div className="fc-titlewrap"><span className="fc-halo" aria-hidden /><h1 className="fc-title">THE&nbsp;FINALS</h1></div>

            <div className="fc-vs-col">
              <div className="fc-vs"><span className="fc-vs-glint" aria-hidden />VS</div>
              <div className="fc-tape">
                <TapeRow label="POS" ny={BRUNSON.pos} sa={WEMBY.pos} i={0} />
                <TapeRow label="HT" ny={BRUNSON.ht} sa={WEMBY.ht} i={1} />
                <TapeRow label="WT" ny={BRUNSON.wt} sa={WEMBY.wt} i={2} />
                <TapeRow label="AGE" ny={BRUNSON.age} sa={WEMBY.age} i={3} />
              </div>
            </div>

            <div className="fc-state">
              {state === 'in' && nySide && saSide ? (
                <div className="fc-score"><span className="fc-score-ny">{nySide.score}</span><span className="fc-score-mid">{data?.game.shortDetail || `Q${data?.game.period}`}</span><span className="fc-score-sa">{saSide.score}</span></div>
              ) : state === 'post' && nySide && saSide ? (
                <div className="fc-score"><span className="fc-score-ny">{nySide.score}</span><span className="fc-score-mid">FINAL</span><span className="fc-score-sa">{saSide.score}</span></div>
              ) : cd && !cd.done ? (
                <div className="fc-cd">
                  <div className="fc-cd-lbl fc-tips">GAME 4 · NEW YORK · TIPS IN</div>
                  <div className="fc-cd-clock">
                    <span className="fc-cd-cell"><b>{String(cd.h + cd.d * 24).padStart(2, '0')}</b><i>HRS</i></span>
                    <span className="fc-cd-cell"><b>{String(cd.m).padStart(2, '0')}</b><i>MIN</i></span>
                    <span className="fc-cd-cell"><b key={cd.s} className="fc-flip">{String(cd.s).padStart(2, '0')}</b><i>SEC</i></span>
                  </div>
                </div>
              ) : (<div className="fc-cd-lbl">GAME 4 · NEW YORK · TONIGHT</div>)}
              {data?.game.seriesSummary && <div className="fc-series-sum">{data.game.seriesSummary.toUpperCase()}</div>}
            </div>

            <div className="fc-cta-row">
              <a href="#fanzone" className="fc-cta fc-cta-ticket"><span className="fc-shine" aria-hidden />ENTER THE FAN ZONE</a>
              <a href="#bracket" className="fc-cta fc-cta-metal">SERIES &amp; HIGHLIGHTS</a>
            </div>
          </div>
        </div>
        <div className="fc-scrollhint">▾ THE SERIES BELOW</div>
      </section>

      {/* ════ SERIES BRACKET ════ */}
      <section id="bracket" className="fc-sec">
        <h2 className="fc-h2">THE ROAD · BEST OF 7</h2>
        <div className="fc-bracket">
          {(series.length ? series : [1, 2, 3, 4].map((g) => ({ game: g, state: 'pre' as const }))).slice(0, 7).map((g: any) => {
            const done = g.state === 'post', live = g.state === 'in'
            return (
              <div key={g.game} className={`fc-game ${live ? 'fc-game-live' : ''} ${g.game === 4 ? 'fc-game-tonight' : ''}`}>
                <div className="fc-game-no">G{g.game}{g.game === 4 ? ' · TONIGHT' : ''}</div>
                {done || live ? (<div className="fc-game-score"><span>{g.awayAbbr} {g.awayScore}</span><span className="fc-game-at">@</span><span>{g.homeAbbr} {g.homeScore}</span></div>) : (<div className="fc-game-score fc-game-upcoming">{live ? 'LIVE' : 'UPCOMING'}</div>)}
                {g.winnerAbbr && <div className="fc-game-win">{g.winnerAbbr} WIN</div>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ════ COMBATANTS ════ */}
      {(nyWedge.length > 0 || saWedge.length > 0) && (
        <section className="fc-sec">
          <h2 className="fc-h2">THE COMBATANTS</h2>
          <div className="fc-roster">
            {[{ team: ny, players: rawNy, side: 'ny' as const }, { team: sa, players: rawSa, side: 'sa' as const }].map(({ team, players, side }) => (
              <div key={side} className={`fc-roster-team fc-roster-${side}`}>
                <div className="fc-roster-head">{team?.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.logo} alt="" className="fc-roster-logo" />)}<span className="fc-roster-tag">{side === 'ny' ? 'NEW YORK' : 'SAN ANTONIO'}</span></div>
                <div className="fc-roster-rail">{players.map((p) => (
                  <button key={p.id} type="button" onClick={() => openCard(p, side)} className={`fc-card fc-card-${side}`}><div className="fc-card-glow" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.headshot} alt={p.name} className="fc-card-img" loading="lazy" /><div className="fc-card-name">{p.name}</div><div className="fc-card-meta">#{p.jersey} · {p.pos}</div><div className="fc-card-tap">VIEW STATS →</div></button>
                ))}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════ HIGHLIGHTS ════ */}
      <section className="fc-sec"><h2 className="fc-h2">FILM ROOM · HIGHLIGHTS</h2><HighlightsStrip sport={'nba' as any} limit={12} /></section>

      {/* ════ FAN ZONE ════ */}
      <section id="fanzone" className="fc-sec fc-fanzone">
        <h2 className="fc-h2">THE FAN ZONE · GOTHAM ROARS</h2>
        <p className="fc-fan-copy">Game 4 in New York. Drop your reactions, the post-game mob footage, talk your trash — live with every fan in the building, right here, no leaving the arena.</p>
        <div className="fc-fan-cta-row"><Link href="/" className="fc-cta fc-cta-ticket"><span className="fc-shine" aria-hidden />🔥 LIVE FAN TAKES</Link><Link href="/picks" className="fc-cta fc-cta-metal">🎯 MAKE YOUR GAME-4 CALL</Link></div>
      </section>

      {/* ════ EXPANDED PLAYER STAT CARD ════ */}
      {expanded && (() => {
        const team = expanded.side === 'ny' ? ny : sa
        const teamName = expanded.side === 'ny' ? 'NEW YORK' : 'SAN ANTONIO'
        return (
          <div className="fc-statmodal" onClick={() => setExpanded(null)} role="dialog" aria-modal="true">
            <div className={`fc-statcard fc-statcard-${expanded.side}`} onClick={(e) => e.stopPropagation()}>
              <div className="fc-statcity">{expanded.side === 'ny' ? <GothamSkyline /> : <SilverSkyline />}</div>
              <div className="fc-statbg" />
              <div className="fc-statteam">{teamName}</div>
              <button type="button" className="fc-statclose" onClick={() => setExpanded(null)} aria-label="Close">✕</button>
              <div className="fc-statbody">
                <div className="fc-statleft">
                  {team?.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logo} alt="" className="fc-statlogo" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={expanded.player.headshot} alt={expanded.player.name} className="fc-statimg" />
                </div>
                <div className="fc-statright">
                  <div className="fc-statname">{expanded.player.name}</div>
                  <div className="fc-statmeta">#{expanded.player.jersey} · {expanded.player.pos} · {team?.name}</div>
                  {pstatsLoading ? (
                    <div className="fc-statloading">Loading stats…</div>
                  ) : pstats ? (
                    <>
                      <div className="fc-statheadline">
                        {[['PPG', pstats.headline.pts], ['RPG', pstats.headline.reb], ['APG', pstats.headline.ast]].map(([l, v]) => (
                          <div key={l} className="fc-stathl"><b>{v}</b><i>{l}</i></div>
                        ))}
                      </div>
                      <div className="fc-statgrid">
                        {pstats.line.map((s) => (
                          <div key={s.label} className="fc-statcell"><span>{s.label}</span><b>{s.value}</b></div>
                        ))}
                      </div>
                      <div className="fc-statseason">{pstats.season} SEASON AVERAGES · ESPN</div>
                    </>
                  ) : (
                    <div className="fc-statloading">Season stats unavailable.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <style jsx global>{`
        .fc-root { background: #04060c; color: #fff; overflow-x: clip; }
        .fc-sec { box-sizing: border-box; }
        .fc-hero { position: relative; width: 100%; max-width: 100vw; min-height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; perspective: 1200px; isolation: isolate; }
        .fc-stage { position: absolute; inset: 0; transform-style: preserve-3d; display: flex; align-items: center; justify-content: center; --px: 0; --py: 0; }

        /* cosmos */
        .fc-cosmos { position: absolute; inset: 0; transform: translateZ(-200px) scale(1.18); }
        .fc-split-ny, .fc-split-sa { position: absolute; inset: -12%; }
        .fc-split-ny { background: radial-gradient(60% 80% at 18% 46%, rgba(29,66,138,0.66), rgba(245,132,38,0.18) 38%, transparent 66%); }
        .fc-split-sa { background: radial-gradient(60% 80% at 82% 46%, rgba(196,206,212,0.34), rgba(120,134,148,0.12) 38%, transparent 66%); }
        .fc-stars { position: absolute; inset: 0; opacity: .5; background-image: radial-gradient(1px 1px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 62%,#cfe0ff,transparent),radial-gradient(1px 1px at 47% 28%,#fff,transparent),radial-gradient(1.4px 1.4px at 63% 71%,#fff,transparent),radial-gradient(1px 1px at 78% 22%,#e8eef5,transparent),radial-gradient(1px 1px at 88% 58%,#fff,transparent),radial-gradient(1px 1px at 38% 84%,#fff,transparent),radial-gradient(1.4px 1.4px at 8% 78%,#fff,transparent); animation: fc-twinkle 5s ease-in-out infinite alternate; }
        @keyframes fc-twinkle { from { opacity: .32; } to { opacity: .66; } }
        .fc-flashes, .fc-dust { position: absolute; inset: 0; pointer-events: none; }
        .fc-flash { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fff; opacity: 0; box-shadow: 0 0 10px 3px rgba(255,255,255,.9); animation: fc-flash 6s ease-in-out infinite; }
        @keyframes fc-flash { 0%,92%,100% { opacity: 0; transform: scale(.4); } 94% { opacity: 1; transform: scale(1.3); } 96% { opacity: .2; } }
        .fc-mote { position: absolute; bottom: -6%; width: 3px; height: 3px; border-radius: 50%; background: radial-gradient(#ffe9a8, rgba(245,200,90,.2)); box-shadow: 0 0 6px 1px rgba(245,200,90,.5); opacity: 0; animation: fc-rise linear infinite; }
        @keyframes fc-rise { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: .9; } 88% { opacity: .7; } 100% { transform: translateY(-108vh); opacity: 0; } }

        .fc-searchlights { position: absolute; inset: 0; transform: translateZ(-120px); pointer-events: none; mix-blend-mode: screen; overflow: hidden; }
        .fc-sl { position: absolute; top: -40%; left: 50%; width: 16vw; height: 150%; transform-origin: top center; background: linear-gradient(to bottom, rgba(180,210,255,.16), rgba(180,210,255,.04) 50%, transparent 78%); filter: blur(6px); }
        .fc-sl-1 { animation: fc-sweepA 12s ease-in-out infinite alternate; }
        .fc-sl-2 { background: linear-gradient(to bottom, rgba(255,224,160,.14), rgba(255,224,160,.04) 50%, transparent 78%); animation: fc-sweepB 14s ease-in-out infinite alternate; }
        @keyframes fc-sweepA { from { transform: translateX(-50%) rotate(-26deg); } to { transform: translateX(-50%) rotate(20deg); } }
        @keyframes fc-sweepB { from { transform: translateX(-50%) rotate(24deg); } to { transform: translateX(-50%) rotate(-22deg); } }

        /* logo watermarks */
        .fc-wm { position: absolute; bottom: 6%; width: clamp(200px,32vw,460px); opacity: .05; filter: grayscale(.2); transform: translate3d(calc(var(--px) * 5px), calc(var(--py) * 4px), -160px); }
        .fc-wm-ny { left: 3%; } .fc-wm-sa { right: 3%; }

        /* skylines */
        .fc-skylines { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; display: flex; transform: translate3d(calc(var(--px) * 4px), 0, -150px) scale(1.1); }
        .fc-skyline-wrap { position: relative; width: 56%; height: 100%; }
        .fc-skyline-wrap.fc-right { margin-left: auto; }
        .fc-skyline { width: 100%; height: 100%; display: block; }
        .fc-skyline-ny { filter: drop-shadow(0 0 20px rgba(29,66,138,.7)); transform: skewX(6deg); transform-origin: bottom right; }
        .fc-skyline-sa { filter: drop-shadow(0 0 20px rgba(196,206,212,.5)); transform: skewX(-6deg); transform-origin: bottom left; }
        .fc-win { position: absolute; width: 2px; height: 2px; border-radius: 1px; opacity: 0; animation: fc-winblink 4s ease-in-out infinite; }
        .fc-win-ny { background: #ffd27a; box-shadow: 0 0 5px 1px rgba(255,210,122,.8); }
        .fc-win-sa { background: #dfe8f0; box-shadow: 0 0 5px 1px rgba(223,232,240,.7); }
        @keyframes fc-winblink { 0%,100% { opacity: .15; } 50% { opacity: .95; } }
        .fc-seam { position: absolute; top: -150%; bottom: 0; left: 50%; width: 3px; transform: translateX(-50%); background: linear-gradient(to bottom, transparent, #bcd8ff 16%, #fff 50%, #e6ecf2 84%, transparent); box-shadow: 0 0 26px 7px rgba(150,195,255,.5), 0 0 70px 22px rgba(196,206,212,.25); animation: fc-seampulse 3s ease-in-out infinite; }
        @keyframes fc-seampulse { 0%,100% { opacity: .72; } 50% { opacity: 1; } }

        /* ── wedges (the armies) ── */
        .fc-wedge { position: absolute; inset: 0; pointer-events: none; }
        .fc-fog { position: absolute; bottom: 0; top: 10%; width: 46%; }
        .fc-fog-ny { left: 0; background: linear-gradient(90deg, rgba(29,66,138,.34), rgba(245,132,38,.06) 55%, transparent); }
        .fc-fog-sa { right: 0; background: linear-gradient(270deg, rgba(196,206,212,.26), rgba(20,24,30,.10) 55%, transparent); }
        .fc-wp { position: absolute; width: clamp(190px, 25vw, 340px); transform: translate3d(calc(var(--px) * var(--r)), calc(var(--py) * var(--r) * 0.5), var(--z)) scale(var(--s)); transform-origin: bottom center; will-change: transform; }
        /* ANCHOR — premium broadcast bust. Brunson/Wemby big, rising beside the
           title, fading up out of shadow so a head-and-shoulders crop reads as an
           intentional TNT-style intro graphic, not a floating head. Full-body
           action cutouts (when present) override this via .fc-has-action. */
        .fc-anchor { width: clamp(380px, 52vw, 760px); }
        .fc-anchor .fc-wp-img { -webkit-mask-image: linear-gradient(to bottom, #000 56%, transparent 94%); mask-image: linear-gradient(to bottom, #000 56%, transparent 94%); }
        /* feather the bottom edge so cutouts grow out of the layer below (no pasted-PNG look) */
        .fc-wp-img { width: 100%; display: block; -webkit-mask-image: linear-gradient(to bottom, #000 74%, transparent 98%); mask-image: linear-gradient(to bottom, #000 74%, transparent 98%); }
        /* full-body action cutout present → let it dominate (feet at bottom, head to title) */
        .fc-has-action.fc-anchor { width: clamp(340px, 46vw, 640px); }
        .fc-has-action .fc-wp-img { -webkit-mask-image: linear-gradient(to bottom, #000 90%, transparent 100%); mask-image: linear-gradient(to bottom, #000 90%, transparent 100%); }
        .fc-wp-ny .fc-wp-img { filter: drop-shadow(0 4px 8px rgba(0,0,0,.55)); }
        .fc-wp-sa .fc-wp-img { transform: scaleX(-1); filter: drop-shadow(0 4px 8px rgba(0,0,0,.55)); }
        .fc-tier-1 .fc-wp-img { filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)) brightness(.92); }
        .fc-tier-2 { opacity: .55; }
        .fc-tier-2 .fc-wp-img { filter: blur(2px) brightness(.5) drop-shadow(0 4px 6px rgba(0,0,0,.5)); }
        .fc-anchor.fc-wp-ny .fc-wp-img { filter: drop-shadow(0 0 26px rgba(29,66,138,.95)) drop-shadow(-6px 0 14px rgba(245,132,38,.55)) drop-shadow(0 8px 10px rgba(0,0,0,.6)); }
        .fc-anchor.fc-wp-sa .fc-wp-img { filter: drop-shadow(0 0 26px rgba(196,206,212,.9)) drop-shadow(6px 0 14px rgba(255,255,255,.4)) drop-shadow(0 8px 10px rgba(0,0,0,.6)); }
        .fc-wp-name { position: absolute; bottom: 6px; left: 0; right: 0; text-align: center; font-weight: 900; font-size: clamp(13px,1.5vw,20px); letter-spacing: .05em; }
        .fc-anchor.fc-wp-ny .fc-wp-name { color: #8fb6ff; text-shadow: 0 0 8px rgba(120,165,255,.9), 0 0 16px rgba(29,66,138,.8); }
        .fc-anchor.fc-wp-sa .fc-wp-name { color: #eef3f8; text-shadow: 0 0 8px rgba(223,232,240,.9); }

        /* trophy + god-ray */
        .fc-trophy-wrap { position: absolute; bottom: 2%; left: 50%; transform: translateX(-50%) translateZ(-30px); pointer-events: none; }
        .fc-godray { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 120px; height: 60vh; background: linear-gradient(to top, rgba(255,220,140,.5), rgba(255,220,140,.12) 35%, transparent 70%); filter: blur(10px); mix-blend-mode: screen; animation: fc-ray 5s ease-in-out infinite; }
        @keyframes fc-ray { 0%,100% { opacity: .55; } 50% { opacity: .85; } }
        .fc-trophy { width: clamp(40px,6vw,72px); height: auto; filter: drop-shadow(0 0 18px rgba(255,210,120,.85)); animation: fc-trophyglow 4s ease-in-out infinite; }
        @keyframes fc-trophyglow { 0%,100% { filter: drop-shadow(0 0 14px rgba(255,210,120,.7)); } 50% { filter: drop-shadow(0 0 26px rgba(255,224,150,.95)); } }

        /* ── center stage ── */
        .fc-core { position: relative; z-index: 5; text-align: center; padding: 4vh 16px; max-width: 760px; transform: translateZ(90px); }
        .fc-core::before { content: ''; position: absolute; inset: -8% -24%; z-index: -1; background: radial-gradient(closest-side, rgba(4,6,12,.74), rgba(4,6,12,.4) 52%, transparent 80%); pointer-events: none; }
        .fc-kicker { font-size: 10px; letter-spacing: .3em; font-weight: 800; color: #cdd7e2; margin-bottom: 12px; display: inline-flex; align-items: center; gap: 9px; }
        .fc-dot { width: 7px; height: 7px; border-radius: 2px; background: #f58426; box-shadow: 0 0 12px #f58426; }
        .fc-eyebrow .fc-po { display: inline-block; opacity: 0; animation: fc-poweron .5s ease forwards; }
        @keyframes fc-poweron { from { opacity: 0; filter: blur(3px); } to { opacity: 1; filter: blur(0); } }
        .fc-live { color: #ff3b3b; animation: fc-blink 1.1s steps(2) infinite; }
        @keyframes fc-blink { 50% { opacity: .3; } }
        .fc-titlewrap { position: relative; display: inline-block; }
        .fc-halo { position: absolute; left: 50%; top: 52%; width: 120%; height: 200%; transform: translate(-50%,-50%); background: radial-gradient(closest-side, rgba(255,224,150,.30), rgba(255,200,90,.10) 50%, transparent 72%); filter: blur(6px); animation: fc-halo 5s ease-in-out infinite; z-index: -1; }
        @keyframes fc-halo { 0%,100% { opacity: .55; transform: translate(-50%,-50%) scale(.96); } 50% { opacity: .9; transform: translate(-50%,-50%) scale(1.04); } }
        .fc-title { font-size: clamp(40px,8vw,108px); font-weight: 900; line-height: .9; letter-spacing: -0.025em; margin: 0; text-transform: uppercase; background: linear-gradient(100deg,#9a6b1c 0%,#f4d36a 18%,#fff7df 32%,#f4d36a 46%,#c9972f 60%,#f4d36a 76%,#fff7df 90%,#9a6b1c 100%); background-size: 260% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 3px 26px rgba(255,210,120,.35)); animation: fc-goldsweep 6s linear infinite; }
        @keyframes fc-goldsweep { 0% { background-position: 210% 0; } 100% { background-position: -60% 0; } }
        .fc-vs-col { display: flex; flex-direction: column; align-items: center; margin: 2vh 0 1vh; }
        .fc-vs { position: relative; font-weight: 900; font-size: clamp(24px,4.4vw,54px); font-style: italic; transform-style: preserve-3d; background: linear-gradient(160deg,#fff7df,#f4d36a 40%,#9a6b1c 70%,#f4d36a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 14px rgba(245,200,90,.6)); animation: fc-vstilt 8s ease-in-out infinite; }
        @keyframes fc-vstilt { 0%,100% { transform: rotateY(-10deg) rotateX(3deg); } 50% { transform: rotateY(10deg) rotateX(-3deg); } }
        .fc-vs-glint { position: absolute; left: 50%; top: 50%; width: 160%; height: 160%; transform: translate(-50%,-50%); background: radial-gradient(closest-side, rgba(255,255,255,.85), transparent 60%); opacity: 0; pointer-events: none; animation: fc-glint 6s ease-in-out infinite; }
        @keyframes fc-glint { 0%,84%,100% { opacity: 0; } 90% { opacity: .9; transform: translate(-30%,-60%) scale(.5); } 96% { opacity: 0; transform: translate(20%,-40%) scale(1.4); } }
        .fc-tape { margin-top: 8px; width: clamp(180px,30vw,260px); }
        .fc-tape-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 4px 0; border-top: 1px solid; border-image: linear-gradient(90deg, transparent, rgba(245,200,90,.55), transparent) 1; font-size: clamp(11px,1.5vw,14px); opacity: 0; }
        .fc-from-left { animation: fc-inL .6s ease forwards; } .fc-from-right { animation: fc-inR .6s ease forwards; }
        @keyframes fc-inL { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fc-inR { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
        .fc-tape-ny, .fc-tape-sa { color: #fff; font-weight: 800; } .fc-tape-ny { text-align: right; } .fc-tape-sa { text-align: left; }
        .fc-tape-lbl { font-size: 8px; letter-spacing: .2em; color: #8a939e; font-weight: 700; text-transform: uppercase; }
        .fc-state { margin: 1.4vh 0; }
        .fc-score { display: inline-flex; align-items: center; gap: 18px; font-weight: 900; }
        .fc-score-ny { font-size: clamp(34px,6vw,66px); color: #8fb6ff; text-shadow: 0 0 20px rgba(29,66,138,.8); }
        .fc-score-sa { font-size: clamp(34px,6vw,66px); color: #eef3f8; text-shadow: 0 0 20px rgba(196,206,212,.7); }
        .fc-score-mid { font-size: 12px; letter-spacing: .2em; color: #ff5a3c; font-weight: 800; }
        .fc-cd-lbl { font-size: clamp(11px,1.6vw,14px); letter-spacing: .28em; font-weight: 800; color: #e7d9b0; }
        .fc-tips { animation: fc-tipspulse 1s ease-in-out infinite; }
        @keyframes fc-tipspulse { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
        .fc-cd-clock { display: inline-flex; gap: 12px; margin-top: 12px; perspective: 500px; }
        .fc-cd-cell { position: relative; display: flex; flex-direction: column; align-items: center; min-width: 56px; padding: 10px 8px; border-radius: 7px; border: 1px solid rgba(245,210,120,.55); background: linear-gradient(180deg, rgba(30,24,8,.7), rgba(10,12,20,.7)); box-shadow: inset 0 0 14px rgba(245,200,90,.18), 0 0 18px rgba(245,200,90,.12); }
        .fc-cd-cell::before, .fc-cd-cell::after { content: ''; position: absolute; left: 4px; right: 4px; height: 3px; background-image: radial-gradient(circle, rgba(255,225,150,.95) 0 1.2px, transparent 1.4px); background-size: 9px 3px; background-repeat: repeat-x; opacity: .8; }
        .fc-cd-cell::before { top: 3px; } .fc-cd-cell::after { bottom: 3px; }
        .fc-cd-cell b { font-size: clamp(22px,3.2vw,34px); font-weight: 900; line-height: 1; color: #ffe9b0; text-shadow: 0 0 10px rgba(245,200,90,.5); }
        .fc-cd-cell i { font-size: 8px; letter-spacing: .2em; color: #8a7c52; font-style: normal; margin-top: 5px; }
        .fc-flip { display: inline-block; animation: fc-cardflip .45s ease; transform-origin: center; }
        @keyframes fc-cardflip { from { transform: rotateX(-90deg); opacity: .2; } to { transform: rotateX(0); opacity: 1; } }
        .fc-series-sum { margin-top: 12px; font-size: 12px; letter-spacing: .26em; font-weight: 800; color: #f58426; }
        .fc-cta-row, .fc-fan-cta-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 2.2vh; }
        .fc-cta { position: relative; overflow: hidden; font-size: 12px; font-weight: 800; letter-spacing: .12em; padding: 12px 22px; border-radius: 999px; color: #fff; text-decoration: none; transition: transform .15s, box-shadow .25s, border-color .25s; }
        .fc-cta-ticket { background: linear-gradient(90deg,#b8860b,#f5b942,#f58426,#f5b942,#b8860b); background-size: 220% 100%; border: 1px solid rgba(255,220,140,.5); box-shadow: 0 0 18px rgba(245,160,40,.35); animation: fc-ticketgrad 7s linear infinite, fc-breathe 4s ease-in-out infinite; }
        @keyframes fc-ticketgrad { to { background-position: 220% 0; } }
        @keyframes fc-breathe { 0%,100% { box-shadow: 0 0 16px rgba(245,160,40,.3); } 50% { box-shadow: 0 0 30px rgba(245,160,40,.55); } }
        .fc-cta-ticket:hover { transform: scale(1.04); }
        .fc-shine { position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(105deg, transparent, rgba(255,255,255,.55), transparent); animation: fc-shine 8s ease-in-out infinite; }
        @keyframes fc-shine { 0%,72%,100% { left: -60%; } 84% { left: 130%; } }
        .fc-cta-metal { background: linear-gradient(180deg, rgba(60,66,74,.5), rgba(20,24,30,.5)); border: 1px solid; border-image: linear-gradient(180deg, rgba(220,228,236,.7), rgba(120,130,140,.4)) 1; }
        .fc-cta-metal:hover { box-shadow: 0 0 22px rgba(200,214,228,.4); border-color: #cdd9e6; color: #eef3f8; }
        .fc-scrollhint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); z-index: 6; font-size: 9px; letter-spacing: .3em; color: #5b6672; animation: fc-bob 2s ease-in-out infinite; }
        @keyframes fc-bob { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,5px); } }

        /* ── entrance sequence (once/session) ── */
        .fc-entrance .fc-stage::after { content: ''; position: absolute; inset: 0; background: #04060c; z-index: 50; animation: fc-darkfade 1.4s ease forwards; pointer-events: none; }
        @keyframes fc-darkfade { 0%,30% { opacity: 1; } 100% { opacity: 0; } }
        .fc-entrance .fc-title, .fc-entrance .fc-vs, .fc-entrance .fc-tape, .fc-entrance .fc-state, .fc-entrance .fc-cta-row, .fc-entrance .fc-kicker { opacity: 0; animation: fc-fadeup .7s ease forwards; }
        .fc-entrance .fc-title { animation-delay: .7s; } .fc-entrance .fc-kicker { animation-delay: .6s; }
        .fc-entrance .fc-vs { animation-delay: 1.5s; } .fc-entrance .fc-tape { animation-delay: 1.6s; }
        .fc-entrance .fc-state { animation-delay: 1.8s; } .fc-entrance .fc-cta-row { animation-delay: 2s; }
        @keyframes fc-fadeup { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fc-wp-enter { animation: fc-charge .8s cubic-bezier(.2,.8,.2,1) backwards; }
        .fc-wp-ny.fc-wp-enter { animation-name: fc-chargeL; } .fc-wp-sa.fc-wp-enter { animation-name: fc-chargeR; }
        @keyframes fc-chargeL { from { opacity: 0; transform: translate3d(-80px,0,var(--z)) scale(var(--s)); } to { opacity: 1; transform: translate3d(0,0,var(--z)) scale(var(--s)); } }
        @keyframes fc-chargeR { from { opacity: 0; transform: translate3d(80px,0,var(--z)) scale(var(--s)); } to { opacity: 1; transform: translate3d(0,0,var(--z)) scale(var(--s)); } }
        .fc-tier-2.fc-wp-enter { opacity: .55; }

        /* sections */
        .fc-sec { max-width: 1100px; margin: 0 auto; padding: 44px 16px; }
        .fc-h2 { font-size: clamp(16px,2.4vw,24px); font-weight: 900; letter-spacing: .16em; text-align: center; margin: 0 0 22px; background: linear-gradient(90deg,#8fb6ff,#fff,#c4ced4); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .fc-bracket { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        .fc-game { border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 12px; background: rgba(255,255,255,.02); text-align: center; }
        .fc-game-tonight { border-color: #f58426; animation: fc-tonight 3s ease-in-out infinite; }
        @keyframes fc-tonight { 0%,100% { box-shadow: 0 0 0 1px rgba(245,132,38,.35), 0 0 18px rgba(245,132,38,.12); } 50% { box-shadow: 0 0 0 1px rgba(245,132,38,.6), 0 0 30px rgba(245,132,38,.25); } }
        .fc-game-live { border-color: #ff3b3b; }
        .fc-game-no { font-size: 9px; letter-spacing: .18em; color: #8a96a2; font-weight: 800; margin-bottom: 8px; }
        .fc-game-score { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; font-size: 14px; }
        .fc-game-at { color: #5b6672; font-size: 10px; } .fc-game-upcoming { color: #6b7682; font-size: 11px; letter-spacing: .15em; }
        .fc-game-win { margin-top: 6px; font-size: 9px; letter-spacing: .15em; color: #f58426; font-weight: 800; }
        .fc-roster { display: grid; grid-template-columns: 1fr; gap: 18px; }
        /* min-width:0 lets the grid items shrink below their content so the rail
           SCROLLS instead of expanding the page (the no-scroll / overflow bug). */
        .fc-roster-team { min-width: 0; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,.1); }
        .fc-roster-ny { background: linear-gradient(135deg, rgba(29,66,138,.28), rgba(245,132,38,.06) 60%, transparent); border-left: 3px solid #1d428a; }
        .fc-roster-sa { background: linear-gradient(135deg, rgba(196,206,212,.18), transparent 60%); border-left: 3px solid #c4ced4; }
        .fc-roster-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .fc-roster-logo { width: 30px; height: 30px; object-fit: contain; }
        .fc-roster-tag { font-size: 12px; letter-spacing: .25em; font-weight: 900; }
        .fc-roster-ny .fc-roster-tag { color: #8fb6ff; } .fc-roster-sa .fc-roster-tag { color: #eef3f8; }
        .fc-roster-rail { display: flex; gap: 12px; overflow-x: auto; overflow-y: hidden; min-width: 0; padding-bottom: 8px; scrollbar-width: thin; -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; }
        .fc-roster-rail::-webkit-scrollbar { height: 6px; } .fc-roster-rail::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 3px; }
        .fc-card { scroll-snap-align: start; }
        .fc-card { position: relative; flex: 0 0 auto; width: 124px; text-align: center; border-radius: 14px; padding: 10px 8px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); overflow: hidden; transition: transform .18s; }
        .fc-card:hover { transform: translateY(-4px); }
        .fc-card-glow { position: absolute; left: 50%; top: -20%; width: 120%; height: 90%; transform: translateX(-50%); border-radius: 50%; filter: blur(12px); z-index: 0; }
        .fc-card-ny .fc-card-glow { background: radial-gradient(closest-side, rgba(29,66,138,.55), transparent 72%); }
        .fc-card-sa .fc-card-glow { background: radial-gradient(closest-side, rgba(196,206,212,.4), transparent 72%); }
        .fc-card-img { position: relative; z-index: 1; width: 100%; height: 96px; object-fit: contain; object-position: bottom; }
        .fc-card-name { position: relative; z-index: 1; font-size: 11px; font-weight: 800; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fc-card-meta { position: relative; z-index: 1; font-size: 9px; color: #8a96a2; }
        .fc-fanzone { text-align: center; }
        .fc-fan-copy { max-width: 560px; margin: 0 auto 18px; color: #b6c0cc; font-size: 14px; line-height: 1.6; }

        /* card is a button now — reset + tap hint */
        .fc-card { font: inherit; color: inherit; cursor: pointer; }
        .fc-card-tap { position: relative; z-index: 1; font-size: 8px; letter-spacing: .12em; color: #f5b942; font-weight: 800; margin-top: 5px; opacity: .6; transition: opacity .15s; }
        .fc-card:hover .fc-card-tap { opacity: 1; }

        /* ── expanded cinematic stat card ── */
        .fc-statmodal { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(2,4,9,.86); backdrop-filter: blur(8px); animation: fc-modalin .2s ease; }
        @keyframes fc-modalin { from { opacity: 0; } to { opacity: 1; } }
        .fc-statcard { position: relative; width: 100%; max-width: 620px; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,.12); background: #060a12; box-shadow: 0 30px 80px rgba(0,0,0,.6); animation: fc-cardin .3s cubic-bezier(.2,.8,.2,1); }
        @keyframes fc-cardin { from { opacity: 0; transform: translateY(20px) scale(.97); } to { opacity: 1; transform: none; } }
        .fc-statcity { position: absolute; left: 0; right: 0; bottom: 0; height: 62%; opacity: .38; }
        .fc-statcard-ny .fc-statbg { position: absolute; inset: 0; background: radial-gradient(120% 90% at 28% 8%, rgba(29,66,138,.5), rgba(245,132,38,.12) 45%, transparent 72%); }
        .fc-statcard-sa .fc-statbg { position: absolute; inset: 0; background: radial-gradient(120% 90% at 28% 8%, rgba(196,206,212,.4), rgba(120,134,148,.12) 45%, transparent 72%); }
        .fc-statteam { position: absolute; top: 4px; left: 0; right: 0; text-align: center; font-size: clamp(40px,11vw,96px); font-weight: 900; letter-spacing: -.02em; color: rgba(255,255,255,.05); pointer-events: none; white-space: nowrap; overflow: hidden; }
        .fc-statclose { position: absolute; top: 12px; right: 12px; z-index: 5; width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.45); color: #fff; cursor: pointer; font-size: 14px; }
        .fc-statbody { position: relative; z-index: 2; display: grid; grid-template-columns: 40% 1fr; gap: 14px; padding: 24px 22px 22px; align-items: end; }
        .fc-statleft { position: relative; }
        .fc-statlogo { position: absolute; top: -8px; left: -4px; width: 42px; height: 42px; object-fit: contain; opacity: .92; z-index: 2; }
        .fc-statimg { width: 100%; display: block; }
        .fc-statcard-ny .fc-statimg { filter: drop-shadow(0 0 24px rgba(29,66,138,.85)) drop-shadow(0 8px 16px rgba(0,0,0,.6)); }
        .fc-statcard-sa .fc-statimg { filter: drop-shadow(0 0 24px rgba(196,206,212,.6)) drop-shadow(0 8px 16px rgba(0,0,0,.6)); }
        .fc-statright { padding-bottom: 4px; }
        .fc-statname { font-size: clamp(20px,3.4vw,30px); font-weight: 900; line-height: 1.05; }
        .fc-statmeta { font-size: 11px; color: #9aa6b2; margin: 4px 0 14px; }
        .fc-statheadline { display: flex; gap: 16px; margin-bottom: 14px; }
        .fc-stathl { text-align: center; }
        .fc-stathl b { display: block; font-size: clamp(24px,4.4vw,40px); font-weight: 900; color: #f5d76e; line-height: 1; text-shadow: 0 0 14px rgba(245,200,90,.4); }
        .fc-stathl i { font-size: 9px; letter-spacing: .15em; color: #8a939e; font-style: normal; }
        .fc-statgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 14px; }
        .fc-statcell { display: flex; justify-content: space-between; gap: 6px; border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 3px; font-size: 12px; }
        .fc-statcell span { color: #8a939e; } .fc-statcell b { font-weight: 800; }
        .fc-statseason { margin-top: 14px; font-size: 9px; letter-spacing: .15em; color: #6b7682; }
        .fc-statloading { color: #8a939e; font-size: 13px; padding: 14px 0; }
        @media (max-width: 480px) { .fc-statbody { grid-template-columns: 1fr; align-items: start; } .fc-statleft { max-width: 54%; margin: 0 auto; } .fc-statgrid { grid-template-columns: repeat(2,1fr); } }

        @media (min-width: 740px) { .fc-roster { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) {
          .fc-mote:nth-child(2n), .fc-flash:nth-child(2n), .fc-win:nth-child(2n) { display: none; }
          /* keep only 3 players/side on mobile (anchor + 2 mid), drop the back tier */
          .fc-tier-2 { display: none; }
          .fc-wp { width: clamp(140px, 40vw, 200px); }
          .fc-anchor { width: clamp(200px, 62vw, 320px); }
          .fc-core { max-width: 100%; transform: translateZ(60px); }
          .fc-sl { width: 30vw; } .fc-cd-clock { gap: 8px; } .fc-cd-cell { min-width: 50px; }
          .fc-wm { width: 50vw; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fc-stars,.fc-flash,.fc-mote,.fc-sl,.fc-win,.fc-seam,.fc-halo,.fc-title,.fc-vs,.fc-vs-glint,.fc-neon-ny,.fc-neon-sa,.fc-tape-row,.fc-eyebrow .fc-po,.fc-flip,.fc-tips,.fc-cta-ticket,.fc-shine,.fc-scrollhint,.fc-live,.fc-game-tonight,.fc-godray,.fc-wp-enter,.fc-twinkle { animation: none !important; }
          .fc-flash,.fc-mote,.fc-shine { opacity: 0 !important; }
          .fc-tape-row,.fc-eyebrow .fc-po { opacity: 1 !important; transform: none !important; }
          .fc-wp { transform: translate3d(0,0,var(--z)) scale(var(--s)) !important; }
          .fc-wp-sa .fc-wp-img { transform: scaleX(-1) !important; }
          .fc-title { background-position: 50% 0 !important; } .fc-halo { opacity: .7 !important; }
        }
      `}</style>
    </div>
  )
}
