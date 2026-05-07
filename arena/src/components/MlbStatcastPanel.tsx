import { useEffect, useState } from 'react'
import { Zap, Target, Flame, Loader2 } from 'lucide-react'
import type { MlbStatcastSnapshot, StatcastHit } from '@/lib/mlbStatcast'

interface Props {
  espnGameId: string
  date: string
  away: string
  home: string
  status?: 'pre' | 'live' | 'final'
}

/** Statcast leaders + spray chart. Renders side-by-side on lg screens, stacked
 *  on mobile. Fed by /api/mlb/statcast/[gameId] which proxies + caches the
 *  statsapi playByPlay snapshot. Returns null silently if no data — keeps
 *  the modal clean for non-statcast-eligible games (rain shortened, etc).
 */
export function MlbStatcastPanel({ espnGameId, date, away, home, status }: Props) {
  const [data, setData] = useState<MlbStatcastSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (status === 'pre') { setLoaded(true); setData(null); return }
    let cancelled = false
    setLoaded(false); setData(null)
    const params = new URLSearchParams({ date, away, home, status: status ?? '' })
    fetch(`/api/mlb/statcast/${espnGameId}?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled) setData(d?.statcast ?? null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [espnGameId, date, away, home, status])

  if (status === 'pre') return null
  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-xs text-arena-muted-l dark:text-arena-muted-d py-3">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading Statcast…
      </div>
    )
  }
  if (!data || (data.hitCount === 0 && data.pitchCount === 0)) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <LeaderCard
          icon={<Flame className="w-3.5 h-3.5" />}
          title="Hardest hit"
          unit="MPH"
          rows={data.hardestHits.map((h) => ({
            label: h.batterName,
            sub: `${h.result} · ${h.team === 'away' ? 'A' : 'H'} · Inn ${h.inning}`,
            value: h.launchSpeed?.toFixed(1) ?? '—',
          }))}
        />
        <LeaderCard
          icon={<Target className="w-3.5 h-3.5" />}
          title="Longest hit"
          unit="FT"
          rows={data.longestHits.map((h) => ({
            label: h.batterName,
            sub: `${h.result} · ${h.team === 'away' ? 'A' : 'H'} · Inn ${h.inning}`,
            value: h.totalDistance?.toFixed(0) ?? '—',
          }))}
        />
        <LeaderCard
          icon={<Zap className="w-3.5 h-3.5" />}
          title="Fastest pitch"
          unit="MPH"
          rows={data.fastestPitches.map((p) => ({
            label: p.pitcherName,
            sub: `${p.pitchName ?? p.pitchType ?? 'Pitch'} · Inn ${p.inning}`,
            value: p.startSpeed?.toFixed(1) ?? '—',
          }))}
        />
      </div>

      {data.allHits.some((h) => typeof h.coordX === 'number') && <SprayChart hits={data.allHits} />}

      {data.pitcherArsenals.length > 0 && <PitcherArsenals arsenals={data.pitcherArsenals} />}
    </div>
  )
}

function LeaderCard({ icon, title, unit, rows }: {
  icon: React.ReactNode; title: string; unit: string;
  rows: Array<{ label: string; sub: string; value: string }>
}) {
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-3">
      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d mb-2 flex items-center gap-1.5">
        {icon}<span>{title}</span><span className="ml-auto">{unit}</span>
      </h4>
      <ol className="space-y-2">
        {rows.length === 0 && <li className="text-xs text-arena-muted-l dark:text-arena-muted-d">No data.</li>}
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-arena-muted-l dark:text-arena-muted-d w-3 arena-tabular">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{r.label}</div>
              <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d truncate">{r.sub}</div>
            </div>
            <span className="font-black text-arena-red arena-tabular">{r.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const TRAJECTORY_COLOR: Record<string, string> = {
  line_drive: '#ef4444',
  fly_ball: '#22d3ee',
  ground_ball: '#eab308',
  popup: '#a3a3a3',
}

function SprayChart({ hits }: { hits: StatcastHit[] }) {
  const valid = hits.filter((h) => typeof h.coordX === 'number' && typeof h.coordY === 'number')
  if (valid.length === 0) return null

  // statsapi coords: home plate ~(125, 200) on a 250×250 grid, field stretches
  // UPWARD (y decreases toward outfield). SVG y is downward. We flip y so the
  // chart reads naturally: home plate at bottom, outfield at top.
  // Field outline approximated: foul lines from (125,200) at ±45° to outfield
  // wall arc r≈110 around home (≈330ft scaled).
  const width = 320
  const height = 280
  const scale = width / 250

  const homeX = 125 * scale
  const homeY = 200 * scale
  // Field outline path: foul lines + outfield arc
  // Left foul: from home to (≈40, 60) ; Right foul to (≈210, 60)
  const arcRadius = 110 * scale
  const fieldPath = `
    M ${homeX} ${homeY}
    L ${(125 - 78) * scale} ${(200 - 78) * scale}
    A ${arcRadius} ${arcRadius} 0 0 1 ${(125 + 78) * scale} ${(200 - 78) * scale}
    L ${homeX} ${homeY}
    Z
  `.replace(/\s+/g, ' ')

  // Bases for context: 1B, 2B, 3B (small squares)
  const base = (x: number, y: number) => (
    <rect x={x * scale - 3} y={y * scale - 3} width="6" height="6" fill="#3a3a3a" stroke="#525252" strokeWidth="0.5" transform={`rotate(45 ${x * scale} ${y * scale})`} />
  )

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-3">
      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d mb-2">
        Spray chart · {valid.length} balls in play
      </h4>
      <div className="flex items-start gap-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="flex-1 max-w-md">
          {/* Field */}
          <path d={fieldPath} fill="#1a3a1a" stroke="#2a5a2a" strokeWidth="1" />
          {/* Infield diamond */}
          <polygon
            points={`${homeX},${homeY} ${(125 + 18) * scale},${(200 - 18) * scale} ${homeX},${(200 - 36) * scale} ${(125 - 18) * scale},${(200 - 18) * scale}`}
            fill="#3a2a1a" stroke="#5a4a2a" strokeWidth="0.5"
          />
          {/* Bases + home */}
          {base(125, 200)}
          {base(125 + 18, 200 - 18)}
          {base(125, 200 - 36)}
          {base(125 - 18, 200 - 18)}

          {/* Hits — render misses first, HRs last so they paint over */}
          {valid.filter((h) => !h.isHomeRun).map((h, i) => {
            const x = (h.coordX ?? 0) * scale
            const y = (h.coordY ?? 0) * scale
            const speed = h.launchSpeed ?? 70
            const r = Math.max(2.5, Math.min(5, (speed - 60) / 10))
            const color = TRAJECTORY_COLOR[h.trajectory ?? ''] ?? '#a3a3a3'
            return (
              <circle key={`hit-${i}`} cx={x} cy={y} r={r} fill={color} fillOpacity="0.7" stroke={color} strokeWidth="0.5">
                <title>{`${h.batterName} · ${h.result} · ${h.launchSpeed?.toFixed(1) ?? '?'} mph${h.totalDistance ? ` · ${h.totalDistance.toFixed(0)}ft` : ''}`}</title>
              </circle>
            )
          })}
          {valid.filter((h) => h.isHomeRun).map((h, i) => {
            const x = (h.coordX ?? 0) * scale
            const y = (h.coordY ?? 0) * scale
            return (
              <g key={`hr-${i}`}>
                <circle cx={x} cy={y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5">
                  <title>{`${h.batterName} HR · ${h.launchSpeed?.toFixed(1) ?? '?'} mph · ${h.totalDistance?.toFixed(0) ?? '?'}ft`}</title>
                </circle>
                <text x={x} y={y + 2} fontSize="8" fill="#ffffff" fontWeight="900" textAnchor="middle">HR</text>
              </g>
            )
          })}
        </svg>

        <div className="flex flex-col gap-1.5 text-[10px] flex-shrink-0">
          <Legend color="#ef4444" label="Line drive" />
          <Legend color="#22d3ee" label="Fly ball" />
          <Legend color="#eab308" label="Ground ball" />
          <Legend color="#a3a3a3" label="Popup" />
          <Legend color="#ef4444" label="HR" filled />
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label, filled }: { color: string; label: string; filled?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2.5 h-2.5 rounded-full ${filled ? '' : 'opacity-70'}`}
        style={{ background: color, border: filled ? '1.5px solid white' : 'none' }}
      />
      <span className="text-arena-muted-l dark:text-arena-muted-d">{label}</span>
    </div>
  )
}

function PitcherArsenals({ arsenals }: { arsenals: MlbStatcastSnapshot['pitcherArsenals'] }) {
  // Top 4 pitchers by total pitch count to keep panel compact
  const top = [...arsenals]
    .map((a) => ({ ...a, total: a.pitches.reduce((s, p) => s + p.count, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
  if (top.length === 0) return null
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-3">
      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d mb-3">
        Pitcher arsenals
      </h4>
      <div className="space-y-3">
        {top.map((p) => (
          <div key={p.pitcherId}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-bold truncate">{p.pitcherName}</span>
              <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
                {p.team === 'away' ? 'AWAY' : 'HOME'} · {p.total} pitches
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.pitches.slice(0, 6).map((pt) => (
                <div
                  key={pt.pitchType}
                  className="px-2 py-1 rounded bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d text-[10px]"
                  title={pt.pitchName}
                >
                  <span className="font-mono font-black mr-1">{pt.pitchType}</span>
                  <span className="text-arena-muted-l dark:text-arena-muted-d">{pt.count}× ·</span>
                  <span className="font-bold ml-1 arena-tabular">{pt.avgSpeed.toFixed(1)}</span>
                  <span className="text-arena-muted-l dark:text-arena-muted-d ml-0.5">mph</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
