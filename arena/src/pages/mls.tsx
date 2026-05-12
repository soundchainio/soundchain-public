import { SportHubTemplate } from '@/components/SportHubTemplate'

/**
 * MLS hub — uses shared SportHubTemplate so the page surfaces live fixtures,
 * Eastern/Western conference standings, and MLS channel highlights — same
 * shape as the other sport hubs. Date navigator handles off-season gaps.
 */
export default function MlsPage() {
  return (
    <SportHubTemplate
      sport="soccerMls"
      title="Major League Soccer"
      hologramLabel="MLS · USA · CANADA"
      pageDescription="Live MLS fixtures, scores, and standings table (Eastern + Western conferences). Auto-refreshes every 60 seconds."
      standingsGroupFilter={(name) => /eastern|western|conference/i.test(name)}
    />
  )
}
