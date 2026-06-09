import Head from 'next/head'
import { useEffect, useState } from 'react'
import { SportHubTemplate } from '@/components/SportHubTemplate'

// FIFA World Cup 2026 — the global-event tournament dash. Reuses the shared
// sport hub (live scoreboard + 12-group standings + per-match takes + stat
// leaders + highlights, polling ESPN every 60s) and layers a tournament-grade
// header on top: host nations, the bracket roadmap, and a live countdown to
// kickoff so fans land on arena and feel the tournament before a ball is kicked.
//
// 48 teams · 12 groups (A–L) · USA · Canada · Mexico · Jun 11 → Jul 19, 2026.

// Opener: Mexico vs South Africa, 2026-06-11 (ESPN-confirmed). Kickoff ~19:00 ET.
const KICKOFF_ISO = '2026-06-11T23:00:00Z'

const HOSTS = [
  { flag: '🇺🇸', name: 'USA' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇲🇽', name: 'Mexico' },
]

const ROADMAP = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarters', 'Semis', 'Final']

function useCountdown(targetIso: string) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const target = new Date(targetIso).getTime()
  if (now === null) return null
  const diff = Math.max(0, target - now)
  return {
    live: diff === 0,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular-nums text-2xl sm:text-3xl font-black text-white leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-[0.2em] text-white/60 mt-1">{label}</span>
    </div>
  )
}

function WorldCupHeader() {
  const cd = useCountdown(KICKOFF_ISO)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-gradient-to-br from-[#0a0e1a] via-[#0d1226] to-[#160a1f]">
      {/* pitch glow accents */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">FIFA World Cup</span>
          <span className="text-[10px] font-mono text-white/40">·</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">2026</span>
          {cd?.live && (
            <span className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-arena-red">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-arena-red opacity-75 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-arena-red" /></span>
              Live
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-none">
          The World Cup, <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">live on Arena</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-white/60 max-w-xl">
          48 teams · 12 groups · every fixture, table, goal and take in one place. Drop your shout on any match — the whole world's watching.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* hosts */}
          <div className="flex items-center gap-2">
            {HOSTS.map((h) => (
              <span key={h.name} className="flex items-center gap-1 text-xs font-bold text-white/80">
                <span className="text-base leading-none">{h.flag}</span>{h.name}
              </span>
            ))}
          </div>
          <span className="hidden sm:block text-white/20">|</span>
          <span className="text-xs font-mono text-white/50">Jun 11 → Jul 19, 2026</span>
        </div>

        {/* countdown / live */}
        <div className="mt-5">
          {!cd ? (
            <div className="h-12" />
          ) : cd.live ? (
            <div className="text-sm font-black uppercase tracking-wider text-emerald-400">⚽ Tournament is LIVE — jump into a match below</div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 px-4 py-3">
                <CountdownCell value={cd.d} label="days" />
                <span className="text-2xl font-black text-white/30 pb-4">:</span>
                <CountdownCell value={cd.h} label="hrs" />
                <span className="text-2xl font-black text-white/30 pb-4">:</span>
                <CountdownCell value={cd.m} label="min" />
                <span className="text-2xl font-black text-white/30 pb-4">:</span>
                <CountdownCell value={cd.s} label="sec" />
              </div>
              <div className="pb-1 text-[11px] text-white/50 leading-tight">
                to kickoff<br /><span className="text-white/80 font-bold">🇲🇽 Mexico v South Africa 🇿🇦</span>
              </div>
            </div>
          )}
        </div>

        {/* roadmap */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {ROADMAP.map((stage, i) => (
            <span key={stage} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${i === 0 ? 'border-emerald-400/50 text-emerald-300 bg-emerald-400/10' : 'border-white/10 text-white/45'}`}>
                {stage}
              </span>
              {i < ROADMAP.length - 1 && <span className="text-white/20 text-[9px]">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WorldCupPage() {
  return (
    <>
      <Head>
        <title>World Cup 2026 · SoundChain Arena</title>
        <meta name="description" content="FIFA World Cup 2026 — live scores, all 12 group tables, fixtures, top scorers, and fan takes on every match. The fans' best portal into the tournament." />
      </Head>
      <SportHubTemplate
        sport="fifaWorld"
        title="World Cup 2026"
        hologramLabel="FIFA WORLD CUP · 48 TEAMS · 12 GROUPS"
        pageDescription="Live World Cup scores, all 12 group tables, fixtures, top scorers + a take on every match. Auto-refreshes every 60 seconds."
        extraSection={<WorldCupHeader />}
      />
    </>
  )
}
