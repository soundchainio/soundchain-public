import { SportHubTemplate } from '@/components/SportHubTemplate'

/**
 * EPL hub — uses shared SportHubTemplate so the page surfaces live fixtures,
 * standings table, stat leaders (when ESPN exposes them), and Premier League
 * channel highlights — same shape as NBA/NHL/MLB/NCAA. Sparse during summer
 * break; date navigator lets viewers jump to past/future match days.
 */
export default function EplPage() {
  return (
    <SportHubTemplate
      sport="soccerEpl"
      title="Premier League"
      hologramLabel="EPL · ENGLAND"
      pageDescription="Live Premier League fixtures, scores, and standings table. Auto-refreshes every 60 seconds — sparse during summer break, navigate with the date picker."
    />
  )
}
