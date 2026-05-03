import type { EspnGame } from '@/lib/espn'

function StateBadge({ game }: { game: EspnGame }) {
  const s = game.status.state
  if (s === 'in') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-arena-red border border-arena-red/40 bg-arena-red/5">
        <span className="arena-live-dot" /> LIVE · {game.status.detail || game.status.description}
      </span>
    )
  }
  if (s === 'post') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-arena-muted-l dark:text-arena-muted-d border border-arena-border-l dark:border-arena-border-d">
        FINAL{game.status.detail?.includes('OT') ? ' / OT' : ''}
      </span>
    )
  }
  // Pre-game — show local time
  const date = new Date(game.date)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-arena-orange border border-arena-orange/40 bg-arena-orange/5">
      {time}
    </span>
  )
}

function TeamRow({
  abbr,
  displayName,
  logo,
  score,
  isLeading,
  finalLoser,
}: {
  abbr: string
  displayName: string
  logo?: string
  score: string
  isLeading: boolean
  finalLoser: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 ${
        finalLoser ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={abbr}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span className="w-6 h-6 rounded-full bg-arena-border-l dark:bg-arena-border-d flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            {abbr.slice(0, 3)}
          </span>
        )}
        <span className="text-sm font-bold truncate">{abbr}</span>
        <span className="hidden sm:inline text-xs text-arena-muted-l dark:text-arena-muted-d truncate">
          {displayName}
        </span>
      </div>
      <span
        className={`text-base sm:text-lg font-black arena-tabular ${
          isLeading ? 'text-arena-red' : ''
        }`}
      >
        {score}
      </span>
    </div>
  )
}

export function GameCard({ game }: { game: EspnGame }) {
  const home = game.competitors.find((c) => c.homeAway === 'home')
  const away = game.competitors.find((c) => c.homeAway === 'away')
  if (!home || !away) return null

  const homeScore = Number(home.score) || 0
  const awayScore = Number(away.score) || 0
  const completed = game.status.state === 'post'
  const inProgress = game.status.state === 'in'

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-3 sm:p-4 hover:border-arena-red/40 transition">
      <div className="flex items-center justify-between gap-2 mb-2">
        <StateBadge game={game} />
        {game.broadcasts && game.broadcasts.length > 0 && (
          <span className="text-[10px] font-mono tracking-wider text-arena-muted-l dark:text-arena-muted-d">
            {game.broadcasts.slice(0, 2).join(' · ')}
          </span>
        )}
      </div>
      <TeamRow
        abbr={away.abbr}
        displayName={away.displayName}
        logo={away.logo}
        score={away.score}
        isLeading={(inProgress || completed) && awayScore > homeScore}
        finalLoser={completed && awayScore < homeScore}
      />
      <TeamRow
        abbr={home.abbr}
        displayName={home.displayName}
        logo={home.logo}
        score={home.score}
        isLeading={(inProgress || completed) && homeScore > awayScore}
        finalLoser={completed && homeScore < awayScore}
      />
      {game.seriesSummary && (
        <div className="mt-2 pt-2 border-t border-arena-border-l dark:border-arena-border-d text-[11px] font-mono tracking-wide text-arena-muted-l dark:text-arena-muted-d">
          {game.seriesSummary}
        </div>
      )}
    </div>
  )
}

export default GameCard
