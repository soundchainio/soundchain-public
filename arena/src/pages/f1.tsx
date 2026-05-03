import Head from 'next/head'
import { useEffect, useState } from 'react'
import { Flag, Clock, MapPin, Trophy } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { PlayerHeadshot } from '@/components/PlayerHeadshot'
import {
  fetchF1Schedule, fetchF1DriverStandings, fetchF1ConstructorStandings, fetchF1LastRace,
  findNextRace, teamColor, countryFlag,
  type F1Race, type F1DriverStanding, type F1ConstructorStanding, type F1LastRace,
} from '@/lib/f1'

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!target) return null
  const diff = target.getTime() - now
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, live: true }
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    live: false,
  }
}

function NextRaceHero({ race }: { race: F1Race | null }) {
  const target = race
    ? new Date(`${race.date}T${race.time ?? '14:00:00Z'}`)
    : null
  const cd = useCountdown(target)
  if (!race) {
    return (
      <div className="text-sm text-arena-muted-l dark:text-arena-muted-d">
        Season concluded — countdown to 2026 paddock launch coming.
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.4em] text-arena-orange mb-3">
        <Flag className="w-3 h-3" />
        <span>NEXT · ROUND {race.round}</span>
      </div>
      <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
        <span className="arena-hologram-text">{race.raceName}</span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-arena-muted-l dark:text-arena-muted-d mb-6">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {race.circuit.circuitName}
        </span>
        <span>·</span>
        <span>{countryFlag(race.circuit.country)} {race.circuit.locality}, {race.circuit.country}</span>
      </div>

      <div className="flex items-center gap-2 mb-2 text-[10px] font-mono tracking-widest text-arena-muted-l dark:text-arena-muted-d">
        <Clock className="w-3 h-3" /> LIGHTS OUT IN
      </div>
      <div className="flex items-center gap-3 sm:gap-6 arena-tabular">
        <CountdownCell value={cd?.d ?? 0} label="DAYS" />
        <span className="text-3xl sm:text-5xl font-black text-arena-red">:</span>
        <CountdownCell value={cd?.h ?? 0} label="HRS" />
        <span className="text-3xl sm:text-5xl font-black text-arena-red">:</span>
        <CountdownCell value={cd?.m ?? 0} label="MIN" />
        <span className="text-3xl sm:text-5xl font-black text-arena-red">:</span>
        <CountdownCell value={cd?.s ?? 0} label="SEC" />
      </div>
      {cd?.live && (
        <div className="mt-3 inline-flex items-center gap-2 text-arena-red text-sm font-bold">
          <span className="arena-live-dot" /> RACE WINDOW OPEN
        </div>
      )}
    </div>
  )
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-5xl font-black tabular-nums">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mt-1">
        {label}
      </div>
    </div>
  )
}

function PodiumCard({ last }: { last: F1LastRace | null }) {
  if (!last) return null
  const top3 = last.results.slice(0, 3)
  if (top3.length === 0) return null
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-arena-yellow" />
          Last race podium
        </h3>
        <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
          {last.race.raceName} · R{last.race.round}
        </span>
      </div>
      <ol className="space-y-2">
        {top3.map((r, i) => (
          <li
            key={r.driver.driverId}
            className="flex items-center gap-3 py-2 border-b border-arena-border-l dark:border-arena-border-d last:border-b-0"
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
              style={{
                background:
                  i === 0 ? '#facc15' : i === 1 ? '#d4d4d8' : '#a16207',
                color: '#0a0a0a',
              }}
            >
              {i + 1}
            </span>
            <PlayerHeadshot
              name={`${r.driver.givenName} ${r.driver.familyName}`}
              size={36}
              ringColor={teamColor(r.constructor.constructorId)}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">
                {r.driver.givenName} {r.driver.familyName}
              </div>
              <div className="text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">
                {r.constructor.name}
              </div>
            </div>
            <span className="text-sm font-bold text-arena-red arena-tabular">
              +{r.points} pts
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function DriverStandingsTable({ standings }: { standings: F1DriverStanding[] }) {
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d">
        <h3 className="text-sm font-black uppercase tracking-wider">Driver Standings</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d border-b border-arena-border-l dark:border-arena-border-d">
            <th className="px-4 py-2 text-left w-10">P</th>
            <th className="px-2 py-2 text-left">Driver</th>
            <th className="px-2 py-2 text-left hidden md:table-cell">Constructor</th>
            <th className="px-2 py-2 text-right arena-tabular">Wins</th>
            <th className="px-4 py-2 text-right arena-tabular">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, 20).map((s) => (
            <tr
              key={s.driver.driverId}
              className="border-b border-arena-border-l dark:border-arena-border-d last:border-b-0 hover:bg-arena-paper dark:hover:bg-arena-carbon"
            >
              <td className="px-4 py-2 text-xs font-mono arena-tabular">{s.position}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <PlayerHeadshot
                    name={`${s.driver.givenName} ${s.driver.familyName}`}
                    size={28}
                    ringColor={teamColor(s.constructor.constructorId)}
                  />
                  <span className="text-sm font-bold">
                    {s.driver.code ?? `${s.driver.givenName[0]}. ${s.driver.familyName}`}
                  </span>
                  <span className="hidden lg:inline text-xs text-arena-muted-l dark:text-arena-muted-d">
                    {s.driver.familyName}
                  </span>
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-arena-muted-l dark:text-arena-muted-d hidden md:table-cell">
                {s.constructor.name}
              </td>
              <td className="px-2 py-2 text-right text-sm arena-tabular">{s.wins}</td>
              <td className="px-4 py-2 text-right text-sm font-black text-arena-red arena-tabular">
                {s.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConstructorStandingsTable({ standings }: { standings: F1ConstructorStanding[] }) {
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d">
        <h3 className="text-sm font-black uppercase tracking-wider">Constructor Standings</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d border-b border-arena-border-l dark:border-arena-border-d">
            <th className="px-4 py-2 text-left w-10">P</th>
            <th className="px-2 py-2 text-left">Team</th>
            <th className="px-2 py-2 text-right arena-tabular">Wins</th>
            <th className="px-4 py-2 text-right arena-tabular">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, 12).map((s) => (
            <tr
              key={s.constructor.constructorId}
              className="border-b border-arena-border-l dark:border-arena-border-d last:border-b-0 hover:bg-arena-paper dark:hover:bg-arena-carbon"
            >
              <td className="px-4 py-2 text-xs font-mono arena-tabular">{s.position}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1 h-5 rounded-full flex-shrink-0"
                    style={{ background: teamColor(s.constructor.constructorId) }}
                  />
                  <span className="text-sm font-bold">{s.constructor.name}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-right text-sm arena-tabular">{s.wins}</td>
              <td className="px-4 py-2 text-right text-sm font-black text-arena-red arena-tabular">
                {s.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function F1Page() {
  const [schedule, setSchedule] = useState<F1Race[]>([])
  const [drivers, setDrivers] = useState<F1DriverStanding[]>([])
  const [constructors, setConstructors] = useState<F1ConstructorStanding[]>([])
  const [last, setLast] = useState<F1LastRace | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, d, c, l] = await Promise.all([
          fetchF1Schedule(),
          fetchF1DriverStandings(),
          fetchF1ConstructorStandings(),
          fetchF1LastRace(),
        ])
        if (!cancelled) {
          setSchedule(s); setDrivers(d); setConstructors(c); setLast(l)
          setLoaded(true)
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'F1 data unavailable')
          setLoaded(true)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const next = findNextRace(schedule)

  return (
    <>
      <Head>
        <title>Formula 1 · SoundChain Arena</title>
        <meta
          name="description"
          content="Live F1 standings, next race countdown, last race podium, full season schedule. Free, real-time data via Jolpica-F1 (Ergast successor)."
        />
      </Head>

      <ArenaShell>
        <section className="arena-hero-light border-b border-arena-border-l dark:border-arena-border-d">
          <div className="max-w-7xl mx-auto px-4 pt-10 pb-10 sm:pt-14 sm:pb-12">
            <NextRaceHero race={next} />
            {err && (
              <p className="mt-4 text-xs text-arena-orange font-mono">
                {err} · using last cached snapshot
              </p>
            )}
          </div>
        </section>

        {/* Standings + podium */}
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {loaded && drivers.length > 0 && <DriverStandingsTable standings={drivers} />}
              {loaded && constructors.length > 0 && (
                <ConstructorStandingsTable standings={constructors} />
              )}
              {!loaded && (
                <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d p-10 text-center text-sm text-arena-muted-l dark:text-arena-muted-d">
                  Loading standings…
                </div>
              )}
            </div>
            <div className="space-y-4">
              <PodiumCard last={last} />
              {schedule.length > 0 && (
                <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-5">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-3">
                    {schedule[0]?.season} Season Calendar
                  </h3>
                  <ol className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                    {schedule.map((r) => (
                      <li
                        key={`${r.season}-${r.round}`}
                        className="flex items-center gap-2 text-xs py-1 border-b border-arena-border-l dark:border-arena-border-d last:border-b-0"
                      >
                        <span className="font-mono text-arena-muted-l dark:text-arena-muted-d w-6 arena-tabular">
                          R{r.round}
                        </span>
                        <span>{countryFlag(r.circuit.country)}</span>
                        <span className="flex-1 truncate font-bold">{r.raceName}</span>
                        <span className="font-mono text-[10px] text-arena-muted-l dark:text-arena-muted-d arena-tabular">
                          {r.date.slice(5)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 pb-8 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
          Data: Jolpica-F1 (Ergast-format successor) · No bets, no wagers, real telemetry only.
        </div>
      </ArenaShell>
    </>
  )
}
