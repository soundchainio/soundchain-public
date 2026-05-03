import { SportHubTemplate } from '@/components/SportHubTemplate'

export default function MlbPage() {
  return (
    <SportHubTemplate
      sport="mlb"
      title="MLB · Live Stats"
      hologramLabel="MLB · REGULAR SEASON"
      pageDescription="Live scores, division standings, today's slate. Auto-refreshes every 60 seconds."
      highlightSeasonType={2}
    />
  )
}
