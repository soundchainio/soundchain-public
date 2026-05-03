import { SportHubTemplate } from '@/components/SportHubTemplate'

export default function NbaPage() {
  return (
    <SportHubTemplate
      sport="nba"
      title="NBA Playoffs"
      hologramLabel="NBA · POSTSEASON"
      pageDescription="Live playoff scores, conference standings, series snapshots. Auto-refreshes every 60 seconds."
      highlightSeasonType={3}
      standingsGroupFilter={(name) =>
        /eastern|western|conference/i.test(name)
      }
      highlightPlayoffSeeds={8}
    />
  )
}
