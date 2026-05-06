import { SportHubTemplate } from '@/components/SportHubTemplate'

export default function NflPage() {
  return (
    <SportHubTemplate
      sport="nfl"
      title="NFL"
      hologramLabel="NFL · OFFSEASON / DRAFT"
      pageDescription="Live NFL games when in season. Offseason: news, draft, schedule. Auto-refreshes every 60 seconds."
      highlightSeasonType={2}
    />
  )
}
