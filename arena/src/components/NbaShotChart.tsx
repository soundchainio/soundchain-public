/**
 * Half-court SVG shot chart.
 *
 * stats.nba.com shot coords are in 0.1-ft units, basket-centered:
 *   locX: -250 to +250  (court is 50 ft wide → ±25 ft from center)
 *   locY:  -50 to ~430  (basket-centered; baseline ≈ -40, half-court line ≈ 430)
 *
 * SVG layout: basket at top (y=50), half-court line at bottom (y=470). Court
 * is 50ft × 47ft = 500 × 470 SVG units. Field-goals are dots; made = arena-red
 * filled, miss = hollow ring. Per-player + per-team filter dropdowns let
 * users isolate the spread.
 *
 * Native-ready: pure SVG, no charting libs, no canvas, scales naturally on
 * Capacitor WebView. Markers are 12px hit-zones for fingers.
 */
import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { NbaShot } from '@/lib/nbaStats'

// Court constants in SVG units (10 SVG = 1 ft)
const COURT_W = 500
const COURT_H = 470
const BASKET_X = 250
const BASKET_Y = 50
const RIM_RADIUS = 7.5      // 1.5 ft diameter rim
const BACKBOARD_HALF = 30   // 6 ft / 2
const RESTRICTED_RADIUS = 40 // 4 ft semicircle
const LANE_HALF = 80        // 16 ft wide / 2 → ±8 ft
const FT_LINE_Y = 240       // 19 ft from baseline = basket+190
const FT_CIRCLE_R = 60      // 6 ft
const ARC_RADIUS = 237.5    // 23.75 ft
const CORNER_3_X = 220      // 22 ft from center
const CORNER_3_Y = 139.5    // y where arc meets corner line in SVG
const HALF_COURT_Y = 470    // 47 ft from basket... but basket at y=50 + 420 = 470 ✓

interface Props {
  shots: NbaShot[]
  awayTricode: string
  homeTricode: string
  awayColor?: string
  homeColor?: string
  isLoading?: boolean
  error?: string
}

export function NbaShotChart({ shots, awayTricode, homeTricode, awayColor, homeColor, isLoading, error }: Props) {
  const [teamFilter, setTeamFilter] = useState<'both' | 'away' | 'home'>('both')
  const [playerFilter, setPlayerFilter] = useState<string>('all')

  const playersInData = useMemo(() => {
    const seen = new Map<string, { id: number; name: string; teamTricode: string }>()
    for (const s of shots) {
      const k = String(s.personId)
      if (!seen.has(k)) seen.set(k, { id: s.personId, name: s.playerName, teamTricode: s.teamTricode })
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [shots])

  const filtered = useMemo(() => {
    return shots.filter((s) => {
      if (teamFilter === 'away' && s.teamTricode.toUpperCase() !== awayTricode.toUpperCase()) return false
      if (teamFilter === 'home' && s.teamTricode.toUpperCase() !== homeTricode.toUpperCase()) return false
      if (playerFilter !== 'all' && String(s.personId) !== playerFilter) return false
      return true
    })
  }, [shots, teamFilter, playerFilter, awayTricode, homeTricode])

  const stats = useMemo(() => {
    const made = filtered.filter((s) => s.shotMade)
    const total = filtered.length
    const pct = total > 0 ? (made.length / total) * 100 : 0
    const threes = filtered.filter((s) => s.shotType.includes('3PT'))
    const threesMade = threes.filter((s) => s.shotMade)
    const twos = filtered.filter((s) => !s.shotType.includes('3PT'))
    const twosMade = twos.filter((s) => s.shotMade)
    return {
      made: made.length,
      total,
      pct,
      threes: { made: threesMade.length, total: threes.length },
      twos: { made: twosMade.length, total: twos.length },
    }
  }, [filtered])

  if (isLoading && shots.length === 0) {
    return <div className="h-[420px] rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface animate-pulse" />
  }
  if (error && shots.length === 0) {
    return (
      <div className="rounded-xl border border-arena-red/30 bg-arena-card dark:bg-arena-surface px-4 py-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-arena-red mt-0.5" />
        <div className="text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d">{error}</div>
      </div>
    )
  }
  if (shots.length === 0) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-4 py-6 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">
        Shot chart populates after first FGA of the game.
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-3">
      {/* Court SVG */}
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
        {/* Filter row */}
        <div className="px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d flex flex-wrap items-center gap-2 bg-arena-paper dark:bg-arena-carbon">
          <div className="flex items-center gap-1">
            {(['both', 'away', 'home'] as const).map((side) => {
              const label = side === 'both' ? 'Both' : side === 'away' ? awayTricode : homeTricode
              const isActive = teamFilter === side
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => setTeamFilter(side)}
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition min-h-[32px] ${
                    isActive
                      ? 'bg-arena-red text-white border-arena-red'
                      : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d text-arena-text-l dark:text-arena-text-d min-h-[32px]"
          >
            <option value="all">All players</option>
            {playersInData
              .filter((p) =>
                teamFilter === 'both' ? true :
                teamFilter === 'away' ? p.teamTricode.toUpperCase() === awayTricode.toUpperCase() :
                p.teamTricode.toUpperCase() === homeTricode.toUpperCase()
              )
              .map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
          </select>
        </div>

        <div className="p-3">
          <svg
            viewBox={`0 0 ${COURT_W} ${COURT_H}`}
            className="w-full h-auto max-h-[600px]"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Half-court shot chart"
          >
            <CourtLines />

            {/* Shots — render misses first so makes paint over them */}
            <g>
              {filtered.filter((s) => !s.shotMade).map((s, i) => {
                const cx = BASKET_X + s.locX
                const cy = BASKET_Y + s.locY
                return (
                  <circle
                    key={`miss-${i}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="none"
                    stroke="#525252"
                    strokeWidth={1.5}
                    opacity={0.55}
                  >
                    <title>{`${s.playerName} · ${s.actionType} · MISS · Q${s.period} ${s.clock}`}</title>
                  </circle>
                )
              })}
              {filtered.filter((s) => s.shotMade).map((s, i) => {
                const cx = BASKET_X + s.locX
                const cy = BASKET_Y + s.locY
                return (
                  <circle
                    key={`make-${i}`}
                    cx={cx}
                    cy={cy}
                    r={5.5}
                    fill="#dc2626"
                    fillOpacity={0.85}
                    stroke="#ffffff"
                    strokeWidth={1}
                  >
                    <title>{`${s.playerName} · ${s.actionType} · MADE · Q${s.period} ${s.clock}`}</title>
                  </circle>
                )
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Splits panel — desktop right column, stacks below on mobile */}
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
        <div className="px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon">
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Shooting splits</span>
        </div>
        <div className="p-3 space-y-3">
          <SplitRow label="FG" made={stats.made} total={stats.total} pct={stats.pct} accent />
          <SplitRow label="3PT" made={stats.threes.made} total={stats.threes.total} pct={stats.threes.total > 0 ? (stats.threes.made / stats.threes.total) * 100 : 0} />
          <SplitRow label="2PT" made={stats.twos.made} total={stats.twos.total} pct={stats.twos.total > 0 ? (stats.twos.made / stats.twos.total) * 100 : 0} />

          {/* By zone */}
          <div className="pt-2 border-t border-arena-border-l/60 dark:border-arena-border-d/60 space-y-1.5">
            <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d mb-1">
              By zone
            </span>
            {Object.entries(zoneSplits(filtered)).map(([zone, z]) => (
              <div key={zone} className="flex items-center justify-between gap-2 text-[11px] arena-tabular">
                <span className="text-arena-muted-l dark:text-arena-muted-d truncate">{zone}</span>
                <span className="font-mono font-bold whitespace-nowrap">
                  {z.made}/{z.total}
                  <span className="ml-1.5 text-arena-red">{z.total > 0 ? `${((z.made / z.total) * 100).toFixed(0)}%` : '—'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CourtLines() {
  const stroke = '#a3a3a3' // arena-muted-d for visibility on both light + dark
  const strokeWidth = 1.5
  return (
    <g fill="none" stroke={stroke} strokeWidth={strokeWidth}>
      {/* Court outer boundary (sidelines + baseline at top + half-court line at bottom) */}
      <rect x={0} y={0} width={COURT_W} height={COURT_H} />

      {/* Backboard */}
      <line
        x1={BASKET_X - BACKBOARD_HALF}
        y1={BASKET_Y - 10}
        x2={BASKET_X + BACKBOARD_HALF}
        y2={BASKET_Y - 10}
        strokeWidth={2}
      />

      {/* Rim */}
      <circle cx={BASKET_X} cy={BASKET_Y} r={RIM_RADIUS} stroke="#dc2626" strokeWidth={1.5} />

      {/* Restricted area — semicircle below basket (towards midcourt) */}
      <path
        d={`M ${BASKET_X - RESTRICTED_RADIUS} ${BASKET_Y} A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 0 0 ${BASKET_X + RESTRICTED_RADIUS} ${BASKET_Y}`}
      />

      {/* Lane (key/paint) */}
      <rect
        x={BASKET_X - LANE_HALF}
        y={BASKET_Y}
        width={LANE_HALF * 2}
        height={FT_LINE_Y - BASKET_Y}
      />

      {/* Free throw line + circle (top half solid, bottom half dashed) */}
      <line x1={BASKET_X - LANE_HALF} y1={FT_LINE_Y} x2={BASKET_X + LANE_HALF} y2={FT_LINE_Y} />
      <path
        d={`M ${BASKET_X - FT_CIRCLE_R} ${FT_LINE_Y} A ${FT_CIRCLE_R} ${FT_CIRCLE_R} 0 0 1 ${BASKET_X + FT_CIRCLE_R} ${FT_LINE_Y}`}
      />
      <path
        d={`M ${BASKET_X - FT_CIRCLE_R} ${FT_LINE_Y} A ${FT_CIRCLE_R} ${FT_CIRCLE_R} 0 0 0 ${BASKET_X + FT_CIRCLE_R} ${FT_LINE_Y}`}
        strokeDasharray="4 3"
      />

      {/* Three-point line: corners (straight lines) + arc */}
      <line x1={BASKET_X - CORNER_3_X} y1={BASKET_Y} x2={BASKET_X - CORNER_3_X} y2={CORNER_3_Y} />
      <line x1={BASKET_X + CORNER_3_X} y1={BASKET_Y} x2={BASKET_X + CORNER_3_X} y2={CORNER_3_Y} />
      <path
        d={`M ${BASKET_X - CORNER_3_X} ${CORNER_3_Y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${BASKET_X + CORNER_3_X} ${CORNER_3_Y}`}
      />

      {/* Half-court arc — small touch, drawn from center half-court line */}
      <path
        d={`M ${BASKET_X - 60} ${HALF_COURT_Y} A 60 60 0 0 0 ${BASKET_X + 60} ${HALF_COURT_Y}`}
      />
    </g>
  )
}

function SplitRow({ label, made, total, pct, accent }: { label: string; made: number; total: number; pct: number; accent?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] arena-tabular">
        <span className={`font-bold ${accent ? 'text-arena-text-l dark:text-arena-text-d' : 'text-arena-muted-l dark:text-arena-muted-d'}`}>{label}</span>
        <span className="font-mono">
          <span className="font-bold">{made}/{total}</span>
          <span className={`ml-2 font-black ${accent ? 'text-arena-red' : ''}`}>{total > 0 ? `${pct.toFixed(1)}%` : '—'}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-arena-paper dark:bg-arena-carbon overflow-hidden">
        <div
          className="h-full bg-arena-red transition-all"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  )
}

function zoneSplits(shots: { shotZone: string; shotMade: boolean }[]): Record<string, { made: number; total: number }> {
  const out: Record<string, { made: number; total: number }> = {}
  for (const s of shots) {
    const zone = s.shotZone || 'Unknown'
    if (!out[zone]) out[zone] = { made: 0, total: 0 }
    out[zone].total += 1
    if (s.shotMade) out[zone].made += 1
  }
  // Sort by total desc, cap at 6 zones
  return Object.fromEntries(
    Object.entries(out)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 6),
  )
}
