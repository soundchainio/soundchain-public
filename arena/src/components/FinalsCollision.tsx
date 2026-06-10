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
 * FinalsCollision — the 2026 NBA Finals takeover landing. New York (Gotham
 * blue) vs San Antonio (silver steel): two universes about to smash together.
 * Marquee face-off = Brunson vs Wembanyama, boxing tale-of-the-tape. Live
 * Game-4 core (countdown → live score → final), colliding skylines, parallax
 * player cutouts, series bracket, highlights, and the Fan Zone. Everything
 * inline — fans never leave arena. ESPN data, auto-refreshes during the game.
 */

// The marquee — Rocky vs Apollo. Tale-of-the-tape is static (the matchup is the
// matchup); everything else is live from ESPN.
const BRUNSON = { id: '3934672', name: 'Jalen Brunson', first: 'BRUNSON', num: '11', pos: 'PG', ht: "6'2\"", wt: '190', age: '29' }
const WEMBY = { id: '5104157', name: 'Victor Wembanyama', first: 'WEMBY', num: '1', pos: 'C', ht: "7'4\"", wt: '235', age: '22' }

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
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    done: false,
  }
}

// Mouse parallax — depth on desktop, off on touch / reduced-motion.
function useParallax() {
  const [p, setP] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduce) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setP({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 })
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])
  return p
}

function GothamSkyline() {
  // Brooding NYC silhouette — tall spires, the home of Game 4.
  return (
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="fc-skyline fc-skyline-ny" aria-hidden>
      <defs>
        <linearGradient id="ny-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d428a" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#0a1830" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path fill="url(#ny-sky)" d="M0,220 L0,120 L24,120 L24,90 L44,90 L44,150 L70,150 L70,70 L82,70 L82,40 L92,40 L92,70 L104,70 L104,150 L130,150 L130,100 L150,100 L150,160 L176,160 L176,60 L186,60 L186,20 L196,20 L196,60 L208,60 L208,130 L236,130 L236,95 L256,95 L256,150 L286,150 L286,80 L300,80 L300,150 L330,150 L330,110 L352,110 L352,150 L380,150 L380,64 L392,64 L392,150 L420,150 L420,98 L446,98 L446,150 L478,150 L478,120 L500,120 L500,150 L536,150 L536,110 L560,110 L560,135 L600,135 L600,220 Z" />
    </svg>
  )
}
function SilverSkyline() {
  // San Antonio — Tower of the Americas + a sleeker steel skyline.
  return (
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="fc-skyline fc-skyline-sa" aria-hidden>
      <defs>
        <linearGradient id="sa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4ced4" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#11151a" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path fill="url(#sa-sky)" d="M0,220 L0,150 L40,150 L40,120 L64,120 L64,150 L96,150 L96,100 L120,100 L120,150 L150,150 L150,128 L172,128 L172,150 L210,150 L210,90 L226,90 L226,150 L262,150 L262,118 L284,118 L284,150 L300,150 L300,40 L308,40 L308,16 L316,16 L316,40 L324,40 L324,150 L356,150 L356,86 L376,86 L376,150 L410,150 L410,110 L432,110 L432,150 L470,150 L470,70 L482,70 L482,150 L516,150 L516,120 L540,120 L540,150 L576,150 L576,128 L600,128 L600,220 Z" />
    </svg>
  )
}

function StatRow({ label, ny, sa }: { label: string; ny: string; sa: string }) {
  return (
    <div className="fc-tape-row">
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

  // Left = New York (Gotham), Right = San Antonio (Silver). Map by abbr, fall
  // back to home/away.
  const ny = data ? (data.home.abbr === 'NY' ? data.home : data.away.abbr === 'NY' ? data.away : data.home) : null
  const sa = data ? (data.home.abbr === 'SA' ? data.home : data.away.abbr === 'SA' ? data.away : data.away) : null
  const nySide = data ? (data.game.home.teamId === ny?.id ? data.game.home : data.game.away) : null
  const saSide = data ? (data.game.home.teamId === sa?.id ? data.game.home : data.game.away) : null

  const state = data?.game.state ?? 'pre'
  const px = parallax.x
  const py = parallax.y

  const nyCutouts = rosters.home.length && ny && rosters.home[0]?.teamId === ny.id ? rosters.home : rosters.away
  const saCutouts = rosters.home.length && sa && rosters.home[0]?.teamId === sa.id ? rosters.home : rosters.away

  return (
    <div className="fc-root">
      {/* ════════ HERO — THE COLLISION ════════ */}
      <section className="fc-hero">
        {/* dual cosmos */}
        <div className="fc-cosmos">
          <div className="fc-neb fc-neb-ny" style={{ transform: `translate3d(${px * -14}px, ${py * -10}px, 0)` }} />
          <div className="fc-neb fc-neb-sa" style={{ transform: `translate3d(${px * 14}px, ${py * -10}px, 0)` }} />
          <div className="fc-stars" />
          <div className="fc-seam" />
        </div>

        {/* Gotham searchlights */}
        <div className="fc-beam fc-beam-1" />
        <div className="fc-beam fc-beam-2" />

        {/* colliding skylines */}
        <div className="fc-skylines">
          <div className="fc-skyline-wrap fc-left" style={{ transform: `translateX(${px * 8}px)` }}>
            <GothamSkyline />
          </div>
          <div className="fc-skyline-wrap fc-right" style={{ transform: `translateX(${px * -8}px)` }}>
            <SilverSkyline />
          </div>
        </div>

        {/* floating supporting cutouts */}
        <div className="fc-floaters">
          {nyCutouts.slice(0, 3).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.headshot} alt="" className={`fc-floater fc-floater-ny fc-fl-${i}`}
              style={{ transform: `translate3d(${px * (18 + i * 6)}px, ${py * (10 + i * 4)}px, 0)` }} loading="lazy" />
          ))}
          {saCutouts.slice(0, 3).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.headshot} alt="" className={`fc-floater fc-floater-sa fc-fr-${i}`}
              style={{ transform: `translate3d(${px * -(18 + i * 6)}px, ${py * (10 + i * 4)}px, 0)` }} loading="lazy" />
          ))}
        </div>

        {/* ── center core ── */}
        <div className="fc-core">
          <div className="fc-kicker">
            <span className="fc-dot" /> NBA FINALS · 2026 {state === 'in' && <span className="fc-live">● LIVE</span>}
          </div>
          <h1 className="fc-title">THE&nbsp;FINALS</h1>

          {/* marquee face-off — Brunson vs Wemby */}
          <div className="fc-faceoff">
            <div className="fc-fighter fc-fighter-ny" style={{ transform: `translate3d(${px * 10}px, ${py * 6}px, 0)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={nbaHeadshot(BRUNSON.id)} alt={BRUNSON.name} className="fc-fighter-img" />
              <div className="fc-fighter-name">{BRUNSON.first}</div>
              <div className="fc-fighter-num">#{BRUNSON.num} · NEW YORK</div>
            </div>

            <div className="fc-vs-col">
              <div className="fc-vs">VS</div>
              <div className="fc-tape">
                <StatRow label="POS" ny={BRUNSON.pos} sa={WEMBY.pos} />
                <StatRow label="HT" ny={BRUNSON.ht} sa={WEMBY.ht} />
                <StatRow label="WT" ny={`${BRUNSON.wt}`} sa={`${WEMBY.wt}`} />
                <StatRow label="AGE" ny={BRUNSON.age} sa={WEMBY.age} />
              </div>
            </div>

            <div className="fc-fighter fc-fighter-sa" style={{ transform: `translate3d(${px * -10}px, ${py * 6}px, 0)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={nbaHeadshot(WEMBY.id)} alt={WEMBY.name} className="fc-fighter-img" />
              <div className="fc-fighter-name">{WEMBY.first}</div>
              <div className="fc-fighter-num">#{WEMBY.num} · SAN ANTONIO</div>
            </div>
          </div>

          {/* live state line */}
          <div className="fc-state">
            {state === 'in' && nySide && saSide ? (
              <div className="fc-score">
                <span className="fc-score-ny">{nySide.score}</span>
                <span className="fc-score-mid">{data?.game.shortDetail || `Q${data?.game.period}`}</span>
                <span className="fc-score-sa">{saSide.score}</span>
              </div>
            ) : state === 'post' && nySide && saSide ? (
              <div className="fc-score">
                <span className="fc-score-ny">{nySide.score}</span>
                <span className="fc-score-mid">FINAL</span>
                <span className="fc-score-sa">{saSide.score}</span>
              </div>
            ) : cd && !cd.done ? (
              <div className="fc-cd">
                <span className="fc-cd-lbl">GAME 4 · NEW YORK · TIPS IN</span>
                <div className="fc-cd-clock">
                  {[['HRS', cd.h + cd.d * 24], ['MIN', cd.m], ['SEC', cd.s]].map(([l, v]) => (
                    <span key={l as string} className="fc-cd-cell"><b>{String(v).padStart(2, '0')}</b><i>{l}</i></span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="fc-cd-lbl">GAME 4 · NEW YORK · TONIGHT</div>
            )}
            {data?.game.seriesSummary && <div className="fc-series-sum">{data.game.seriesSummary.toUpperCase()}</div>}
          </div>

          <div className="fc-cta-row">
            <a href="#fanzone" className="fc-cta fc-cta-primary">ENTER THE FAN ZONE</a>
            <a href="#bracket" className="fc-cta">SERIES & HIGHLIGHTS</a>
          </div>
        </div>

        <div className="fc-scrollhint">▾ THE SERIES BELOW</div>
      </section>

      {/* ════════ SERIES BRACKET ════════ */}
      <section id="bracket" className="fc-sec">
        <h2 className="fc-h2">THE ROAD · BEST OF 7</h2>
        <div className="fc-bracket">
          {(series.length ? series : [1, 2, 3, 4].map((g) => ({ game: g, state: 'pre' as const }))).slice(0, 7).map((g: any) => {
            const done = g.state === 'post'
            const live = g.state === 'in'
            return (
              <div key={g.game} className={`fc-game ${live ? 'fc-game-live' : ''} ${g.game === 4 ? 'fc-game-tonight' : ''}`}>
                <div className="fc-game-no">G{g.game}{g.game === 4 ? ' · TONIGHT' : ''}</div>
                {done || live ? (
                  <div className="fc-game-score">
                    <span>{g.awayAbbr} {g.awayScore}</span>
                    <span className="fc-game-at">@</span>
                    <span>{g.homeAbbr} {g.homeScore}</span>
                  </div>
                ) : (
                  <div className="fc-game-score fc-game-upcoming">{live ? 'LIVE' : 'UPCOMING'}</div>
                )}
                {g.winnerAbbr && <div className="fc-game-win">{g.winnerAbbr} WIN</div>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ════════ ROSTER CUTOUTS ════════ */}
      {(nyCutouts.length > 0 || saCutouts.length > 0) && (
        <section className="fc-sec">
          <h2 className="fc-h2">THE COMBATANTS</h2>
          <div className="fc-roster">
            <div className="fc-roster-team fc-roster-ny">
              <div className="fc-roster-tag">NEW YORK</div>
              <div className="fc-roster-rail">
                {nyCutouts.map((p) => (
                  <div key={p.id} className="fc-card fc-card-ny">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.headshot} alt={p.name} className="fc-card-img" loading="lazy" />
                    <div className="fc-card-name">{p.name}</div>
                    <div className="fc-card-meta">#{p.jersey} · {p.pos}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fc-roster-team fc-roster-sa">
              <div className="fc-roster-tag">SAN ANTONIO</div>
              <div className="fc-roster-rail">
                {saCutouts.map((p) => (
                  <div key={p.id} className="fc-card fc-card-sa">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.headshot} alt={p.name} className="fc-card-img" loading="lazy" />
                    <div className="fc-card-name">{p.name}</div>
                    <div className="fc-card-meta">#{p.jersey} · {p.pos}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ HIGHLIGHTS ════════ */}
      <section className="fc-sec">
        <h2 className="fc-h2">FILM ROOM · HIGHLIGHTS</h2>
        <HighlightsStrip sport={'nba' as any} limit={12} />
      </section>

      {/* ════════ FAN ZONE ════════ */}
      <section id="fanzone" className="fc-sec fc-fanzone">
        <h2 className="fc-h2">THE FAN ZONE · GOTHAM ROARS</h2>
        <p className="fc-fan-copy">
          Game 4 in New York. Post your reactions, drop the post-game mob footage, talk your trash —
          live with every fan in the building, right here, no leaving the arena.
        </p>
        <div className="fc-fan-cta-row">
          <Link href="/" className="fc-cta fc-cta-primary">🔥 LIVE FAN TAKES</Link>
          <Link href="/picks" className="fc-cta">🎯 MAKE YOUR GAME-4 CALL</Link>
        </div>
      </section>

      <style jsx>{`
        .fc-root { background: #05070d; color: #fff; }
        /* ── HERO ── */
        .fc-hero {
          position: relative; min-height: 100vh; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          perspective: 1200px;
        }
        .fc-cosmos { position: absolute; inset: 0; z-index: 0; }
        .fc-neb { position: absolute; inset: -10%; will-change: transform; }
        .fc-neb-ny { background: radial-gradient(60% 70% at 22% 45%, rgba(29,66,138,0.55), rgba(245,132,38,0.10) 45%, transparent 70%); }
        .fc-neb-sa { background: radial-gradient(60% 70% at 78% 45%, rgba(196,206,212,0.30), rgba(120,134,148,0.10) 45%, transparent 70%); }
        .fc-stars {
          position: absolute; inset: 0; opacity: 0.55;
          background-image:
            radial-gradient(1px 1px at 12% 18%, #fff, transparent),
            radial-gradient(1px 1px at 28% 62%, #cfe0ff, transparent),
            radial-gradient(1px 1px at 47% 28%, #fff, transparent),
            radial-gradient(1.5px 1.5px at 63% 71%, #fff, transparent),
            radial-gradient(1px 1px at 78% 22%, #e8eef5, transparent),
            radial-gradient(1px 1px at 88% 58%, #fff, transparent),
            radial-gradient(1px 1px at 38% 84%, #fff, transparent),
            radial-gradient(1.5px 1.5px at 8% 78%, #fff, transparent);
          animation: fc-twinkle 5s ease-in-out infinite alternate;
        }
        @keyframes fc-twinkle { from { opacity: 0.35; } to { opacity: 0.7; } }
        .fc-seam {
          position: absolute; top: 0; bottom: 0; left: 50%; width: 3px; transform: translateX(-50%);
          background: linear-gradient(to bottom, transparent, #9bc7ff 18%, #fff 50%, #d7dee5 82%, transparent);
          box-shadow: 0 0 24px 6px rgba(120,180,255,0.55), 0 0 60px 18px rgba(196,206,212,0.30);
          animation: fc-seampulse 2.6s ease-in-out infinite;
        }
        @keyframes fc-seampulse { 0%,100% { opacity: 0.7; filter: blur(0.3px);} 50% { opacity: 1; filter: blur(0.8px);} }
        .fc-beam {
          position: absolute; top: -20%; width: 2px; height: 90%; transform-origin: top center;
          background: linear-gradient(to bottom, rgba(155,199,255,0.5), transparent 70%);
          filter: blur(1px); z-index: 1;
        }
        .fc-beam-1 { left: 16%; transform: rotate(14deg); animation: fc-sweep1 9s ease-in-out infinite alternate; }
        .fc-beam-2 { left: 30%; transform: rotate(-8deg); animation: fc-sweep2 11s ease-in-out infinite alternate; }
        @keyframes fc-sweep1 { from { transform: rotate(10deg);} to { transform: rotate(22deg);} }
        @keyframes fc-sweep2 { from { transform: rotate(-12deg);} to { transform: rotate(2deg);} }
        .fc-skylines { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; z-index: 1; display: flex; }
        .fc-skyline-wrap { width: 56%; height: 100%; will-change: transform; }
        .fc-skyline-wrap.fc-right { margin-left: auto; }
        :global(.fc-skyline) { width: 100%; height: 100%; display: block; }
        :global(.fc-skyline-ny) { filter: drop-shadow(0 0 18px rgba(29,66,138,0.7)); transform: skewX(6deg); transform-origin: bottom right; }
        :global(.fc-skyline-sa) { filter: drop-shadow(0 0 18px rgba(196,206,212,0.5)); transform: skewX(-6deg); transform-origin: bottom left; }
        .fc-floaters { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
        .fc-floater { position: absolute; width: clamp(90px, 12vw, 180px); opacity: 0.22; filter: grayscale(0.3) contrast(1.05); will-change: transform; }
        .fc-floater-ny { filter: drop-shadow(0 0 24px rgba(29,66,138,0.9)) drop-shadow(0 0 8px rgba(245,132,38,0.5)); }
        .fc-floater-sa { filter: drop-shadow(0 0 24px rgba(196,206,212,0.7)); }
        .fc-fl-0 { left: 4%; top: 26%; } .fc-fl-1 { left: 12%; top: 54%; width: clamp(70px,9vw,130px);} .fc-fl-2 { left: 2%; top: 70%; opacity: 0.15;}
        .fc-fr-0 { right: 4%; top: 26%; } .fc-fr-1 { right: 12%; top: 54%; width: clamp(70px,9vw,130px);} .fc-fr-2 { right: 2%; top: 70%; opacity: 0.15;}

        /* ── core ── */
        .fc-core { position: relative; z-index: 5; text-align: center; padding: 4vh 16px; max-width: 1000px; }
        .fc-kicker { font-size: 11px; letter-spacing: 0.4em; font-weight: 800; color: #9bc7ff; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 8px; }
        .fc-dot { width: 7px; height: 7px; border-radius: 2px; background: #f58426; box-shadow: 0 0 12px #f58426; }
        .fc-live { color: #ff3b3b; animation: fc-blink 1.1s steps(2) infinite; }
        @keyframes fc-blink { 50% { opacity: 0.3; } }
        .fc-title {
          font-size: clamp(40px, 9vw, 116px); font-weight: 900; line-height: 0.9; letter-spacing: -0.02em; margin: 0;
          background: linear-gradient(90deg, #6fa8ff 0%, #ffffff 38%, #ffffff 62%, #c4ced4 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 4px 30px rgba(120,180,255,0.35)); text-transform: uppercase;
        }
        /* ── face-off ── */
        .fc-faceoff { display: flex; align-items: flex-end; justify-content: center; gap: clamp(4px, 2vw, 24px); margin: 2.4vh 0 1vh; }
        .fc-fighter { position: relative; width: clamp(120px, 22vw, 260px); will-change: transform; }
        .fc-fighter-img { width: 100%; display: block; }
        .fc-fighter-ny .fc-fighter-img { filter: drop-shadow(0 0 30px rgba(29,66,138,0.95)) drop-shadow(0 6px 10px rgba(0,0,0,0.6)); }
        .fc-fighter-sa { transform: scaleX(-1); }
        .fc-fighter-sa .fc-fighter-img { filter: drop-shadow(0 0 30px rgba(196,206,212,0.85)) drop-shadow(0 6px 10px rgba(0,0,0,0.6)); }
        .fc-fighter-sa .fc-fighter-name, .fc-fighter-sa .fc-fighter-num { transform: scaleX(-1); }
        .fc-fighter-name { font-weight: 900; font-size: clamp(15px, 2.4vw, 30px); letter-spacing: 0.04em; margin-top: -6px; }
        .fc-fighter-ny .fc-fighter-name { color: #6fa8ff; text-shadow: 0 0 16px rgba(29,66,138,0.9); }
        .fc-fighter-sa .fc-fighter-name { color: #e8eef5; text-shadow: 0 0 16px rgba(196,206,212,0.8); }
        .fc-fighter-num { font-size: 9px; letter-spacing: 0.25em; color: #9aa6b2; font-weight: 700; }
        .fc-vs-col { display: flex; flex-direction: column; align-items: center; padding-bottom: 18px; }
        .fc-vs { font-weight: 900; font-size: clamp(22px, 4vw, 52px); font-style: italic;
          background: linear-gradient(90deg,#f58426,#fff,#c4ced4); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 14px rgba(245,132,38,0.6)); }
        .fc-tape { margin-top: 8px; width: clamp(150px, 22vw, 230px); }
        .fc-tape-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px; padding: 3px 0; border-top: 1px solid rgba(255,255,255,0.08); font-size: clamp(10px,1.4vw,13px); }
        .fc-tape-ny { text-align: right; color: #6fa8ff; font-weight: 800; }
        .fc-tape-sa { text-align: left; color: #e8eef5; font-weight: 800; }
        .fc-tape-lbl { font-size: 8px; letter-spacing: 0.2em; color: #6b7682; font-weight: 700; }
        /* ── state ── */
        .fc-state { margin: 1.5vh 0; }
        .fc-score { display: inline-flex; align-items: center; gap: 18px; font-weight: 900; }
        .fc-score-ny { font-size: clamp(34px,6vw,68px); color: #6fa8ff; text-shadow: 0 0 20px rgba(29,66,138,0.8); }
        .fc-score-sa { font-size: clamp(34px,6vw,68px); color: #e8eef5; text-shadow: 0 0 20px rgba(196,206,212,0.7); }
        .fc-score-mid { font-size: 12px; letter-spacing: 0.2em; color: #ff5a3c; font-weight: 800; }
        .fc-cd-lbl { font-size: clamp(11px,1.6vw,14px); letter-spacing: 0.28em; font-weight: 800; color: #cdd7e2; }
        .fc-cd-clock { display: inline-flex; gap: 10px; margin-top: 10px; }
        .fc-cd-cell { display: flex; flex-direction: column; align-items: center; min-width: 54px; padding: 8px 6px; border: 1px solid rgba(155,199,255,0.25); background: rgba(10,18,32,0.6); backdrop-filter: blur(4px); border-radius: 6px; }
        .fc-cd-cell b { font-size: clamp(20px,3vw,34px); font-weight: 900; line-height: 1; }
        .fc-cd-cell i { font-size: 8px; letter-spacing: 0.2em; color: #7e8a96; font-style: normal; margin-top: 4px; }
        .fc-series-sum { margin-top: 12px; font-size: 12px; letter-spacing: 0.24em; font-weight: 800; color: #f58426; }
        .fc-cta-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 2.4vh; }
        .fc-cta { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; padding: 11px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); color: #fff; text-decoration: none; transition: all .15s; }
        .fc-cta:hover { border-color: #6fa8ff; color: #6fa8ff; }
        .fc-cta-primary { background: linear-gradient(90deg,#1d428a,#f58426); border-color: transparent; }
        .fc-cta-primary:hover { color: #fff; filter: brightness(1.1); }
        .fc-scrollhint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); z-index: 5; font-size: 9px; letter-spacing: 0.3em; color: #5b6672; animation: fc-bob 2s ease-in-out infinite; }
        @keyframes fc-bob { 0%,100% { transform: translate(-50%,0);} 50% { transform: translate(-50%,5px);} }

        /* ── sections ── */
        .fc-sec { max-width: 1100px; margin: 0 auto; padding: 40px 16px; }
        .fc-h2 { font-size: clamp(16px,2.4vw,24px); font-weight: 900; letter-spacing: 0.16em; text-align: center; margin: 0 0 22px; color: #fff;
          background: linear-gradient(90deg,#6fa8ff,#fff,#c4ced4); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .fc-bracket { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        .fc-game { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; background: rgba(255,255,255,0.02); text-align: center; }
        .fc-game-tonight { border-color: #f58426; box-shadow: 0 0 0 1px rgba(245,132,38,0.4), 0 0 24px rgba(245,132,38,0.15); }
        .fc-game-live { border-color: #ff3b3b; }
        .fc-game-no { font-size: 9px; letter-spacing: 0.18em; color: #8a96a2; font-weight: 800; margin-bottom: 8px; }
        .fc-game-score { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; font-size: 14px; }
        .fc-game-at { color: #5b6672; font-size: 10px; }
        .fc-game-upcoming { color: #6b7682; font-size: 11px; letter-spacing: 0.15em; }
        .fc-game-win { margin-top: 6px; font-size: 9px; letter-spacing: 0.15em; color: #f58426; font-weight: 800; }
        /* roster */
        .fc-roster { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .fc-roster-tag { font-size: 11px; letter-spacing: 0.25em; font-weight: 900; margin-bottom: 10px; }
        .fc-roster-ny .fc-roster-tag { color: #6fa8ff; }
        .fc-roster-sa .fc-roster-tag { color: #e8eef5; }
        .fc-roster-rail { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
        .fc-card { flex: 0 0 auto; width: 112px; text-align: center; border-radius: 12px; padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); }
        .fc-card-ny { background: linear-gradient(180deg, rgba(29,66,138,0.25), rgba(255,255,255,0.02)); }
        .fc-card-sa { background: linear-gradient(180deg, rgba(196,206,212,0.16), rgba(255,255,255,0.02)); }
        .fc-card-img { width: 100%; height: 90px; object-fit: contain; object-position: bottom; }
        .fc-card-ny .fc-card-img { filter: drop-shadow(0 0 12px rgba(29,66,138,0.8)); }
        .fc-card-sa .fc-card-img { filter: drop-shadow(0 0 12px rgba(196,206,212,0.6)); }
        .fc-card-name { font-size: 11px; font-weight: 800; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fc-card-meta { font-size: 9px; color: #8a96a2; }
        /* fan zone */
        .fc-fanzone { text-align: center; }
        .fc-fan-copy { max-width: 560px; margin: 0 auto 18px; color: #b6c0cc; font-size: 14px; line-height: 1.6; }
        .fc-fan-cta-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }

        @media (min-width: 740px) {
          .fc-roster { grid-template-columns: 1fr 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fc-stars, .fc-seam, .fc-beam, .fc-scrollhint, .fc-live { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
