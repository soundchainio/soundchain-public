/**
 * Tabbed NBA box score — nba.com-clone density in arena palette.
 *
 * Tabs:  Traditional / Advanced / Tracking / Hustle / Matchups / Shot Chart
 *
 * Mobile: pill row toggles which tab renders (single column).
 * Desktop (≥lg): when user is on Traditional OR Advanced, both render
 *   side-by-side as a 2-col density layout (the nba.com "stats overview"
 *   pattern). Other tabs render full-width since they don't have a paired
 *   sibling.
 *
 * Each tab lazy-fetches its endpoint on first activation, polls every 30s
 * during live games, caches in component state. No pre-fetch on modal open.
 *
 * Native-app-ready: pure HTML tables + a SVG shot chart, no iframes, no
 * sticky-position tab bars (iOS WebView momentum-scroll bug), no charting libs.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Activity, AlertCircle, BarChart3, Crosshair, Hand, Map, Zap } from 'lucide-react'
import type { NbaBoxScoreV3, NbaPlayer, NbaShot, NbaMatchupRow } from '@/lib/nbaStats'
import { PlayerHeadshot } from './PlayerHeadshot'

const NbaShotChart = dynamic(() => import('./NbaShotChart').then((m) => m.NbaShotChart), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface animate-pulse" />,
})

type TabKey = 'traditional' | 'advanced' | 'tracking' | 'hustle' | 'matchups' | 'shotchart'

interface Props {
  espnGameId: string
  gameDateIso: string
  awayTricode: string
  homeTricode: string
  status: 'pre' | 'in' | 'post'
  awayName: string
  homeName: string
  awayLogo?: string
  homeLogo?: string
  awayColor?: string
  homeColor?: string
}

interface TabPill {
  key: TabKey
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const TABS: TabPill[] = [
  { key: 'traditional', label: 'Traditional', Icon: BarChart3 },
  { key: 'advanced', label: 'Advanced', Icon: Activity },
  { key: 'tracking', label: 'Tracking', Icon: Zap },
  { key: 'hustle', label: 'Hustle', Icon: Hand },
  { key: 'matchups', label: 'Matchups', Icon: Crosshair },
  { key: 'shotchart', label: 'Shot Chart', Icon: Map },
]

const POLL_INTERVAL_MS = 30_000

export function NbaBoxScoreTabs(props: Props) {
  const { espnGameId, gameDateIso, awayTricode, homeTricode, status } = props

  const [activeTab, setActiveTab] = useState<TabKey>('traditional')
  const [activeSide, setActiveSide] = useState<'away' | 'home'>('away')

  const [main, setMain] = useState<{ traditional: NbaBoxScoreV3; advanced: NbaBoxScoreV3 } | null>(null)
  const [tracking, setTracking] = useState<NbaBoxScoreV3 | null>(null)
  const [hustle, setHustle] = useState<NbaBoxScoreV3 | null>(null)
  const [matchups, setMatchups] = useState<{ rows: NbaMatchupRow[] } | null>(null)
  const [shotChart, setShotChart] = useState<{ shots: NbaShot[] } | null>(null)

  const [errors, setErrors] = useState<Partial<Record<TabKey, string>>>({})
  const [loading, setLoading] = useState<Partial<Record<TabKey, boolean>>>({})

  // Track which tabs the user has visited so we don't poll dormant tabs.
  const visitedTabs = useRef(new Set<TabKey>(['traditional']))

  const apiBase = useMemo(() => {
    const params = new URLSearchParams({
      date: gameDateIso,
      away: awayTricode,
      home: homeTricode,
      status,
    })
    return params.toString()
  }, [gameDateIso, awayTricode, homeTricode, status])

  // Fetcher for any tab — handles state slot via the tab key
  const fetchTab = useCallback(async (tab: TabKey) => {
    if (status === 'pre') return // no stats before tip-off

    const url = (() => {
      switch (tab) {
        case 'traditional':
        case 'advanced':
          return `/api/nba/boxscore/${espnGameId}?${apiBase}`
        case 'tracking':
          return `/api/nba/boxscore/tracking/${espnGameId}?${apiBase}`
        case 'hustle':
          return `/api/nba/boxscore/hustle/${espnGameId}?${apiBase}`
        case 'matchups':
          return `/api/nba/boxscore/matchups/${espnGameId}?${apiBase}`
        case 'shotchart':
          return `/api/nba/shotchart/${espnGameId}?${apiBase}`
      }
    })()
    if (!url) return

    setLoading((prev) => ({ ...prev, [tab]: true }))
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setErrors((prev) => ({ ...prev, [tab]: undefined }))
      switch (tab) {
        case 'traditional':
        case 'advanced':
          // /api/nba/boxscore returns BOTH (one round-trip); fill both slots
          setMain({ traditional: data.traditional, advanced: data.advanced })
          break
        case 'tracking':
          setTracking(data.tracking)
          break
        case 'hustle':
          setHustle(data.hustle)
          break
        case 'matchups':
          setMatchups({ rows: data.matchups?.rows ?? [] })
          break
        case 'shotchart':
          setShotChart({ shots: data.shotChart?.shots ?? [] })
          break
      }
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [tab]: err?.message ?? 'Stats unavailable' }))
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }))
    }
  }, [espnGameId, apiBase, status])

  // First-load: traditional+advanced come together via the main endpoint
  useEffect(() => {
    fetchTab('traditional')
  }, [fetchTab])

  // On tab switch: lazy-fetch if not yet loaded; mark as visited so the poll
  // loop will refresh it during live games
  useEffect(() => {
    visitedTabs.current.add(activeTab)
    const isLoaded =
      activeTab === 'traditional' || activeTab === 'advanced'
        ? main !== null
        : activeTab === 'tracking' ? tracking !== null
        : activeTab === 'hustle' ? hustle !== null
        : activeTab === 'matchups' ? matchups !== null
        : shotChart !== null
    if (!isLoaded && !loading[activeTab]) {
      fetchTab(activeTab)
    }
    // intentionally only re-run when activeTab changes — visited tabs polled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Live polling: refresh ALL visited tabs every 30s during live games
  useEffect(() => {
    if (status !== 'in') return
    const id = setInterval(() => {
      visitedTabs.current.forEach((t) => { fetchTab(t) })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [status, fetchTab])

  const teamSideForBox = (box: NbaBoxScoreV3 | null) =>
    !box ? null : (activeSide === 'away' ? box.awayTeam : box.homeTeam)

  return (
    <div className="space-y-3">
      {/* Tab pills — horizontally scrollable on mobile, full row on desktop */}
      <div
        className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition min-h-[36px] ${
                isActive
                  ? 'bg-arena-red text-white border-arena-red shadow-sm'
                  : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
              }`}
            >
              <tab.Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Team toggle — applies to all tabs except Matchups (which is symmetric)
          and Shot Chart (which has its own per-team filter) */}
      {activeTab !== 'matchups' && activeTab !== 'shotchart' && (
        <TeamToggle
          activeSide={activeSide}
          onChange={setActiveSide}
          awayTricode={awayTricode}
          homeTricode={homeTricode}
          awayLogo={props.awayLogo}
          homeLogo={props.homeLogo}
        />
      )}

      {/* Tab body */}
      <div>
        {activeTab === 'traditional' || activeTab === 'advanced' ? (
          <TraditionalAdvancedView
            main={main}
            activeSide={activeSide}
            activeTab={activeTab}
            isLoading={loading.traditional || loading.advanced}
            error={errors.traditional || errors.advanced}
          />
        ) : activeTab === 'tracking' ? (
          <PlayerStatTable
            team={teamSideForBox(tracking)}
            columns={TRACKING_COLS}
            isLoading={loading.tracking}
            error={errors.tracking}
            emptyHint="Tracking data populates ~every 60s during games"
          />
        ) : activeTab === 'hustle' ? (
          <PlayerStatTable
            team={teamSideForBox(hustle)}
            columns={HUSTLE_COLS}
            isLoading={loading.hustle}
            error={errors.hustle}
            emptyHint="Hustle stats post live but slowly"
          />
        ) : activeTab === 'matchups' ? (
          <MatchupsTable
            rows={matchups?.rows ?? []}
            isLoading={loading.matchups}
            error={errors.matchups}
          />
        ) : (
          <NbaShotChart
            shots={shotChart?.shots ?? []}
            awayTricode={awayTricode}
            homeTricode={homeTricode}
            awayColor={props.awayColor}
            homeColor={props.homeColor}
            isLoading={loading.shotchart}
            error={errors.shotchart}
          />
        )}
      </div>

      {status === 'pre' && (
        <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-4 py-6 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">
          Box score will populate after tip-off
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function TeamToggle({
  activeSide,
  onChange,
  awayTricode,
  homeTricode,
  awayLogo,
  homeLogo,
}: {
  activeSide: 'away' | 'home'
  onChange: (side: 'away' | 'home') => void
  awayTricode: string
  homeTricode: string
  awayLogo?: string
  homeLogo?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-1.5">
      {(['away', 'home'] as const).map((side) => {
        const tricode = side === 'away' ? awayTricode : homeTricode
        const logo = side === 'away' ? awayLogo : homeLogo
        const isActive = side === activeSide
        return (
          <button
            key={side}
            type="button"
            onClick={() => onChange(side)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition min-h-[44px] ${
              isActive
                ? 'bg-arena-red text-white shadow-sm'
                : 'text-arena-muted-l dark:text-arena-muted-d hover:bg-arena-paper dark:hover:bg-arena-carbon'
            }`}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={tricode}
                className="w-5 h-5 object-contain flex-shrink-0"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            ) : null}
            <span className="text-xs font-black tracking-wide">{tricode}</span>
            <span className="text-[10px] font-mono uppercase opacity-70 hidden sm:inline">
              {side === 'away' ? 'Away' : 'Home'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Side-by-side Traditional + Advanced on lg:, single-column toggle on mobile.
 *  This is the "macro density" tab — same pattern nba.com uses on desktop. */
function TraditionalAdvancedView({
  main,
  activeSide,
  activeTab,
  isLoading,
  error,
}: {
  main: { traditional: NbaBoxScoreV3; advanced: NbaBoxScoreV3 } | null
  activeSide: 'away' | 'home'
  activeTab: 'traditional' | 'advanced'
  isLoading?: boolean
  error?: string
}) {
  if (isLoading && !main) return <SkeletonTable />
  if (error && !main) return <ErrorBox message={error} />
  if (!main) return null

  const tradTeam = activeSide === 'away' ? main.traditional.awayTeam : main.traditional.homeTeam
  const advTeam = activeSide === 'away' ? main.advanced.awayTeam : main.advanced.homeTeam

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      {/* Mobile: only the active tab renders. lg+: both render side-by-side. */}
      <div className={activeTab === 'traditional' ? 'block' : 'hidden lg:block'}>
        <PlayerStatTable team={tradTeam} columns={TRADITIONAL_COLS} sectionLabel="Traditional" />
      </div>
      <div className={activeTab === 'advanced' ? 'block' : 'hidden lg:block'}>
        <PlayerStatTable team={advTeam} columns={ADVANCED_COLS} sectionLabel="Advanced" />
      </div>
    </div>
  )
}

interface StatColumn {
  label: string
  key: string                  // key into player.statistics
  format?: 'int' | 'pct' | 'min' | 'made-att' | 'rate' | 'plusMinus'
  // For 'made-att' style cells, supply the made + attempted keys
  madeKey?: string
  attemptedKey?: string
  // Width hint — short labels get compact, long labels (eFG%/USG%) get more
  width?: 'narrow' | 'normal' | 'wide'
}

const TRADITIONAL_COLS: StatColumn[] = [
  { label: 'MIN', key: '__minutes', format: 'min' },
  { label: 'FG', key: 'fieldGoals', format: 'made-att', madeKey: 'fieldGoalsMade', attemptedKey: 'fieldGoalsAttempted' },
  { label: '3P', key: 'threePointers', format: 'made-att', madeKey: 'threePointersMade', attemptedKey: 'threePointersAttempted' },
  { label: 'FT', key: 'freeThrows', format: 'made-att', madeKey: 'freeThrowsMade', attemptedKey: 'freeThrowsAttempted' },
  { label: 'OR', key: 'reboundsOffensive', format: 'int' },
  { label: 'DR', key: 'reboundsDefensive', format: 'int' },
  { label: 'REB', key: 'reboundsTotal', format: 'int' },
  { label: 'AST', key: 'assists', format: 'int' },
  { label: 'STL', key: 'steals', format: 'int' },
  { label: 'BLK', key: 'blocks', format: 'int' },
  { label: 'TO', key: 'turnovers', format: 'int' },
  { label: 'PF', key: 'foulsPersonal', format: 'int' },
  { label: '+/-', key: 'plusMinusPoints', format: 'plusMinus' },
  { label: 'PTS', key: 'points', format: 'int' },
]

const ADVANCED_COLS: StatColumn[] = [
  { label: 'MIN', key: '__minutes', format: 'min' },
  { label: 'OffRtg', key: 'offensiveRating', format: 'rate', width: 'normal' },
  { label: 'DefRtg', key: 'defensiveRating', format: 'rate', width: 'normal' },
  { label: 'NetRtg', key: 'netRating', format: 'rate', width: 'normal' },
  { label: 'AST%', key: 'assistPercentage', format: 'pct' },
  { label: 'AST/TO', key: 'assistToTurnover', format: 'rate' },
  { label: 'OREB%', key: 'offensiveReboundPercentage', format: 'pct' },
  { label: 'DREB%', key: 'defensiveReboundPercentage', format: 'pct' },
  { label: 'TS%', key: 'trueShootingPercentage', format: 'pct' },
  { label: 'eFG%', key: 'effectiveFieldGoalPercentage', format: 'pct' },
  { label: 'USG%', key: 'usagePercentage', format: 'pct' },
  { label: 'PIE', key: 'pIE', format: 'pct' },
]

const TRACKING_COLS: StatColumn[] = [
  { label: 'MIN', key: '__minutes', format: 'min' },
  { label: 'SPD', key: 'speed', format: 'rate' },
  { label: 'DIST', key: 'distance', format: 'rate' },
  { label: 'TCH', key: 'touches', format: 'int' },
  { label: 'PASS', key: 'passes', format: 'int' },
  { label: 'AST', key: 'assists', format: 'int' },
  { label: 'sAST', key: 'secondaryAssists', format: 'int' },
  { label: 'ftAST', key: 'freeThrowAssists', format: 'int' },
  { label: 'C-FG', key: 'contestedFieldGoals', format: 'made-att', madeKey: 'contestedFieldGoalsMade', attemptedKey: 'contestedFieldGoalsAttempted' },
  { label: 'U-FG', key: 'uncontestedFieldGoals', format: 'made-att', madeKey: 'uncontestedFieldGoalsMade', attemptedKey: 'uncontestedFieldGoalsAttempted' },
  { label: 'D@RIM', key: 'defendedAtRimFieldGoals', format: 'made-att', madeKey: 'defendedAtRimFieldGoalsMade', attemptedKey: 'defendedAtRimFieldGoalsAttempted' },
]

const HUSTLE_COLS: StatColumn[] = [
  { label: 'MIN', key: '__minutes', format: 'min' },
  { label: 'CONT', key: 'contestedShots', format: 'int' },
  { label: 'DEFL', key: 'deflections', format: 'int' },
  { label: 'CHRG', key: 'chargesDrawn', format: 'int' },
  { label: 'sAST', key: 'screenAssists', format: 'int' },
  { label: 'sAST PTS', key: 'screenAssistPoints', format: 'int' },
  { label: 'LB OFF', key: 'looseBallsRecoveredOffensive', format: 'int' },
  { label: 'LB DEF', key: 'looseBallsRecoveredDefensive', format: 'int' },
  { label: 'BO', key: 'boxOuts', format: 'int' },
]

function PlayerStatTable({
  team,
  columns,
  sectionLabel,
  isLoading,
  error,
  emptyHint,
}: {
  team: NbaBoxScoreV3['homeTeam'] | null
  columns: StatColumn[]
  sectionLabel?: string
  isLoading?: boolean
  error?: string
  emptyHint?: string
}) {
  if (isLoading && !team) return <SkeletonTable />
  if (error && !team) return <ErrorBox message={error} />
  if (!team) return null

  // Filter out DNPs to a separate section
  const playing = team.players.filter((p) => p.minutes && p.minutes !== '0:00' && !/dnp|did not play|inactive/i.test(p.comment))
  const dnp = team.players.filter((p) => !playing.includes(p))

  if (playing.length === 0 && dnp.length === 0) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-4 py-4 text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
        {team.teamTricode || team.teamName} · {emptyHint || 'stats not available yet'}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      {/* Section label / team header */}
      <div className="px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between gap-2 bg-arena-paper dark:bg-arena-carbon">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black tracking-wide">{team.teamTricode}</span>
          <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate hidden sm:inline">
            {team.teamCity} {team.teamName}
          </span>
        </div>
        {sectionLabel && (
          <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-arena-muted-l dark:text-arena-muted-d">
            {sectionLabel}
          </span>
        )}
      </div>

      {/* Stat table — horizontally scrollable, sticky player col */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full min-w-max text-[11px] arena-tabular">
          <thead>
            <tr className="border-b border-arena-border-l dark:border-arena-border-d">
              <th className="text-left px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d sticky left-0 bg-arena-card dark:bg-arena-surface z-[1]">
                Player
              </th>
              {columns.map((c) => (
                <th
                  key={c.label}
                  className="px-1.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d text-center whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {playing.length > 0 && (
              <Fragment>
                {playing.map((p) => (
                  <PlayerRow key={p.personId || p.nameI} player={p} columns={columns} teamColor={team.teamSlug} />
                ))}
              </Fragment>
            )}
            {dnp.length > 0 && (
              <Fragment>
                <tr className="bg-arena-paper/60 dark:bg-arena-carbon/60">
                  <td colSpan={columns.length + 1} className="px-3 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d">
                    Did not play
                  </td>
                </tr>
                {dnp.map((p) => (
                  <tr key={p.personId || p.nameI} className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0">
                    <td className="px-3 py-1.5 sticky left-0 bg-arena-card dark:bg-arena-surface z-[1]">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <PlayerHeadshot src={undefined} name={p.nameI || `${p.firstName} ${p.familyName}`} size={24} />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate leading-tight">
                            {p.nameI || `${p.firstName} ${p.familyName}`}
                          </div>
                          {p.position && (
                            <div className="text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">
                              {p.position}{p.jerseyNum && ` · #${p.jerseyNum}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td colSpan={columns.length} className="px-3 py-1.5 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d italic">
                      {p.comment || 'Did not play'}
                    </td>
                  </tr>
                ))}
              </Fragment>
            )}
            {/* Team totals */}
            {team.statistics && Object.keys(team.statistics).length > 0 && (
              <tr className="bg-arena-paper/80 dark:bg-arena-carbon/80 border-t-2 border-arena-border-l dark:border-arena-border-d">
                <td className="px-3 py-2 sticky left-0 bg-arena-paper/80 dark:bg-arena-carbon/80 z-[1]">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Team</span>
                </td>
                {columns.map((c) => (
                  <td key={c.label} className="px-1.5 py-2 text-center font-mono text-[11px] font-black">
                    {formatTeamCell(team.statistics, c)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlayerRow({ player, columns, teamColor }: { player: NbaPlayer; columns: StatColumn[]; teamColor?: string }) {
  return (
    <tr className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0">
      <td className="px-3 py-1.5 sticky left-0 bg-arena-card dark:bg-arena-surface z-[1]">
        <div className="flex items-center gap-2 min-w-[140px]">
          <PlayerHeadshot
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.personId}.png`}
            name={player.nameI || `${player.firstName} ${player.familyName}`}
            size={24}
            ringColor={teamColor}
          />
          <div className="min-w-0">
            <div className="text-[11px] font-bold truncate leading-tight">
              {player.nameI || `${player.firstName} ${player.familyName}`}
            </div>
            {(player.position || player.jerseyNum) && (
              <div className="text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">
                {player.position}{player.jerseyNum && ` · #${player.jerseyNum}`}
              </div>
            )}
          </div>
        </div>
      </td>
      {columns.map((c) => (
        <td key={c.label} className="px-1.5 py-1.5 text-center font-mono">
          {formatPlayerCell(player, c)}
        </td>
      ))}
    </tr>
  )
}

function MatchupsTable({ rows, isLoading, error }: { rows: NbaMatchupRow[]; isLoading?: boolean; error?: string }) {
  if (isLoading && rows.length === 0) return <SkeletonTable />
  if (error && rows.length === 0) return <ErrorBox message={error} />

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-4 py-6 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">
        Player-on-player matchup splits typically populate post-game.
      </div>
    )
  }

  // Sort by matchup minutes descending so the heaviest matchups bubble up
  const sorted = [...rows].sort((a, b) => parseClockSeconds(b.matchupMinutes) - parseClockSeconds(a.matchupMinutes))

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full min-w-max text-[11px] arena-tabular">
          <thead>
            <tr className="border-b border-arena-border-l dark:border-arena-border-d">
              {[
                'Defender',
                'Offense',
                'MIN',
                'POSS',
                'PTS',
                'FG',
                '3P',
                'FT',
                'AST',
                'TO',
                'BLK',
                'PF',
              ].map((h) => (
                <th
                  key={h}
                  className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d text-center whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 50).map((row, i) => (
              <tr
                key={`${row.defensivePlayerId}-${row.offensivePlayerId}-${i}`}
                className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0"
              >
                <td className="px-2 py-1.5 font-bold text-left whitespace-nowrap">{row.defensivePlayerName}</td>
                <td className="px-2 py-1.5 text-left whitespace-nowrap">{row.offensivePlayerName}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.matchupMinutes}</td>
                <td className="px-2 py-1.5 text-center font-mono">{formatRate(row.partialPossessions)}</td>
                <td className="px-2 py-1.5 text-center font-mono font-black text-arena-red">{row.playerPoints}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.matchupFieldGoalsMade}-{row.matchupFieldGoalsAttempted}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.matchupThreePointersMade}-{row.matchupThreePointersAttempted}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.matchupFreeThrowsMade}-{row.matchupFreeThrowsAttempted}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.matchupAssists}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.matchupTurnovers}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.blocks}</td>
                <td className="px-2 py-1.5 text-center font-mono">{row.shootingFouls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Cell formatters ────────────────────────────────────────────────────────

function formatPlayerCell(player: NbaPlayer, c: StatColumn): string {
  if (c.key === '__minutes') return formatMinutes(player.minutes)
  const stats = player.statistics ?? {}
  switch (c.format) {
    case 'pct':
      return formatPct(stats[c.key])
    case 'rate':
      return formatRate(stats[c.key])
    case 'plusMinus':
      return formatPlusMinus(stats[c.key])
    case 'made-att':
      return `${num(stats[c.madeKey ?? '']) || 0}-${num(stats[c.attemptedKey ?? '']) || 0}`
    case 'int':
    default:
      return String(num(stats[c.key]) || 0)
  }
}

function formatTeamCell(stats: Record<string, any>, c: StatColumn): string {
  if (c.key === '__minutes') return '—'
  switch (c.format) {
    case 'pct':
      return formatPct(stats[c.key])
    case 'rate':
      return formatRate(stats[c.key])
    case 'made-att':
      return `${num(stats[c.madeKey ?? '']) || 0}-${num(stats[c.attemptedKey ?? '']) || 0}`
    case 'plusMinus':
    case 'int':
    default:
      return String(num(stats[c.key]) || 0)
  }
}

function formatMinutes(min: string): string {
  if (!min) return '—'
  // V3 returns "PT26M44.00S" (ISO duration) or "26:44" depending on endpoint
  if (min.startsWith('PT')) {
    const m = /PT(\d+)M([\d.]+)S/.exec(min)
    if (m) return `${m[1]}:${String(Math.floor(Number(m[2]))).padStart(2, '0')}`
  }
  return min
}

function formatPct(v: any): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  // V3 endpoints sometimes return as 0-1 fraction, sometimes as 0-100
  const pct = n > 0 && n <= 1 ? n * 100 : n
  return `${pct.toFixed(1)}`
}

function formatRate(v: any): string {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return '—'
  return n.toFixed(1)
}

function formatPlusMinus(v: any): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n > 0 ? `+${n}` : String(n)
}

function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function parseClockSeconds(mmss: string): number {
  const [m, s] = String(mmss ?? '').split(':')
  return Number(m) * 60 + Number(s || 0)
}

// ─── Skeleton + error helpers ───────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-7 rounded bg-arena-paper dark:bg-arena-carbon animate-pulse" />
      ))}
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-arena-red/30 bg-arena-card dark:bg-arena-surface px-4 py-4 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-arena-red mt-0.5" />
      <div className="text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d">
        {message || 'Stats temporarily unavailable. Will retry on next poll.'}
      </div>
    </div>
  )
}
