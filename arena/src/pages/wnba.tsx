import { SportHubTemplate } from '@/components/SportHubTemplate'

export default function WnbaPage() {
  return (
    <SportHubTemplate
      sport="wnba"
      title="WNBA"
      hologramLabel="WNBA · LIVE"
      pageDescription="Live WNBA scores, conference standings, leaders. Auto-refreshes every 60 seconds."
      highlightSeasonType={2}
      standingsGroupFilter={(name) =>
        /eastern|western|conference/i.test(name)
      }
    />
  )
}
