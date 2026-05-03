import { SportHubTemplate } from '@/components/SportHubTemplate'

export default function NhlPage() {
  return (
    <SportHubTemplate
      sport="nhl"
      title="NHL Playoffs"
      hologramLabel="NHL · STANLEY CUP"
      pageDescription="Live Stanley Cup playoff scores, conference standings, series state. Auto-refreshes every 60 seconds."
      highlightSeasonType={3}
      standingsGroupFilter={(name) =>
        /eastern|western|conference/i.test(name)
      }
      showOtLosses
      highlightPlayoffSeeds={8}
    />
  )
}
