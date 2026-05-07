import { SportHubTemplate } from '@/components/SportHubTemplate'

// FIFA World Cup hub — uses ESPN's `soccer/fifa.world` league key. Sparse
// outside tournament windows, lights up during qualifiers + the actual WC.
// 2026 World Cup runs in the US/Canada/Mexico (June 11 – July 19, 2026) so
// match data populates as the bracket fills. Auto-refresh every 60s.
export default function FifaPage() {
  return (
    <SportHubTemplate
      sport="fifaWorld"
      title="FIFA World Cup"
      hologramLabel="FIFA · WORLD CUP"
      pageDescription="Live FIFA World Cup scores, group standings, knockout bracket. Coverage spans qualifiers + the tournament itself. Auto-refreshes every 60 seconds."
      highlightSeasonType={2}
    />
  )
}
