import type { EspnStandingsGroup } from '@/lib/espn'

interface StandingsTableProps {
  group: EspnStandingsGroup
  showOtLosses?: boolean
  limit?: number
  highlightTop?: number    // first N rows get red text (e.g. playoff seeds)
}

export function StandingsTable({
  group,
  showOtLosses = false,
  limit,
  highlightTop = 0,
}: StandingsTableProps) {
  const rows = limit ? group.entries.slice(0, limit) : group.entries
  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider">{group.name}</h3>
        <span className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d">
          {group.entries.length} TEAMS
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-mono uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d border-b border-arena-border-l dark:border-arena-border-d">
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Team</th>
            <th className="px-2 py-2 text-right arena-tabular">W</th>
            <th className="px-2 py-2 text-right arena-tabular">L</th>
            {showOtLosses && <th className="px-2 py-2 text-right arena-tabular">OTL</th>}
            <th className="px-2 py-2 text-right arena-tabular">PCT</th>
            <th className="px-4 py-2 text-right arena-tabular hidden sm:table-cell">GB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, i) => {
            const inPlayoffs = highlightTop > 0 && i < highlightTop
            return (
              <tr
                key={entry.team.id || entry.team.abbr}
                className="border-b border-arena-border-l dark:border-arena-border-d last:border-b-0 hover:bg-arena-paper dark:hover:bg-arena-carbon transition"
              >
                <td className="px-4 py-2 text-xs font-mono text-arena-muted-l dark:text-arena-muted-d w-10 arena-tabular">
                  {i + 1}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {entry.team.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.team.logo}
                        alt={entry.team.abbr}
                        className="w-5 h-5 object-contain flex-shrink-0"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                    <span className={`text-sm font-bold ${inPlayoffs ? 'text-arena-red' : ''}`}>
                      {entry.team.abbr}
                    </span>
                    <span className="hidden md:inline text-xs text-arena-muted-l dark:text-arena-muted-d truncate">
                      {entry.team.displayName}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-sm font-bold arena-tabular">
                  {entry.wins}
                </td>
                <td className="px-2 py-2 text-right text-sm arena-tabular">{entry.losses}</td>
                {showOtLosses && (
                  <td className="px-2 py-2 text-right text-sm text-arena-muted-l dark:text-arena-muted-d arena-tabular">
                    {entry.otLosses ?? 0}
                  </td>
                )}
                <td className="px-2 py-2 text-right text-sm arena-tabular">
                  {(entry.winPct || 0).toFixed(3).replace(/^0/, '')}
                </td>
                <td className="px-4 py-2 text-right text-sm text-arena-muted-l dark:text-arena-muted-d arena-tabular hidden sm:table-cell">
                  {entry.gamesBack || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default StandingsTable
