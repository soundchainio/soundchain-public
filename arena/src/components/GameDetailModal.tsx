import { Fragment, useEffect, useMemo, useState } from 'react'
import { X, Play } from 'lucide-react'
import {
  fetchGameSummary,
  type EspnBoxscoreCategory,
  type EspnGame,
  type EspnGameSummary,
  type SportKey,
} from '@/lib/espn'
import { buildEmbedUrl, relativeAgo, type YouTubeVideo } from '@/lib/youtube'
import { PlayerHeadshot } from './PlayerHeadshot'
import { HighlightModal } from './HighlightModal'
import { GameChat } from './GameChat'

interface Props {
  sport: SportKey
  game: EspnGame
  onClose: () => void
}

export function GameDetailModal({ sport, game, onClose }: Props) {
  const [summary, setSummary] = useState<EspnGameSummary | null>(null)
  const [summaryLoaded, setSummaryLoaded] = useState(false)
  const [summaryErr, setSummaryErr] = useState<string | null>(null)

  // Polls every 30s while live, otherwise loads once.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const s = await fetchGameSummary(sport, game.id)
        if (!cancelled) {
          setSummary(s)
          setSummaryLoaded(true)
          setSummaryErr(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setSummaryErr(e?.message ?? 'Game details unavailable')
          setSummaryLoaded(true)
        }
      }
    }
    load()
    const isLive = game.status.state === 'in'
    const id = isLive ? setInterval(load, 30_000) : null
    return () => {
      cancelled = true
      if (id) clearInterval(id)
    }
  }, [sport, game.id, game.status.state])

  // Esc closes; body scroll lock with proper restore.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const headerGame = summary?.game ?? game
  const home = headerGame.competitors.find((c) => c.homeAway === 'home')
  const away = headerGame.competitors.find((c) => c.homeAway === 'away')

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end sm:items-stretch sm:justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${away?.displayName ?? 'Away'} at ${home?.displayName ?? 'Home'} — game details`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[520px] sm:h-full bg-arena-paper dark:bg-arena-carbon text-arena-fg-l dark:text-arena-fg-d border-t sm:border-t-0 sm:border-l border-arena-border-l dark:border-arena-border-d rounded-t-2xl sm:rounded-none max-h-[92vh] sm:max-h-none flex flex-col shadow-2xl"
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 bg-arena-paper/95 dark:bg-arena-carbon/95 backdrop-blur border-b border-arena-border-l dark:border-arena-border-d">
          {/* Mobile drag affordance */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <span className="block w-10 h-1 rounded-full bg-arena-border-l dark:bg-arena-border-d" />
          </div>
          <div className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <ScoreLine away={away} home={home} game={headerGame} />
              <StateLine game={headerGame} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-7">
          {!summaryLoaded && <SkeletonBody />}

          {summaryLoaded && summary && (
            <>
              {summary.linescores.length > 0 && (
                <Section title="Scoring by period">
                  <LinescoreTable summary={summary} />
                </Section>
              )}

              <Section title="Fan chat · live takes">
                <GameChat
                  gameId={game.id}
                  sport={sport}
                  awayLabel={away?.abbr}
                  homeLabel={home?.abbr}
                />
              </Section>

              <Section title="Game highlights">
                <GameHighlights sport={sport} game={headerGame} />
              </Section>

              {summary.leaders.length > 0 && (
                <Section title="Game leaders">
                  <LeadersList sport={sport} summary={summary} />
                </Section>
              )}

              {summary.boxscoreTeams.length === 2 && summary.boxscoreTeams[0].stats.length > 0 && (
                <Section title="Team stats">
                  <TeamStatsCompare summary={summary} />
                </Section>
              )}

              {summary.boxscorePlayers.length > 0 && (
                <Section title="Box score">
                  <BoxscorePlayersList categories={summary.boxscorePlayers} sport={sport} />
                </Section>
              )}

              {summary.scoringPlays.length > 0 && (
                <Section title="Scoring plays">
                  <ScoringPlaysList summary={summary} />
                </Section>
              )}

              {summary.article && summary.article.headline && (
                <Section title="Recap">
                  <article className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-4">
                    <h4 className="text-sm font-black mb-1.5 leading-snug">{summary.article.headline}</h4>
                    {summary.article.description && (
                      <p className="text-xs text-arena-muted-l dark:text-arena-muted-d leading-relaxed">
                        {summary.article.description}
                      </p>
                    )}
                  </article>
                </Section>
              )}
            </>
          )}

          {summaryLoaded && !summary && (
            <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-6">
              <p className="text-sm text-arena-muted-l dark:text-arena-muted-d text-center">
                {summaryErr ?? 'Game details unavailable. Try again in a moment.'}
              </p>
              {/* Chat + highlights stay live even when ESPN summary is down */}
              <div className="mt-5 text-left space-y-7">
                <Section title="Fan chat · live takes">
                  <GameChat
                    gameId={game.id}
                    sport={sport}
                    awayLabel={away?.abbr}
                    homeLabel={home?.abbr}
                  />
                </Section>
                <Section title="League highlights">
                  <GameHighlights sport={sport} game={headerGame} />
                </Section>
              </div>
            </div>
          )}

          <div className="text-center text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d pt-2 pb-6">
            Stats: ESPN · Highlights: official YouTube · Auto-refresh during live games.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subsections ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2.5">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ScoreLine({
  away,
  home,
  game,
}: {
  away: EspnGame['competitors'][number] | undefined
  home: EspnGame['competitors'][number] | undefined
  game: EspnGame
}) {
  const completed = game.status.state === 'post'
  const inProgress = game.status.state === 'in'
  const homeScore = Number(home?.score) || 0
  const awayScore = Number(away?.score) || 0
  return (
    <div className="space-y-1">
      <TeamScoreRow team={away} leading={(inProgress || completed) && awayScore > homeScore} loser={completed && awayScore < homeScore} />
      <TeamScoreRow team={home} leading={(inProgress || completed) && homeScore > awayScore} loser={completed && homeScore < awayScore} />
    </div>
  )
}

function TeamScoreRow({
  team,
  leading,
  loser,
}: {
  team: EspnGame['competitors'][number] | undefined
  leading: boolean
  loser: boolean
}) {
  if (!team) return null
  return (
    <div className={`flex items-center justify-between gap-3 ${loser ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt={team.abbr} className="w-7 h-7 object-contain flex-shrink-0" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        ) : (
          <span className="w-7 h-7 rounded-full bg-arena-border-l dark:bg-arena-border-d flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {team.abbr.slice(0, 3)}
          </span>
        )}
        <span className="text-base font-black truncate">{team.abbr}</span>
        <span className="hidden sm:inline text-[11px] text-arena-muted-l dark:text-arena-muted-d truncate">
          {team.displayName}
        </span>
        {team.record && (
          <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">({team.record})</span>
        )}
      </div>
      <span className={`text-2xl font-black arena-tabular ${leading ? 'text-arena-red' : ''}`}>{team.score}</span>
    </div>
  )
}

function StateLine({ game }: { game: EspnGame }) {
  const state = game.status.state
  if (state === 'in') {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-arena-red">
        <span className="arena-live-dot" />
        LIVE · {game.status.detail || game.status.description}
        {game.broadcasts && game.broadcasts.length > 0 && (
          <span className="ml-1 text-arena-muted-l dark:text-arena-muted-d font-mono">
            · {game.broadcasts.slice(0, 2).join(' · ')}
          </span>
        )}
      </div>
    )
  }
  if (state === 'post') {
    return (
      <div className="mt-1.5 text-[11px] font-bold tracking-wider text-arena-muted-l dark:text-arena-muted-d">
        FINAL{game.status.detail?.includes('OT') ? ' / OT' : ''}
        {game.venue && <span className="ml-2 font-mono opacity-70">{game.venue}</span>}
      </div>
    )
  }
  const date = new Date(game.date)
  const time = isNaN(date.getTime()) ? '' : date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return (
    <div className="mt-1.5 text-[11px] font-bold tracking-wider text-arena-orange">
      {time}
      {game.venue && <span className="ml-2 text-arena-muted-l dark:text-arena-muted-d font-mono opacity-70">· {game.venue}</span>}
    </div>
  )
}

function SkeletonBody() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d animate-pulse" />
      ))}
    </div>
  )
}

function LinescoreTable({ summary }: { summary: EspnGameSummary }) {
  const away = summary.game.competitors.find((c) => c.homeAway === 'away')
  const home = summary.game.competitors.find((c) => c.homeAway === 'home')
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <table className="w-full text-xs arena-tabular">
        <thead>
          <tr className="border-b border-arena-border-l dark:border-arena-border-d">
            <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">Team</th>
            {summary.linescores.map((p) => (
              <th key={p.period} className="px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d text-center">
                {p.label}
              </th>
            ))}
            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d text-right">T</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-arena-border-l/60 dark:border-arena-border-d/60">
            <td className="px-3 py-2 font-bold">{away?.abbr ?? 'AWY'}</td>
            {summary.linescores.map((p) => (
              <td key={p.period} className="px-2 py-2 text-center">{p.away}</td>
            ))}
            <td className="px-3 py-2 text-right font-black">{away?.score ?? '0'}</td>
          </tr>
          <tr>
            <td className="px-3 py-2 font-bold">{home?.abbr ?? 'HME'}</td>
            {summary.linescores.map((p) => (
              <td key={p.period} className="px-2 py-2 text-center">{p.home}</td>
            ))}
            <td className="px-3 py-2 text-right font-black">{home?.score ?? '0'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function LeadersList({ sport, summary }: { sport: SportKey; summary: EspnGameSummary }) {
  void sport
  return (
    <div className="space-y-2.5">
      {summary.leaders.map((row) => (
        <div
          key={row.category}
          className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.25em]">{row.categoryDisplay}</span>
            <span className="text-[10px] font-mono tracking-wider text-arena-muted-l dark:text-arena-muted-d">{row.abbr}</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-arena-border-l dark:divide-arena-border-d">
            {(['away', 'home'] as const).map((side) => {
              const slot = row[side]
              return (
                <div key={side} className="p-2.5 flex items-center gap-2.5 min-w-0">
                  {slot ? (
                    <>
                      <PlayerHeadshot
                        src={slot.athlete.headshotUrl}
                        name={slot.athlete.fullName}
                        size={36}
                        ringColor={slot.athlete.team?.color}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{slot.athlete.fullName}</div>
                        <div className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">
                          {slot.athlete.team?.abbr}
                          {slot.athlete.position && ` · ${slot.athlete.position}`}
                        </div>
                      </div>
                      <span className="text-base font-black text-arena-red arena-tabular">{slot.displayValue}</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-arena-muted-l dark:text-arena-muted-d font-mono">—</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamStatsCompare({ summary }: { summary: EspnGameSummary }) {
  const away = summary.boxscoreTeams.find((t) => t.homeAway === 'away')
  const home = summary.boxscoreTeams.find((t) => t.homeAway === 'home')
  if (!away || !home) return null

  // Pair stats by label (ESPN orders them consistently per sport)
  const homeByLabel = new Map(home.stats.map((s) => [s.label, s.displayValue]))
  const rows = away.stats.map((s) => ({
    label: s.label,
    displayName: s.displayName,
    away: s.displayValue,
    home: homeByLabel.get(s.label) ?? '—',
  }))

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d">
        <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">{away.team.abbr}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d px-2">stat</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d text-right">{home.team.abbr}</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 border-b border-arena-border-l/60 dark:border-arena-border-d/60 last:border-b-0 text-xs arena-tabular"
        >
          <span className="font-bold">{r.away}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d px-2 text-center whitespace-nowrap">
            {r.displayName || r.label}
          </span>
          <span className="font-bold text-right">{r.home}</span>
        </div>
      ))}
    </div>
  )
}

function ScoringPlaysList({ summary }: { summary: EspnGameSummary }) {
  return (
    <ol className="space-y-1.5">
      {summary.scoringPlays.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-3 py-2 flex items-start gap-3"
        >
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
            style={{
              backgroundColor: p.teamColor ? `#${p.teamColor}22` : 'transparent',
              color: p.teamColor ? `#${p.teamColor}` : undefined,
              border: '1px solid currentColor',
            }}
          >
            {p.teamAbbr ?? '—'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-snug">{p.text}</p>
            <p className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d mt-0.5">
              P{p.period}
              {p.clock ? ` · ${p.clock}` : ''}
              {typeof p.awayScore === 'number' && typeof p.homeScore === 'number' && (
                <span className="ml-1">· {p.awayScore}–{p.homeScore}</span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ─── Player-by-player box score ──────────────────────────────────────────

function BoxscorePlayersList({
  categories,
  sport,
}: {
  categories: EspnBoxscoreCategory[]
  sport: SportKey
}) {
  void sport
  const [activeIdx, setActiveIdx] = useState(0)
  const cat = categories[activeIdx] ?? categories[0]
  if (!cat) return null

  // Multi-category sports (NFL: passing/rushing/receiving/defensive, MLB: batting/pitching).
  // Single-category sports (NBA/NHL/WNBA) just render the one block.
  const showTabs = categories.length > 1

  return (
    <div className="space-y-3">
      {showTabs && (
        <div
          className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition ${
                i === activeIdx
                  ? 'bg-arena-red text-white border-arena-red'
                  : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
              }`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}

      <BoxscoreTeamTable
        team={cat.awayTeam}
        players={cat.awayPlayers}
        labels={cat.labels}
      />
      <BoxscoreTeamTable
        team={cat.homeTeam}
        players={cat.homePlayers}
        labels={cat.labels}
      />
    </div>
  )
}

function BoxscoreTeamTable({
  team,
  players,
  labels,
}: {
  team: EspnBoxscoreCategory['awayTeam']
  players: EspnBoxscoreCategory['awayPlayers']
  labels: string[]
}) {
  if (players.length === 0 || labels.length === 0) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-4 py-4 text-[11px] font-mono text-arena-muted-l dark:text-arena-muted-d text-center">
        {team.abbr || team.displayName} · stats not available yet
      </div>
    )
  }
  // Split starters from bench/DNP for readability (NBA-style).
  const starters = players.filter((p) => p.starter && !p.didNotPlay)
  const bench = players.filter((p) => !p.starter && !p.didNotPlay)
  const dnp = players.filter((p) => p.didNotPlay)
  const groups: { label: string; rows: typeof players }[] = []
  if (starters.length > 0) groups.push({ label: 'Starters', rows: starters })
  if (bench.length > 0) groups.push({ label: 'Bench', rows: bench })
  if (dnp.length > 0) groups.push({ label: 'DNP', rows: dnp })
  // If neither starter flag is set (some sports don't mark them), just dump all.
  if (groups.length === 0) groups.push({ label: '', rows: players })

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      {/* Team header */}
      <div className="px-3 py-2 border-b border-arena-border-l dark:border-arena-border-d flex items-center gap-2 bg-arena-paper dark:bg-arena-carbon">
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt={team.abbr}
            className="w-6 h-6 object-contain"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        ) : (
          <span className="w-6 h-6 rounded-full bg-arena-border-l dark:bg-arena-border-d flex items-center justify-center text-[9px] font-bold">
            {team.abbr.slice(0, 3)}
          </span>
        )}
        <span className="text-xs font-black tracking-wide">{team.abbr}</span>
        <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d hidden sm:inline truncate">
          {team.displayName}
        </span>
      </div>

      {/* Horizontally scrollable stat table */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full min-w-max text-[11px] arena-tabular">
          <thead>
            <tr className="border-b border-arena-border-l dark:border-arena-border-d">
              <th className="text-left px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d sticky left-0 bg-arena-card dark:bg-arena-surface z-[1]">
                Player
              </th>
              {labels.map((label, i) => (
                <th
                  key={`${label}-${i}`}
                  className="px-1.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d text-center"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <Fragment key={`${group.label}-${gi}`}>
                {group.label && (
                  <tr className="bg-arena-paper/60 dark:bg-arena-carbon/60">
                    <td
                      colSpan={labels.length + 1}
                      className="px-3 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-arena-muted-l dark:text-arena-muted-d"
                    >
                      {group.label}
                    </td>
                  </tr>
                )}
                {group.rows.map((p) => (
                  <tr
                    key={p.athlete.id || p.athlete.fullName}
                    className="border-b border-arena-border-l/50 dark:border-arena-border-d/50 last:border-b-0"
                  >
                    <td className="px-3 py-1.5 sticky left-0 bg-arena-card dark:bg-arena-surface z-[1]">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <PlayerHeadshot
                          src={p.athlete.headshotUrl}
                          name={p.athlete.fullName}
                          size={24}
                          ringColor={team.color}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate leading-tight">
                            {p.athlete.fullName || '—'}
                          </div>
                          {(p.athlete.position || p.athlete.jersey) && (
                            <div className="text-[9px] font-mono text-arena-muted-l dark:text-arena-muted-d truncate">
                              {p.athlete.position}
                              {p.athlete.jersey && ` · #${p.athlete.jersey}`}
                              {p.starter && ' · S'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {p.didNotPlay ? (
                      <td
                        colSpan={labels.length}
                        className="px-3 py-1.5 text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d italic"
                      >
                        Did not play{p.reason ? ` · ${p.reason}` : ''}
                      </td>
                    ) : (
                      labels.map((_, i) => (
                        <td
                          key={i}
                          className="px-1.5 py-1.5 text-center font-mono"
                        >
                          {p.stats[i] || '—'}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Game-relevant YouTube highlights ────────────────────────────────────

function GameHighlights({ sport, game }: { sport: SportKey; game: EspnGame }) {
  const [allVideos, setAllVideos] = useState<YouTubeVideo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<YouTubeVideo | null>(null)
  const [inlineVideo, setInlineVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/highlights?sport=${encodeURIComponent(sport)}&limit=24`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setAllVideos(data.videos ?? [])
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sport])

  const { primary, fallback, mode } = useMemo(() => filterVideosForGame(allVideos, game), [allVideos, game])
  const videos = primary.length > 0 ? primary : fallback

  // Auto-pick first video for inline autoplay (muted) once load completes.
  // Resets when the underlying list changes (different game).
  useEffect(() => {
    if (videos.length > 0) setInlineVideo(videos[0])
    else setInlineVideo(null)
  }, [videos])

  const away = game.competitors.find((c) => c.homeAway === 'away')
  const home = game.competitors.find((c) => c.homeAway === 'home')
  const headerLabel = !loaded
    ? ''
    : mode === 'matched'
      ? `${primary.length} highlight${primary.length === 1 ? '' : 's'} for this matchup · autoplaying muted`
      : mode === 'related'
        ? `Featuring ${away?.abbr ?? ''} or ${home?.abbr ?? ''} · autoplaying muted`
        : 'Latest from the league channel · autoplaying muted'

  if (!loaded) {
    return (
      <div className="space-y-3">
        <div className="aspect-video rounded-xl bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-40 aspect-video rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface px-4 py-6 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">
        No highlights posted yet — check back after the next game.
      </div>
    )
  }

  const remaining = inlineVideo ? videos.filter((v) => v.id !== inlineVideo.id) : videos

  return (
    <>
      {headerLabel && (
        <p className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d mb-2">
          {headerLabel}
        </p>
      )}

      {/* Inline player — autoplay muted on open. Tap "Open with sound" to fullscreen w/ audio. */}
      {inlineVideo && (
        <div className="mb-3 rounded-xl overflow-hidden border border-arena-border-l dark:border-arena-border-d bg-black">
          <div className="relative aspect-video">
            <iframe
              key={inlineVideo.id}
              src={buildEmbedUrl(inlineVideo.id, { autoplay: true, mute: true })}
              title={inlineVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <div className="px-3 py-2 flex items-center justify-between gap-3 bg-arena-card dark:bg-arena-surface">
            <p className="flex-1 min-w-0 text-[12px] font-bold line-clamp-1 leading-tight">{inlineVideo.title}</p>
            <button
              type="button"
              onClick={() => setActive(inlineVideo)}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider text-arena-red border border-arena-red/40 hover:bg-arena-red hover:text-white transition"
              aria-label="Open fullscreen with sound"
            >
              🔊 Sound
            </button>
          </div>
        </div>
      )}

      {/* Thumbnail rail — remaining videos. Tap to swap into inline player. */}
      {remaining.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'thin' }}
        >
          {remaining.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setInlineVideo(v)}
              className="group relative flex-shrink-0 w-44 sm:w-52 rounded-lg overflow-hidden border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface hover:border-arena-red transition-colors snap-start text-left"
            >
              <div className="relative aspect-video bg-arena-bg-l dark:bg-arena-bg-d overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-arena-red/90 group-hover:bg-arena-red flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                  {relativeAgo(v.publishedAt)}
                </div>
              </div>
              <div className="p-2">
                <p className="text-[11px] font-bold line-clamp-2 leading-tight">{v.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <HighlightModal videoId={active.id} title={active.title} onClose={() => setActive(null)} />
      )}
    </>
  )
}

/** Tokens we'll try to find in a video title for a given team:
 *  mascot (last word), shortDisplayName ("Wolves"), the city portion ("los angeles"),
 *  full displayName. Lowercased + de-duped. */
function teamTokens(t: { displayName: string; shortDisplayName?: string }): string[] {
  const tokens = new Set<string>()
  const dn = (t.displayName ?? '').trim()
  if (dn) tokens.add(dn.toLowerCase())
  const parts = dn.split(/\s+/).filter(Boolean)
  if (parts.length > 0) {
    const last = parts[parts.length - 1].toLowerCase()
    if (last.length >= 3) tokens.add(last)
    if (parts.length >= 2) {
      const city = parts.slice(0, -1).join(' ').toLowerCase()
      if (city.length >= 3) tokens.add(city)
    }
  }
  const sd = (t.shortDisplayName ?? '').trim().toLowerCase()
  if (sd.length >= 3) tokens.add(sd)
  return Array.from(tokens)
}

function titleHasTeam(title: string, tokens: string[]): boolean {
  return tokens.some((tok) => title.includes(tok))
}

/** Score per video:
 *  +10 both team names (mascot/city/shortName) appear in title — strong matchup match
 *  +8  both team abbrs appear word-bounded — strong abbr match (e.g. "BOS @ LAL")
 *  +5  one team name + one team abbr mixed — solid single-side match w/ confirmation
 *  +3  one team name OR one abbr — single-team feature (player-centric clip etc)
 *
 *  Tiers (return shape):
 *    matched (score >= 8): true matchup videos — show w/ "for this matchup" label
 *    related (score >= 3): single-team clips — show w/ "featuring TEAM" label
 *    fallback: latest 6 from channel — show w/ "latest from league channel" label
 */
function filterVideosForGame(
  videos: YouTubeVideo[],
  game: EspnGame,
): {
  primary: YouTubeVideo[]
  fallback: YouTubeVideo[]
  mode: 'matched' | 'related' | 'fallback'
} {
  const away = game.competitors.find((c) => c.homeAway === 'away')
  const home = game.competitors.find((c) => c.homeAway === 'home')
  if (!away || !home || videos.length === 0) {
    return { primary: [], fallback: videos.slice(0, 6), mode: 'fallback' }
  }
  const aTokens = teamTokens(away)
  const hTokens = teamTokens(home)
  const aAbbr = away.abbr.toLowerCase()
  const hAbbr = home.abbr.toLowerCase()
  const aAbbrRe = aAbbr ? new RegExp(`\\b${escapeRegex(aAbbr)}\\b`) : null
  const hAbbrRe = hAbbr ? new RegExp(`\\b${escapeRegex(hAbbr)}\\b`) : null

  const scored = videos
    .map((v) => {
      const t = v.title.toLowerCase()
      const hasAName = titleHasTeam(t, aTokens)
      const hasHName = titleHasTeam(t, hTokens)
      const aAbbrHit = aAbbrRe ? aAbbrRe.test(t) : false
      const hAbbrHit = hAbbrRe ? hAbbrRe.test(t) : false

      let score = 0
      if (hasAName && hasHName) score = Math.max(score, 10)
      else if (hasAName || hasHName) score = Math.max(score, 3)
      if (aAbbrHit && hAbbrHit) score = Math.max(score, 8)
      else if (aAbbrHit || hAbbrHit) score = Math.max(score, 3)
      // Mixed: one side by name, the other by abbr — strong matchup signal
      if ((hasAName && hAbbrHit) || (hasHName && aAbbrHit)) score = Math.max(score, 8)
      // One team name + same-team abbr → confirmed single-team focus
      if ((hasAName && aAbbrHit) || (hasHName && hAbbrHit)) score = Math.max(score, 5)
      return { video: v, score }
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.video.publishedAt).getTime() - new Date(a.video.publishedAt).getTime(),
    )

  const matched = scored.filter((x) => x.score >= 8).map((x) => x.video).slice(0, 8)
  if (matched.length > 0) {
    return { primary: matched, fallback: videos.slice(0, 6), mode: 'matched' }
  }
  const related = scored.filter((x) => x.score >= 3).map((x) => x.video).slice(0, 6)
  if (related.length > 0) {
    return { primary: related, fallback: videos.slice(0, 6), mode: 'related' }
  }
  return { primary: [], fallback: videos.slice(0, 6), mode: 'fallback' }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default GameDetailModal
