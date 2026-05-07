import { useEffect, useState } from 'react'
import { X, MapPin, CalendarClock, Flag, Clock, Zap, Trophy } from 'lucide-react'
import { HighlightsStrip } from './HighlightsStrip'
import {
  fetchF1RaceDetails, teamColor, countryFlag,
  type F1Race, type F1RaceDetails, type F1RaceResultEntry, type F1QualifyingEntry,
} from '@/lib/f1'

type Tab = 'results' | 'qualifying'

interface Props { race: F1Race | null; onClose: () => void }

export function F1RaceDetailModal({ race, onClose }: Props) {
  const [details, setDetails] = useState<F1RaceDetails | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('results')

  // Lock body scroll while modal is open. Same pattern as WweEventDetailModal.
  useEffect(() => {
    if (!race) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [race])

  useEffect(() => {
    if (!race) { setDetails(null); setLoaded(false); return }
    let cancelled = false
    setDetails(null); setLoaded(false); setTab('results')
    ;(async () => {
      const d = await fetchF1RaceDetails(race.season, race.round)
      if (!cancelled) { setDetails(d); setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [race?.season, race?.round])

  if (!race) return null

  const dateLabel = new Date(race.date + (race.time ? `T${race.time}` : 'T00:00:00')).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const dateInPast = new Date(race.date).getTime() < Date.now() - 86400000

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl bg-arena-paper dark:bg-arena-carbon border-t sm:border border-arena-border-l dark:border-arena-border-d sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-arena-paper dark:bg-arena-carbon border-b border-arena-border-l/40 dark:border-arena-border-d/40 px-4 sm:px-5 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] text-arena-orange mb-1">
              <Flag className="w-3 h-3" />
              <span>ROUND {race.round} · {race.season}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black truncate">{race.raceName}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-2 -m-2 text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scroll body */}
        <div className="overflow-y-auto flex-1">
          {/* Strip facts */}
          <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-arena-muted-l dark:text-arena-muted-d border-b border-arena-border-l/40 dark:border-arena-border-d/40">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{race.circuit.circuitName}</span>
            <span>·</span>
            <span>{countryFlag(race.circuit.country)} {race.circuit.locality}, {race.circuit.country}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{dateLabel}</span>
          </div>

          {/* Tabs — only render if race is in the past (future races have no results/quali yet) */}
          {dateInPast && (
            <div className="px-4 sm:px-5 py-3 flex gap-2 border-b border-arena-border-l/40 dark:border-arena-border-d/40">
              <TabPill active={tab === 'results'} onClick={() => setTab('results')} icon={<Trophy className="w-3 h-3" />} label="Results" />
              <TabPill active={tab === 'qualifying'} onClick={() => setTab('qualifying')} icon={<Clock className="w-3 h-3" />} label="Qualifying" />
            </div>
          )}

          {/* Body */}
          {!dateInPast ? (
            <div className="px-4 sm:px-5 py-10 text-center">
              <div className="text-xs font-mono text-arena-muted-l dark:text-arena-muted-d mb-2">RACE WEEKEND UPCOMING</div>
              <div className="text-sm">Lights out: {dateLabel}{race.time ? ` · ${race.time.slice(0, 5)} UTC` : ''}</div>
              <div className="text-xs text-arena-muted-l dark:text-arena-muted-d mt-3">
                Results + qualifying ladder populate after the race runs.
              </div>
            </div>
          ) : !loaded ? (
            <div className="px-4 sm:px-5 py-10 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-arena-card dark:bg-arena-surface animate-pulse" />
              ))}
            </div>
          ) : !details ? (
            <div className="px-4 sm:px-5 py-10 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">
              No data available — Jolpica may not have indexed this race yet.
            </div>
          ) : tab === 'results' ? (
            <ResultsTable results={details.results} />
          ) : (
            <QualifyingTable qualifying={details.qualifying} />
          )}

          {/* Highlights — official Formula 1 channel via YouTube RSS */}
          <div className="px-4 sm:px-5 py-4 border-t border-arena-border-l/40 dark:border-arena-border-d/40">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Highlights · Onboards · Recaps
            </h3>
            <HighlightsStrip sport="f1" limit={8} />
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-arena-border-l/40 dark:border-arena-border-d/40 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
            Data via Jolpica-F1 (Ergast successor) · Highlights via Formula 1 official YouTube
          </div>
        </div>
      </div>
    </div>
  )
}

function TabPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-[11px] font-mono tracking-wider uppercase transition-colors ${
        active
          ? 'bg-arena-red text-white'
          : 'bg-arena-card dark:bg-arena-surface text-arena-muted-l dark:text-arena-muted-d hover:text-arena-fg-l dark:hover:text-arena-fg-d'
      }`}
    >
      {icon}<span>{label}</span>
    </button>
  )
}

function GridDelta({ grid, finish }: { grid?: string; finish: string }) {
  if (!grid || grid === '0') return <span className="text-arena-muted-l dark:text-arena-muted-d">—</span>
  const g = parseInt(grid), f = parseInt(finish)
  if (!Number.isFinite(g) || !Number.isFinite(f)) return <span>{grid}</span>
  const delta = g - f
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-arena-muted-l dark:text-arena-muted-d">{grid}</span>
      {delta !== 0 && (
        <span className={`text-[10px] font-bold ${delta > 0 ? 'text-arena-green' : 'text-arena-red'}`}>
          {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
        </span>
      )}
    </span>
  )
}

function ResultsTable({ results }: { results: F1RaceResultEntry[] }) {
  if (results.length === 0) {
    return <div className="px-4 sm:px-5 py-10 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">No results.</div>
  }
  // The driver with FastestLap.rank === '1' gets the purple FL pill.
  const fastestDriverId = results.find((r) => r.fastestLap?.rank === '1')?.driver.driverId

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs arena-tabular">
        <thead>
          <tr className="text-[9px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d border-b border-arena-border-l dark:border-arena-border-d">
            <th className="px-3 py-2 text-left w-8">P</th>
            <th className="px-2 py-2 text-left">Driver</th>
            <th className="px-2 py-2 text-left hidden sm:table-cell">Team</th>
            <th className="px-2 py-2 text-left w-16">Grid</th>
            <th className="px-2 py-2 text-right">Time / Status</th>
            <th className="px-3 py-2 text-right w-12">PTS</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const isFastest = fastestDriverId && r.driver.driverId === fastestDriverId
            return (
              <tr
                key={r.driver.driverId}
                className="border-b border-arena-border-l dark:border-arena-border-d last:border-b-0 hover:bg-arena-card dark:hover:bg-arena-surface"
              >
                <td className="px-3 py-2 font-mono text-arena-muted-l dark:text-arena-muted-d">{r.position}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1 h-5 rounded-full flex-shrink-0"
                      style={{ background: teamColor(r.constructor.constructorId) }}
                    />
                    <span className="font-bold whitespace-nowrap">
                      {r.driver.code ?? `${r.driver.givenName[0]}. ${r.driver.familyName}`}
                    </span>
                    {isFastest && (
                      <span className="px-1.5 py-[1px] text-[9px] font-mono font-black bg-purple-600 text-white rounded">FL</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 hidden sm:table-cell text-arena-muted-l dark:text-arena-muted-d">{r.constructor.name}</td>
                <td className="px-2 py-2"><GridDelta grid={r.grid} finish={r.position} /></td>
                <td className="px-2 py-2 text-right font-mono text-arena-muted-l dark:text-arena-muted-d">
                  {r.time?.time ?? r.status}
                </td>
                <td className="px-3 py-2 text-right font-black text-arena-red">{r.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function QualifyingTable({ qualifying }: { qualifying: F1QualifyingEntry[] }) {
  if (qualifying.length === 0) {
    return <div className="px-4 sm:px-5 py-10 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">No qualifying data — pre-2003 races and some sprint formats.</div>
  }
  // Best Q3 time is pole — bold it. Find min Q3 (string time compare works for "1:23.456" format).
  const q3Times = qualifying.map((q) => q.q3).filter(Boolean) as string[]
  const poleTime = q3Times.sort()[0]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs arena-tabular">
        <thead>
          <tr className="text-[9px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d border-b border-arena-border-l dark:border-arena-border-d">
            <th className="px-3 py-2 text-left w-8">P</th>
            <th className="px-2 py-2 text-left">Driver</th>
            <th className="px-2 py-2 text-right hidden sm:table-cell">Q1</th>
            <th className="px-2 py-2 text-right hidden sm:table-cell">Q2</th>
            <th className="px-3 py-2 text-right">Q3</th>
          </tr>
        </thead>
        <tbody>
          {qualifying.map((q) => {
            const isPole = q.q3 && q.q3 === poleTime
            return (
              <tr
                key={q.driver.driverId}
                className="border-b border-arena-border-l dark:border-arena-border-d last:border-b-0 hover:bg-arena-card dark:hover:bg-arena-surface"
              >
                <td className="px-3 py-2 font-mono text-arena-muted-l dark:text-arena-muted-d">{q.position}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: teamColor(q.constructor.constructorId) }} />
                    <span className="font-bold whitespace-nowrap">
                      {q.driver.code ?? `${q.driver.givenName[0]}. ${q.driver.familyName}`}
                    </span>
                    {isPole && <span className="px-1.5 py-[1px] text-[9px] font-mono font-black bg-arena-red text-white rounded">POLE</span>}
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-mono text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">{q.q1 ?? '—'}</td>
                <td className="px-2 py-2 text-right font-mono text-arena-muted-l dark:text-arena-muted-d hidden sm:table-cell">{q.q2 ?? '—'}</td>
                <td className={`px-3 py-2 text-right font-mono ${isPole ? 'font-black text-arena-red' : 'text-arena-fg-l dark:text-arena-fg-d'}`}>{q.q3 ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
