/**
 * CrewQuarters — the astronaut's private room (SoundChain Starship: Profile capsule)
 *
 * Fable5 spec port (soundchain-profile-quarters_1.html): the profile page IS
 * your quarters — private time, reading, resting, music, movies. The user's
 * cover photo/video stays the room's wallpaper (sacred personalization);
 * this layer adds the capsule around it:
 *  - quilted hull walls at the viewport edges w/ handrail nubs + locker seams
 *  - flywheel door-slit light rails on the walls' inner edges (SC spectrum —
 *    light only where a vessel mounts light)
 *  - DIM ☾ / WAKE ☀ circadian toggle — warm rest light vs cool on-duty light
 *    (persisted, self-contained state)
 *  - a matte-black NINJA astronaut drifting past every ~80s (sparse, like the
 *    Fable5 law: rare enough to feel real)
 *
 * Layering: fixed z-[5] — ABOVE the cover wallpaper (z-0), BELOW content
 * (z-10). pointer-events-none except the toggle pill. Pure CSS, no rAF.
 */

import React, { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const FLYWHEEL = 'linear-gradient(180deg, #ff6a3d, #ff3d9a, #a07bff, #37e6ff, #b8ff4d, #ffd700)'
const QUILT =
  'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), linear-gradient(90deg, #181023 0%, #0e0917 60%, #080510 100%)'
const QUILT_R =
  'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), linear-gradient(270deg, #181023 0%, #0e0917 60%, #080510 100%)'

export function CrewQuarters() {
  // Circadian light mode — DIM (warm rest) / WAKE (cool on-duty)
  const [dim, setDim] = useState(false)
  useEffect(() => {
    try { setDim(localStorage.getItem('sc-quarters-mode') === 'dim') } catch { /* noop */ }
  }, [])
  const toggle = () => {
    setDim(d => {
      try { localStorage.setItem('sc-quarters-mode', d ? 'wake' : 'dim') } catch { /* noop */ }
      return !d
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[5] pointer-events-none select-none" aria-hidden>
        {/* circadian ambient wash — tints the wallpaper, never the content */}
        <div
          className="absolute inset-0 transition-colors duration-1000"
          style={{ background: dim ? 'rgba(255,178,77,0.09)' : 'rgba(55,230,255,0.05)' }}
        />
        {/* cabin depth vignette */}
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 90px 18px rgba(4,2,8,0.7)' }} />

        {/* LEFT hull wall — quilted padding + handrail nubs */}
        <div className="absolute top-0 bottom-0 left-0 w-2.5 md:w-5" style={{ background: QUILT, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute top-[22%] right-0.5 w-1 h-10 rounded-full bg-[#4db8ff]/40 hidden md:block" />
          <div className="absolute top-[62%] right-0.5 w-1 h-10 rounded-full bg-[#4db8ff]/40 hidden md:block" />
        </div>
        {/* RIGHT hull wall — quilted + locker seams */}
        <div className="absolute top-0 bottom-0 right-0 w-2.5 md:w-5" style={{ background: QUILT_R, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute top-[30%] left-0 right-0 h-px bg-white/10 hidden md:block" />
          <div className="absolute top-[48%] left-0 right-0 h-px bg-white/10 hidden md:block" />
          <div className="absolute top-[66%] left-0 right-0 h-px bg-white/10 hidden md:block" />
        </div>

        {/* flywheel door-slit light rails — the walls' inner edges */}
        <div
          className="absolute top-0 bottom-0 left-2.5 md:left-5 w-[2px] transition-opacity duration-1000"
          style={{ background: FLYWHEEL, opacity: dim ? 0.35 : 0.65, boxShadow: '0 0 8px rgba(160,123,255,0.5)' }}
        />
        <div
          className="absolute top-0 bottom-0 right-2.5 md:right-5 w-[2px] transition-opacity duration-1000"
          style={{ background: FLYWHEEL, opacity: dim ? 0.35 : 0.65, boxShadow: '0 0 8px rgba(55,230,255,0.5)' }}
        />

        {/* floor guide strip — desktop only (mobile bottom nav owns that edge) */}
        <div className="absolute bottom-0 left-0 right-0 h-3.5 hidden md:flex items-center"
          style={{ background: 'linear-gradient(0deg, #0c0916 0%, #080510 70%, transparent 100%)' }}>
          <div className="w-full h-[2px] transition-opacity duration-1000"
            style={{ background: 'linear-gradient(90deg, #ff6a3d, #ff3d9a, #a07bff, #37e6ff, #b8ff4d, #ffd700)', opacity: dim ? 0.25 : 0.45 }} />
        </div>

        {/* cabin status LEDs */}
        <div className="absolute top-16 left-1 md:left-1.5 flex flex-col gap-2">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" style={{ animationDuration: '2.6s', boxShadow: '0 0 5px #34d399' }} />
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" style={{ animationDuration: '4.2s', animationDelay: '0.8s', boxShadow: '0 0 5px #fbbf24' }} />
        </div>

        {/* ninja astronaut — drifts across the wallpaper every ~80s, behind content */}
        <div className="absolute top-[26%] left-0 w-5 h-7 opacity-60" style={{ animation: 'scNinjaDrift 82s linear infinite' }}>
          <div className="w-3.5 h-3.5 mx-auto rounded-full bg-[#0c0c10] border border-white/15 relative">
            <div className="absolute top-1 left-0.5 right-0.5 h-1 rounded-full" style={{ background: dim ? '#ffb24d' : '#37e6ff', opacity: 0.8 }} />
          </div>
          <div className="w-3 h-3.5 mx-auto rounded-sm bg-[#101016] border border-white/10 relative -mt-px">
            <div className="absolute inset-x-0 top-0.5 mx-auto w-1.5 h-1.5 rounded-full"
              style={{ background: 'conic-gradient(#ff6a3d, #ff3d9a, #a07bff, #37e6ff, #b8ff4d, #ffd700, #ff6a3d)' }} />
          </div>
        </div>
      </div>

      {/* DIM / WAKE — the room's light switch (the one interactive element) */}
      <button
        onClick={toggle}
        title={dim ? 'WAKE — on-duty light' : 'DIM — rest light'}
        aria-label={dim ? 'Switch to wake lighting' : 'Switch to dim lighting'}
        className={`fixed left-3 bottom-20 md:bottom-6 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full border backdrop-blur-md transition-all duration-300 active:scale-95 ${
          dim
            ? 'bg-[#1a1208]/70 border-amber-400/40 text-amber-300 hover:border-amber-300'
            : 'bg-black/50 border-cyan-400/30 text-cyan-300/80 hover:border-cyan-300'
        }`}
      >
        {dim ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span className="text-[9px] font-bold uppercase tracking-[0.25em]">{dim ? 'Wake' : 'Dim'}</span>
      </button>
    </>
  )
}

export default CrewQuarters
