// Boxing data via ESPN public endpoints. No auth, no key.
// Boxing is event-based (fight cards) not team-based, so it lives outside lib/espn.ts.

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/boxing'

export interface BoxingFighter {
  id: string
  displayName: string
  shortName?: string
  abbreviation?: string
  record?: string
  nationality?: string
  headshotUrl?: string
}

export interface BoxingFight {
  id: string
  name: string                              // "Joshua vs. Wilder"
  shortName?: string
  date: string                              // ISO
  state: 'pre' | 'in' | 'post'
  detail?: string                           // "Saturday at 8:00 PM ET" / "TKO Round 7"
  venue?: { name?: string; city?: string; country?: string }
  fighters: { red?: BoxingFighter; blue?: BoxingFighter }
  weightClass?: string
  rounds?: number
  winnerId?: string
  network?: string
}

export interface BoxingNewsItem {
  id: string
  headline: string
  description?: string
  publishedAt: string
  url: string
  imageUrl?: string
}

function fighterFromCompetitor(c: any): BoxingFighter | undefined {
  if (!c) return undefined
  const a = c.athlete ?? c.competitor ?? c
  if (!a?.id && !a?.displayName) return undefined
  return {
    id: String(a.id ?? ''),
    displayName: a.displayName ?? a.fullName ?? a.shortName ?? '',
    shortName: a.shortName,
    abbreviation: a.abbreviation,
    record: c.record ?? a.record?.[0]?.summary,
    nationality: a.flag?.alt ?? a.nationality?.name ?? a.nationality,
    headshotUrl: a.headshot?.href ?? a.headshots?.[0]?.href ?? (a.id ? `https://a.espncdn.com/i/headshots/boxing/players/full/${a.id}.png` : undefined),
  }
}

function fightFromEvent(ev: any): BoxingFight | null {
  const comp = ev?.competitions?.[0]
  if (!comp) return null
  const competitors = comp.competitors ?? []
  const stateRaw = comp.status?.type?.state ?? ev.status?.type?.state ?? 'pre'
  const state: BoxingFight['state'] =
    stateRaw === 'in' ? 'in' : stateRaw === 'post' ? 'post' : 'pre'
  const winner = competitors.find((c: any) => c.winner === true)
  return {
    id: String(ev.id ?? comp.id ?? ''),
    name: ev.name ?? ev.shortName ?? '',
    shortName: ev.shortName,
    date: ev.date ?? comp.date ?? '',
    state,
    detail: comp.status?.type?.detail ?? comp.status?.type?.shortDetail,
    venue: comp.venue
      ? {
          name: comp.venue.fullName ?? comp.venue.name,
          city: comp.venue.address?.city,
          country: comp.venue.address?.country,
        }
      : undefined,
    fighters: {
      red: fighterFromCompetitor(competitors[0]),
      blue: fighterFromCompetitor(competitors[1]),
    },
    weightClass: comp.notes?.[0]?.headline ?? comp.weightClass?.name,
    rounds: comp.format?.regulation?.periods,
    winnerId: winner?.id ? String(winner.id) : undefined,
    network: comp.broadcasts?.[0]?.names?.[0],
  }
}

/** ESPN boxing scoreboard — recent + upcoming fight cards. Defensive across schema variants. */
export async function fetchBoxingFights(): Promise<BoxingFight[]> {
  const url = `${ESPN_BASE}/scoreboard`
  const res = await fetch(url, { next: { revalidate: 300 } as any })
  if (!res.ok) throw new Error(`ESPN boxing scoreboard ${res.status}`)
  const data = await res.json()
  const events: any[] = Array.isArray(data?.events) ? data.events : []
  return events.map(fightFromEvent).filter(Boolean) as BoxingFight[]
}

export async function fetchBoxingNews(limit = 20): Promise<BoxingNewsItem[]> {
  const url = `${ESPN_BASE}/news?limit=${limit}`
  const res = await fetch(url, { next: { revalidate: 600 } as any })
  if (!res.ok) throw new Error(`ESPN boxing news ${res.status}`)
  const data = await res.json()
  const articles: any[] = Array.isArray(data?.articles) ? data.articles : []
  return articles.map((a): BoxingNewsItem => ({
    id: String(a.id ?? a.dataSourceIdentifier ?? a.headline),
    headline: a.headline ?? a.title ?? '',
    description: a.description,
    publishedAt: a.published ?? a.lastModified ?? '',
    url: a.links?.web?.href ?? a.links?.mobile?.href ?? '',
    imageUrl: a.images?.[0]?.url ?? a.images?.[0]?.href,
  }))
}

export function bucketFights(fights: BoxingFight[]) {
  const live = fights.filter((f) => f.state === 'in')
  const upcoming = fights.filter((f) => f.state === 'pre').sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const recent = fights.filter((f) => f.state === 'post').sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  return { live, upcoming, recent }
}

export function formatFightDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatFightTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}
