import { SportHubTemplate } from '@/components/SportHubTemplate'

/**
 * UFC / MMA hub — uses shared SportHubTemplate so the page surfaces upcoming
 * fight cards from ESPN's MMA scoreboard, plus UFC channel highlights. Fight
 * events render as games (fighter A vs fighter B) via the same GameCard.
 */
export default function MmaPage() {
  return (
    <SportHubTemplate
      sport="mma"
      title="UFC / MMA"
      hologramLabel="UFC · MMA · WORLDWIDE"
      pageDescription="Live UFC fight cards, upcoming events, and recent results. Highlights from UFC's official channel. Auto-refreshes every 60 seconds."
    />
  )
}
