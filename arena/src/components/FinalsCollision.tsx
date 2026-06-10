import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  fetchFinals,
  fetchFinalsRosters,
  fetchSeries,
  nbaHeadshot,
  type FinalsData,
  type FinalsPlayer,
  type SeriesGame,
} from '@/lib/nbaFinals'
import { HighlightsStrip } from './HighlightsStrip'

/**
 * FinalsCollision — the 2026 NBA Finals takeover landing, Vegas/Hollywood
 * spectacle (Sphere-meets-title-fight-broadcast). New York (Gotham blue) vs
 * San Antonio (silver steel): two universes colliding, marquee Brunson-vs-Wemby
 * tale-of-the-tape at the core. Everything CSS-driven, 60fps, fully
 * prefers-reduced-motion gated. Fans never leave the arena.
 *
 * Transform discipline (so parallax never stomps a flip/intro): every element
 * owns at most ONE transform. `.fc-fighter` = parallax (inline), `.fc-fighter-
 * intro` = scale-in intro, `<img>` = the scaleX(-1) flip.
 *
 * Styles are `<style jsx global>` (fc-* prefixed, collision-safe) so they reach
 * the sub-components too — scoped styled-jsx silently drops styles on children.
 */

const BRUNSON = { id: '3934672', first: 'BRUNSON', num: '11', pos: 'PG', ht: "6'2\"", wt: '190', age: '29' }
const WEMBY = { id: '5104157', first: 'WEMBY', num: '1', pos: 'C', ht: "7'4\"", wt: '235', age: '22' }

// Deterministic (no Math.random → no hydration drift). [left%, dur, delay]
const DUST: [number, number, number][] = [
  [5, 13, 0], [12, 16, 4], [19, 11, 7], [27, 18, 2], [34, 14, 9], [41, 12, 5],
  [48, 17, 1], [55, 13, 6], [62, 15, 3], [69, 11, 8], [76, 16, 2], [83, 14, 5],
  [90, 12, 7], [96, 18, 0], [9, 15, 10], [44, 13, 11], [58, 16, 9], [88, 12, 4],
]
// camera flashes [left%, top%, dur, delay]
const FLASH: [number, number, number, number][] = [
  [8, 34, 6, 0], [16, 58, 7, 2.5], [24, 28, 5, 4], [33, 64, 8, 1], [76, 30, 6, 3.5],
  [84, 60, 7, 0.8], [91, 40, 5, 5], [69, 54, 8, 2], [13, 70, 6, 6], [88, 24, 7, 4.5],
  [40, 72, 6, 3], [60, 26, 7, 5.5],
]
// skyline window lights [left%, top%, delay] within each side's bottom band
const WIN_NY: [number, number, number][] = [
  [10, 62, 0], [16, 50, 2], [22, 70, 4], [29, 44, 1], [35, 66, 3], [41, 56, 5], [12, 78, 6], [31, 80, 2.5], [38, 72, 4.5], [7, 68, 3.5],
]
const WIN_SA: [number, number, number][] = [
  [62, 64, 1], [68, 52, 3], [74, 72, 0], [80, 46, 4], [86, 68, 2], [92, 58, 5], [70, 80, 3.5], [84, 78, 1.5], [90, 74, 4.5], [65, 70, 5.5],
]

function useCountdown(targetIso?: string) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  // SSR / first paint → null so the static fallback renders (no hydration drift).
  if (!targetIso || now == null) return null
  const diff = new Date(targetIso).getTime() - now
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true }
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    done: false,
  }
}

function useParallax() {
  const [p, setP] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setP({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 }))
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])
  return p
}

function PowerOn({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={i} className="fc-po" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  )
}

function GothamSkyline() {
  return (
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="fc-skyline fc-skyline-ny" aria-hidden>
      <defs>
        <linearGradient id="ny-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d428a" stopOpacity="0" /><stop offset="100%" stopColor="#070e1c" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path fill="url(#ny-sky)" d="M0,220 L0,120 L24,120 L24,90 L44,90 L44,150 L70,150 L70,70 L82,70 L82,40 L92,40 L92,70 L104,70 L104,150 L130,150 L130,100 L150,100 L150,160 L176,160 L176,60 L186,60 L186,20 L196,20 L196,60 L208,60 L208,130 L236,130 L236,95 L256,95 L256,150 L286,150 L286,80 L300,80 L300,150 L330,150 L330,110 L352,110 L352,150 L380,150 L380,64 L392,64 L392,150 L420,150 L420,98 L446,98 L446,150 L478,150 L478,120 L500,120 L500,150 L536,150 L536,110 L560,110 L560,135 L600,135 L600,220 Z" />
    </svg>
  )
}
function SilverSkyline() {
  return (
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="fc-skyline fc-skyline-sa" aria-hidden>
      <defs>
        <linearGradient id="sa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4ced4" stopOpacity="0" /><stop offset="100%" stopColor="#0c1014" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path fill="url(#sa-sky)" d="M0,220 L0,150 L40,150 L40,120 L64,120 L64,150 L96,150 L96,100 L120,100 L120,150 L150,150 L150,128 L172,128 L172,150 L210,150 L210,90 L226,90 L226,150 L262,150 L262,118 L284,118 L284,150 L300,150 L300,40 L308,40 L308,16 L316,16 L316,40 L324,40 L324,150 L356,150 L356,86 L376,86 L376,150 L410,150 L410,110 L432,110 L432,150 L470,150 L470,70 L482,70 L482,150 L516,150 L516,120 L540,120 L540,150 L576,150 L576,128 L600,128 L600,220 Z" />
    </svg>
  )
}

function TapeRow({ label, ny, sa, i }: { label: string; ny: string; sa: string; i: number }) {
  return (
    <div className={`fc-tape-row ${i % 2 ? 'fc-from-right' : 'fc-from-left'}`} style={{ animationDelay: `${0.6 + i * 0.14}s` }}>
      <span className="fc-tape-ny">{ny}</span>
      <span className="fc-tape-lbl">{label}</span>
      <span className="fc-tape-sa">{sa}</span>
    </div>
  )
}

export function FinalsCollision() {
  const [data, setData] = useState<FinalsData | null>(null)
  const [rosters, setRosters] = useState<{ home: FinalsPlayer[]; away: FinalsPlayer[] }>({ home: [], away: [] })
  const [series, setSeries] = useState<SeriesGame[]>([])
  const didInit = useRef(false)
  const parallax = useParallax()

  useEffect(() => {
    let alive = true
    const load = async () => {
      const d = await fetchFinals().catch(() => null)
      if (!alive || !d) return
      setData(d)
      if (!didInit.current) {
        didInit.current = true
        fetchFinalsRosters(d.home.id, d.away.id, 5).then((r) => alive && setRosters(r))
        fetchSeries(d.game.id).then((s) => alive && setSeries(s))
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const cd = useCountdown(data?.game.date)
  const ny = data ? (data.home.abbr === 'NY' ? data.home : data.away.abbr === 'NY' ? data.away : data.home) : null
  const sa = data ? (data.home.abbr === 'SA' ? data.home : data.away.abbr === 'SA' ? data.away : data.away) : null
  const nySide = data ? (data.game.home.teamId === ny?.id ? data.game.home : data.game.away) : null
  const saSide = data ? (data.game.home.teamId === sa?.id ? data.game.home : data.game.away) : null
  const state = data?.game.state ?? 'pre'
  const px = parallax.x, py = parallax.y
  const nyCutouts = rosters.home.length && ny && rosters.home[0]?.teamId === ny.id ? rosters.home : rosters.away
  const saCutouts = rosters.home.length && sa && rosters.home[0]?.teamId === sa.id ? rosters.home : rosters.away

  return (
    <div className="fc-root">
      <section className="fc-hero">
        {/* deep split cosmos */}
        <div className="fc-cosmos">
          <div className="fc-split-ny" style={{ transform: `translate3d(${px * -14}px, ${py * -8}px, 0)` }} />
          <div className="fc-split-sa" style={{ transform: `translate3d(${px * 14}px, ${py * -8}px, 0)` }} />
          <div className="fc-stars" />
          {/* paparazzi flashes */}
          <div className="fc-flashes">{FLASH.map(([l, t, d, dl], i) => (
            <span key={i} className="fc-flash" style={{ left: `${l}%`, top: `${t}%`, animationDuration: `${d}s`, animationDelay: `${dl}s` }} />
          ))}</div>
          {/* golden dust */}
          <div className="fc-dust">{DUST.map(([l, d, dl], i) => (
            <span key={i} className="fc-mote" style={{ left: `${l}%`, animationDuration: `${d}s`, animationDelay: `${dl}s` }} />
          ))}</div>
        </div>

        {/* crossing searchlights behind the title */}
        <div className="fc-searchlights">
          <span className="fc-sl fc-sl-1" /><span className="fc-sl fc-sl-2" />
        </div>

        {/* colliding skylines + window lights */}
        <div className="fc-skylines">
          <div className="fc-skyline-wrap fc-left" style={{ transform: `translateX(${px * 7}px)` }}>
            <GothamSkyline />
            {WIN_NY.map(([l, t, dl], i) => <span key={i} className="fc-win fc-win-ny" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${dl}s` }} />)}
          </div>
          <div className="fc-skyline-wrap fc-right" style={{ transform: `translateX(${px * -7}px)` }}>
            <SilverSkyline />
            {WIN_SA.map(([l, t, dl], i) => <span key={i} className="fc-win fc-win-sa" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${dl}s` }} />)}
          </div>
          <div className="fc-seam" />
        </div>

        {/* ── center core ── */}
        <div className="fc-core">
          <div className="fc-kicker"><span className="fc-dot" /> <span className="fc-eyebrow"><PowerOn text="NBA FINALS · 2026" /></span>{state === 'in' && <span className="fc-live">● LIVE</span>}</div>
          <div className="fc-titlewrap">
            <span className="fc-halo" aria-hidden />
            <h1 className="fc-title">THE&nbsp;FINALS</h1>
          </div>

          {/* tale of the tape — Brunson vs Wemby */}
          <div className="fc-faceoff">
            <div className="fc-fighter fc-fighter-ny" style={{ transform: `translate3d(${px * 9}px, ${py * 5}px, 0)` }}>
              <span className="fc-spot fc-spot-ny" aria-hidden />
              <div className="fc-fighter-intro fc-intro-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={nbaHeadshot(BRUNSON.id)} alt="Jalen Brunson" className="fc-fighter-img" />
              </div>
              <span className="fc-floor fc-floor-ny" aria-hidden />
              <div className="fc-fighter-name fc-neon-ny">{BRUNSON.first}</div>
              <div className="fc-fighter-num">#{BRUNSON.num} · NEW YORK</div>
            </div>

            <div className="fc-vs-col">
              <div className="fc-vs"><span className="fc-vs-glint" aria-hidden />VS</div>
              <div className="fc-tape">
                <TapeRow label="POS" ny={BRUNSON.pos} sa={WEMBY.pos} i={0} />
                <TapeRow label="HT" ny={BRUNSON.ht} sa={WEMBY.ht} i={1} />
                <TapeRow label="WT" ny={BRUNSON.wt} sa={WEMBY.wt} i={2} />
                <TapeRow label="AGE" ny={BRUNSON.age} sa={WEMBY.age} i={3} />
              </div>
            </div>

            <div className="fc-fighter fc-fighter-sa" style={{ transform: `translate3d(${px * -9}px, ${py * 5}px, 0)` }}>
              <span className="fc-spot fc-spot-sa" aria-hidden />
              <div className="fc-fighter-intro fc-intro-right">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={nbaHeadshot(WEMBY.id)} alt="Victor Wembanyama" className="fc-fighter-img" />
              </div>
              <span className="fc-floor fc-floor-sa" aria-hidden />
              <div className="fc-fighter-name fc-neon-sa">{WEMBY.first}</div>
              <div className="fc-fighter-num">#{WEMBY.num} · SAN ANTONIO</div>
            </div>
          </div>

          {/* live state / countdown */}
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
            ) : (
              <div className="fc-cd-lbl">GAME 4 · NEW YORK · TONIGHT</div>
            )}
            {data?.game.seriesSummary && <div className="fc-series-sum">{data.game.seriesSummary.toUpperCase()}</div>}
          </div>

          <div className="fc-cta-row">
            <a href="#fanzone" className="fc-cta fc-cta-ticket"><span className="fc-shine" aria-hidden />ENTER THE FAN ZONE</a>
            <a href="#bracket" className="fc-cta fc-cta-metal">SERIES &amp; HIGHLIGHTS</a>
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
                {done || live ? (
                  <div className="fc-game-score"><span>{g.awayAbbr} {g.awayScore}</span><span className="fc-game-at">@</span><span>{g.homeAbbr} {g.homeScore}</span></div>
                ) : (<div className="fc-game-score fc-game-upcoming">{live ? 'LIVE' : 'UPCOMING'}</div>)}
                {g.winnerAbbr && <div className="fc-game-win">{g.winnerAbbr} WIN</div>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ════ COMBATANTS (boosted) ════ */}
      {(nyCutouts.length > 0 || saCutouts.length > 0) && (
        <section className="fc-sec">
          <h2 className="fc-h2">THE COMBATANTS</h2>
          <div className="fc-roster">
            {[{ team: ny, players: nyCutouts, side: 'ny' as const }, { team: sa, players: saCutouts, side: 'sa' as const }].map(({ team, players, side }) => (
              <div key={side} className={`fc-roster-team fc-roster-${side}`}>
                <div className="fc-roster-head">
                  {team?.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logo} alt="" className="fc-roster-logo" />
                  )}
                  <span className="fc-roster-tag">{side === 'ny' ? 'NEW YORK' : 'SAN ANTONIO'}</span>
                </div>
                <div className="fc-roster-rail">
                  {players.map((p) => (
                    <div key={p.id} className={`fc-card fc-card-${side}`}>
                      <div className="fc-card-glow" aria-hidden />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.headshot} alt={p.name} className="fc-card-img" loading="lazy" />
                      <div className="fc-card-name">{p.name}</div>
                      <div className="fc-card-meta">#{p.jersey} · {p.pos}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════ HIGHLIGHTS ════ */}
      <section className="fc-sec">
        <h2 className="fc-h2">FILM ROOM · HIGHLIGHTS</h2>
        <HighlightsStrip sport={'nba' as any} limit={12} />
      </section>

      {/* ════ FAN ZONE ════ */}
      <section id="fanzone" className="fc-sec fc-fanzone">
        <h2 className="fc-h2">THE FAN ZONE · GOTHAM ROARS</h2>
        <p className="fc-fan-copy">Game 4 in New York. Drop your reactions, the post-game mob footage, talk your trash — live with every fan in the building, right here, no leaving the arena.</p>
        <div className="fc-fan-cta-row">
          <Link href="/" className="fc-cta fc-cta-ticket"><span className="fc-shine" aria-hidden />🔥 LIVE FAN TAKES</Link>
          <Link href="/picks" className="fc-cta fc-cta-metal">🎯 MAKE YOUR GAME-4 CALL</Link>
        </div>
      </section>

      <style jsx global>{`
        .fc-root { background: #04060c; color: #fff; }
        .fc-hero { position: relative; min-height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; perspective: 1300px; isolation: isolate; }

        /* deep split cosmos */
        .fc-cosmos { position: absolute; inset: 0; z-index: 0; }
        .fc-split-ny, .fc-split-sa { position: absolute; inset: -12%; will-change: transform; }
        .fc-split-ny { background: radial-gradient(62% 80% at 20% 46%, rgba(29,66,138,0.62), rgba(245,132,38,0.16) 38%, transparent 66%); }
        .fc-split-sa { background: radial-gradient(62% 80% at 80% 46%, rgba(196,206,212,0.34), rgba(120,134,148,0.12) 38%, transparent 66%); }
        .fc-stars { position: absolute; inset: 0; opacity: 0.5;
          background-image: radial-gradient(1px 1px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 62%,#cfe0ff,transparent),radial-gradient(1px 1px at 47% 28%,#fff,transparent),radial-gradient(1.4px 1.4px at 63% 71%,#fff,transparent),radial-gradient(1px 1px at 78% 22%,#e8eef5,transparent),radial-gradient(1px 1px at 88% 58%,#fff,transparent),radial-gradient(1px 1px at 38% 84%,#fff,transparent),radial-gradient(1.4px 1.4px at 8% 78%,#fff,transparent);
          animation: fc-twinkle 5s ease-in-out infinite alternate; }
        @keyframes fc-twinkle { from { opacity: .32; } to { opacity: .66; } }

        /* paparazzi camera flashes */
        .fc-flashes, .fc-dust { position: absolute; inset: 0; pointer-events: none; }
        .fc-flash { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fff; opacity: 0; box-shadow: 0 0 10px 3px rgba(255,255,255,0.9); animation: fc-flash 6s ease-in-out infinite; }
        @keyframes fc-flash { 0%,92%,100% { opacity: 0; transform: scale(.4); } 94% { opacity: 1; transform: scale(1.3); } 96% { opacity: .2; } }

        /* golden dust rising */
        .fc-mote { position: absolute; bottom: -6%; width: 3px; height: 3px; border-radius: 50%; background: radial-gradient(#ffe9a8, rgba(245,200,90,0.2)); box-shadow: 0 0 6px 1px rgba(245,200,90,0.5); opacity: 0; animation: fc-rise linear infinite; }
        @keyframes fc-rise { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: .9; } 88% { opacity: .7; } 100% { transform: translateY(-108vh); opacity: 0; } }

        /* crossing searchlights */
        .fc-searchlights { position: absolute; inset: 0; z-index: 1; pointer-events: none; mix-blend-mode: screen; overflow: hidden; }
        .fc-sl { position: absolute; top: -40%; left: 50%; width: 16vw; height: 150%; transform-origin: top center; background: linear-gradient(to bottom, rgba(180,210,255,0.16), rgba(180,210,255,0.04) 50%, transparent 78%); filter: blur(6px); }
        .fc-sl-1 { animation: fc-sweepA 12s ease-in-out infinite alternate; }
        .fc-sl-2 { background: linear-gradient(to bottom, rgba(255,224,160,0.14), rgba(255,224,160,0.04) 50%, transparent 78%); animation: fc-sweepB 14s ease-in-out infinite alternate; }
        @keyframes fc-sweepA { from { transform: translateX(-50%) rotate(-26deg); } to { transform: translateX(-50%) rotate(20deg); } }
        @keyframes fc-sweepB { from { transform: translateX(-50%) rotate(24deg); } to { transform: translateX(-50%) rotate(-22deg); } }

        /* skylines + windows + seam */
        .fc-skylines { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; z-index: 1; display: flex; }
        .fc-skyline-wrap { position: relative; width: 56%; height: 100%; will-change: transform; }
        .fc-skyline-wrap.fc-right { margin-left: auto; }
        .fc-skyline { width: 100%; height: 100%; display: block; }
        .fc-skyline-ny { filter: drop-shadow(0 0 20px rgba(29,66,138,0.7)); transform: skewX(6deg); transform-origin: bottom right; }
        .fc-skyline-sa { filter: drop-shadow(0 0 20px rgba(196,206,212,0.5)); transform: skewX(-6deg); transform-origin: bottom left; }
        .fc-win { position: absolute; width: 2px; height: 2px; border-radius: 1px; opacity: 0; animation: fc-winblink 4s ease-in-out infinite; }
        .fc-win-ny { background: #ffd27a; box-shadow: 0 0 5px 1px rgba(255,210,122,0.8); }
        .fc-win-sa { background: #dfe8f0; box-shadow: 0 0 5px 1px rgba(223,232,240,0.7); }
        @keyframes fc-winblink { 0%,100% { opacity: .15; } 50% { opacity: .95; } }
        .fc-seam { position: absolute; top: -150%; bottom: 0; left: 50%; width: 3px; transform: translateX(-50%); background: linear-gradient(to bottom, transparent, #bcd8ff 16%, #fff 50%, #e6ecf2 84%, transparent); box-shadow: 0 0 26px 7px rgba(150,195,255,0.5), 0 0 70px 22px rgba(196,206,212,0.25); animation: fc-seampulse 3s ease-in-out infinite; }
        @keyframes fc-seampulse { 0%,100% { opacity: .72; } 50% { opacity: 1; } }

        /* ── core ── */
        .fc-core { position: relative; z-index: 5; text-align: center; padding: 4vh 16px; max-width: 1040px; }
        .fc-kicker { font-size: 10px; letter-spacing: 0.3em; font-weight: 800; color: #cdd7e2; margin-bottom: 12px; display: inline-flex; align-items: center; gap: 9px; }
        .fc-dot { width: 7px; height: 7px; border-radius: 2px; background: #f58426; box-shadow: 0 0 12px #f58426; }
        .fc-eyebrow .fc-po { display: inline-block; opacity: 0; animation: fc-poweron .5s ease forwards; }
        @keyframes fc-poweron { from { opacity: 0; filter: blur(3px); } to { opacity: 1; filter: blur(0); } }
        .fc-live { color: #ff3b3b; animation: fc-blink 1.1s steps(2) infinite; }
        @keyframes fc-blink { 50% { opacity: .3; } }

        /* marquee title */
        .fc-titlewrap { position: relative; display: inline-block; }
        .fc-halo { position: absolute; left: 50%; top: 52%; width: 120%; height: 200%; transform: translate(-50%,-50%); background: radial-gradient(closest-side, rgba(255,224,150,0.30), rgba(255,200,90,0.10) 50%, transparent 72%); filter: blur(6px); animation: fc-halo 5s ease-in-out infinite; z-index: -1; }
        @keyframes fc-halo { 0%,100% { opacity: .55; transform: translate(-50%,-50%) scale(.96); } 50% { opacity: .9; transform: translate(-50%,-50%) scale(1.04); } }
        .fc-title { font-size: clamp(42px,9vw,124px); font-weight: 900; line-height: .9; letter-spacing: -0.025em; margin: 0; text-transform: uppercase;
          background: linear-gradient(100deg,#9a6b1c 0%,#f4d36a 18%,#fff7df 32%,#f4d36a 46%,#c9972f 60%,#f4d36a 76%,#fff7df 90%,#9a6b1c 100%);
          background-size: 260% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 3px 26px rgba(255,210,120,0.35)); animation: fc-goldsweep 6s linear infinite; }
        @keyframes fc-goldsweep { 0% { background-position: 210% 0; } 100% { background-position: -60% 0; } }

        /* face-off */
        .fc-faceoff { display: flex; align-items: flex-end; justify-content: center; gap: clamp(2px,1.6vw,22px); margin: 2.6vh 0 1vh; }
        .fc-fighter { position: relative; width: clamp(118px,22vw,264px); will-change: transform; }
        .fc-spot { position: absolute; left: 50%; top: -34%; width: 150%; height: 120%; transform: translateX(-50%); pointer-events: none; z-index: 0; }
        .fc-spot-ny { background: radial-gradient(50% 60% at 50% 0%, rgba(120,165,255,0.28), transparent 70%); }
        .fc-spot-sa { background: radial-gradient(50% 60% at 50% 0%, rgba(220,228,236,0.26), transparent 70%); }
        .fc-floor { position: absolute; left: 50%; bottom: 30px; width: 130%; height: 40px; transform: translateX(-50%); border-radius: 50%; filter: blur(8px); z-index: 0; }
        .fc-floor-ny { background: radial-gradient(closest-side, rgba(29,66,138,0.6), transparent 75%); }
        .fc-floor-sa { background: radial-gradient(closest-side, rgba(196,206,212,0.45), transparent 75%); }
        .fc-fighter-intro { position: relative; z-index: 1; transform: scale(.95); opacity: 0; }
        .fc-intro-left { animation: fc-introIn .8s cubic-bezier(.2,.8,.2,1) .35s forwards; }
        .fc-intro-right { animation: fc-introIn .8s cubic-bezier(.2,.8,.2,1) .55s forwards; }
        @keyframes fc-introIn { from { opacity: 0; transform: scale(.95); } 60% { opacity: 1; } to { opacity: 1; transform: scale(1); } }
        .fc-fighter-img { width: 100%; display: block; }
        .fc-fighter-ny .fc-fighter-img { filter: drop-shadow(0 0 30px rgba(29,66,138,0.95)) drop-shadow(0 6px 10px rgba(0,0,0,.6)); }
        .fc-fighter-sa .fc-fighter-img { transform: scaleX(-1); filter: drop-shadow(0 0 30px rgba(196,206,212,0.85)) drop-shadow(0 6px 10px rgba(0,0,0,.6)); }
        .fc-fighter-name { position: relative; z-index: 2; font-weight: 900; font-size: clamp(15px,2.4vw,30px); letter-spacing: .04em; margin-top: -6px; }
        .fc-neon-ny { color: #8fb6ff; text-shadow: 0 0 8px rgba(120,165,255,.9), 0 0 18px rgba(29,66,138,.8), 0 0 30px rgba(245,132,38,.4); animation: fc-flickerN 1.4s steps(1) 1; }
        .fc-neon-sa { color: #eef3f8; text-shadow: 0 0 8px rgba(223,232,240,.9), 0 0 18px rgba(196,206,212,.7); animation: fc-flickerN 1.4s steps(1) 1; }
        @keyframes fc-flickerN { 0%,100% { opacity: 1; } 8% { opacity: .3; } 12% { opacity: 1; } 20% { opacity: .5; } 24% { opacity: 1; } 70% { opacity: .8; } 74% { opacity: 1; } }
        .fc-fighter-num { position: relative; z-index: 2; font-size: 9px; letter-spacing: .25em; color: #9aa6b2; font-weight: 700; }

        /* VS + tape */
        .fc-vs-col { display: flex; flex-direction: column; align-items: center; padding-bottom: 16px; }
        .fc-vs { position: relative; font-weight: 900; font-size: clamp(24px,4.4vw,58px); font-style: italic; transform-style: preserve-3d;
          background: linear-gradient(160deg,#fff7df,#f4d36a 40%,#9a6b1c 70%,#f4d36a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 14px rgba(245,200,90,.6)); animation: fc-vstilt 8s ease-in-out infinite; }
        @keyframes fc-vstilt { 0%,100% { transform: rotateY(-10deg) rotateX(3deg); } 50% { transform: rotateY(10deg) rotateX(-3deg); } }
        .fc-vs-glint { position: absolute; left: 50%; top: 50%; width: 160%; height: 160%; transform: translate(-50%,-50%); background: radial-gradient(closest-side, rgba(255,255,255,.85), transparent 60%); opacity: 0; pointer-events: none; animation: fc-glint 6s ease-in-out infinite; }
        @keyframes fc-glint { 0%,84%,100% { opacity: 0; } 90% { opacity: .9; transform: translate(-30%,-60%) scale(.5); } 96% { opacity: 0; transform: translate(20%,-40%) scale(1.4); } }
        .fc-tape { margin-top: 8px; width: clamp(160px,24vw,250px); }
        .fc-tape-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 5px 0; border-top: 1px solid; border-image: linear-gradient(90deg, transparent, rgba(245,200,90,.55), transparent) 1; font-size: clamp(11px,1.5vw,14px); opacity: 0; }
        .fc-from-left { animation: fc-inL .6s ease forwards; }
        .fc-from-right { animation: fc-inR .6s ease forwards; }
        @keyframes fc-inL { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fc-inR { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
        .fc-tape-ny { text-align: right; color: #fff; font-weight: 800; }
        .fc-tape-sa { text-align: left; color: #fff; font-weight: 800; }
        .fc-tape-lbl { font-size: 8px; letter-spacing: .2em; color: #8a939e; font-weight: 700; text-transform: uppercase; }

        /* state */
        .fc-state { margin: 1.6vh 0; }
        .fc-score { display: inline-flex; align-items: center; gap: 18px; font-weight: 900; }
        .fc-score-ny { font-size: clamp(34px,6vw,68px); color: #8fb6ff; text-shadow: 0 0 20px rgba(29,66,138,.8); }
        .fc-score-sa { font-size: clamp(34px,6vw,68px); color: #eef3f8; text-shadow: 0 0 20px rgba(196,206,212,.7); }
        .fc-score-mid { font-size: 12px; letter-spacing: .2em; color: #ff5a3c; font-weight: 800; }
        .fc-cd-lbl { font-size: clamp(11px,1.6vw,14px); letter-spacing: .28em; font-weight: 800; color: #e7d9b0; }
        .fc-tips { animation: fc-tipspulse 1s ease-in-out infinite; }
        @keyframes fc-tipspulse { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
        .fc-cd-clock { display: inline-flex; gap: 12px; margin-top: 12px; perspective: 500px; }
        .fc-cd-cell { position: relative; display: flex; flex-direction: column; align-items: center; min-width: 58px; padding: 10px 8px; border-radius: 7px; border: 1px solid rgba(245,210,120,.55); background: linear-gradient(180deg, rgba(30,24,8,.7), rgba(10,12,20,.7)); box-shadow: inset 0 0 14px rgba(245,200,90,.18), 0 0 18px rgba(245,200,90,.12); }
        .fc-cd-cell::before, .fc-cd-cell::after { content: ''; position: absolute; left: 4px; right: 4px; height: 3px; background-image: radial-gradient(circle, rgba(255,225,150,.95) 0 1.2px, transparent 1.4px); background-size: 9px 3px; background-repeat: repeat-x; opacity: .8; }
        .fc-cd-cell::before { top: 3px; } .fc-cd-cell::after { bottom: 3px; }
        .fc-cd-cell b { font-size: clamp(22px,3.2vw,36px); font-weight: 900; line-height: 1; color: #ffe9b0; text-shadow: 0 0 10px rgba(245,200,90,.5); }
        .fc-cd-cell i { font-size: 8px; letter-spacing: .2em; color: #8a7c52; font-style: normal; margin-top: 5px; }
        .fc-flip { display: inline-block; animation: fc-cardflip .45s ease; transform-origin: center; }
        @keyframes fc-cardflip { from { transform: rotateX(-90deg); opacity: .2; } to { transform: rotateX(0); opacity: 1; } }
        .fc-series-sum { margin-top: 13px; font-size: 12px; letter-spacing: .26em; font-weight: 800; color: #f58426; }

        /* CTAs */
        .fc-cta-row, .fc-fan-cta-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 2.4vh; }
        .fc-cta { position: relative; overflow: hidden; font-size: 12px; font-weight: 800; letter-spacing: .12em; padding: 12px 22px; border-radius: 999px; color: #fff; text-decoration: none; transition: transform .15s, box-shadow .25s, border-color .25s; }
        .fc-cta-ticket { background: linear-gradient(90deg,#b8860b,#f5b942,#f58426,#f5b942,#b8860b); background-size: 220% 100%; border: 1px solid rgba(255,220,140,.5); box-shadow: 0 0 18px rgba(245,160,40,.35); animation: fc-ticketgrad 7s linear infinite, fc-breathe 4s ease-in-out infinite; }
        @keyframes fc-ticketgrad { to { background-position: 220% 0; } }
        @keyframes fc-breathe { 0%,100% { box-shadow: 0 0 16px rgba(245,160,40,.3); } 50% { box-shadow: 0 0 30px rgba(245,160,40,.55); } }
        .fc-cta-ticket:hover { transform: scale(1.04); }
        .fc-shine { position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(105deg, transparent, rgba(255,255,255,.55), transparent); animation: fc-shine 8s ease-in-out infinite; }
        @keyframes fc-shine { 0%,72%,100% { left: -60%; } 84% { left: 130%; } }
        .fc-cta-metal { background: linear-gradient(180deg, rgba(60,66,74,.5), rgba(20,24,30,.5)); border: 1px solid; border-image: linear-gradient(180deg, rgba(220,228,236,.7), rgba(120,130,140,.4)) 1; }
        .fc-cta-metal:hover { box-shadow: 0 0 22px rgba(200,214,228,.4); border-color: #cdd9e6; color: #eef3f8; }
        .fc-scrollhint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); z-index: 5; font-size: 9px; letter-spacing: .3em; color: #5b6672; animation: fc-bob 2s ease-in-out infinite; }
        @keyframes fc-bob { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,5px); } }

        /* sections */
        .fc-sec { max-width: 1100px; margin: 0 auto; padding: 44px 16px; }
        .fc-h2 { font-size: clamp(16px,2.4vw,24px); font-weight: 900; letter-spacing: .16em; text-align: center; margin: 0 0 22px;
          background: linear-gradient(90deg,#8fb6ff,#fff,#c4ced4); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .fc-bracket { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        .fc-game { border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 12px; background: rgba(255,255,255,.02); text-align: center; }
        .fc-game-tonight { border-color: #f58426; box-shadow: 0 0 0 1px rgba(245,132,38,.4), 0 0 24px rgba(245,132,38,.15); animation: fc-tonight 3s ease-in-out infinite; }
        @keyframes fc-tonight { 0%,100% { box-shadow: 0 0 0 1px rgba(245,132,38,.35), 0 0 18px rgba(245,132,38,.12); } 50% { box-shadow: 0 0 0 1px rgba(245,132,38,.6), 0 0 30px rgba(245,132,38,.25); } }
        .fc-game-live { border-color: #ff3b3b; }
        .fc-game-no { font-size: 9px; letter-spacing: .18em; color: #8a96a2; font-weight: 800; margin-bottom: 8px; }
        .fc-game-score { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; font-size: 14px; }
        .fc-game-at { color: #5b6672; font-size: 10px; }
        .fc-game-upcoming { color: #6b7682; font-size: 11px; letter-spacing: .15em; }
        .fc-game-win { margin-top: 6px; font-size: 9px; letter-spacing: .15em; color: #f58426; font-weight: 800; }

        /* combatants (boosted) */
        .fc-roster { display: grid; grid-template-columns: 1fr; gap: 18px; }
        .fc-roster-team { padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,.07); }
        .fc-roster-ny { background: linear-gradient(135deg, rgba(29,66,138,.22), rgba(245,132,38,.05) 60%, transparent); }
        .fc-roster-sa { background: linear-gradient(135deg, rgba(196,206,212,.16), transparent 60%); }
        .fc-roster-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .fc-roster-logo { width: 30px; height: 30px; object-fit: contain; }
        .fc-roster-tag { font-size: 12px; letter-spacing: .25em; font-weight: 900; }
        .fc-roster-ny .fc-roster-tag { color: #8fb6ff; }
        .fc-roster-sa .fc-roster-tag { color: #eef3f8; }
        .fc-roster-rail { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
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

        @media (min-width: 740px) { .fc-roster { grid-template-columns: 1fr 1fr; } }
        /* mobile 390 — halve the heavy bits, no jank */
        @media (max-width: 480px) {
          .fc-mote:nth-child(2n) { display: none; }
          .fc-flash:nth-child(2n) { display: none; }
          .fc-win:nth-child(2n) { display: none; }
          .fc-sl { width: 30vw; }
          .fc-cd-clock { gap: 8px; }
          .fc-cd-cell { min-width: 50px; }
        }
        /* full reduced-motion fallback — static gold/glow, zero animation */
        @media (prefers-reduced-motion: reduce) {
          .fc-stars, .fc-flash, .fc-mote, .fc-sl, .fc-win, .fc-seam, .fc-halo, .fc-title, .fc-vs, .fc-vs-glint,
          .fc-intro-left, .fc-intro-right, .fc-neon-ny, .fc-neon-sa, .fc-tape-row, .fc-eyebrow .fc-po, .fc-flip,
          .fc-tips, .fc-cta-ticket, .fc-shine, .fc-scrollhint, .fc-live, .fc-game-tonight { animation: none !important; }
          .fc-flash, .fc-mote, .fc-shine { opacity: 0 !important; }
          .fc-fighter-intro, .fc-tape-row, .fc-eyebrow .fc-po { opacity: 1 !important; transform: none !important; }
          .fc-fighter-sa .fc-fighter-img { transform: scaleX(-1) !important; }
          .fc-title { background-position: 50% 0 !important; }
          .fc-halo { opacity: .7 !important; }
        }
      `}</style>
    </div>
  )
}
