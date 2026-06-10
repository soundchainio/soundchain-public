import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * FIFA World Cup 2026 Golden Boot — cumulative top scorers + assists.
 *
 * ESPN's per-stage core-API leaders (sports.core.api.espn.com) only count goals
 * WITHIN a stage (Group / R32 / … / Final), and the athletes are $ref URLs.
 * A real Golden Boot is the running total ACROSS all stages, so this route:
 *   1. fetches all 7 stage leader endpoints once (parallel),
 *   2. merges goals (and assists) per athlete, summing across stages,
 *   3. resolves the top N athlete refs to names / country flags / positions.
 *
 * Server-side because the core API isn't reliably CORS-open and ref resolution
 * is many fetches — the browser just hits this clean endpoint. Pre-tournament
 * every stage 404s, so this returns { goals: [], assists: [] } and the dash
 * shows a graceful "race opens once goals are scored" state. Cached 2 min.
 */

const CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026'
const TYPES = [1, 2, 3, 4, 5, 6, 7] // Group → R32 → R16 → QF → SF → 3rd → Final

interface Raw {
  athleteRef: string
  teamRef?: string
  athleteId: string
  value: number
}

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

function idFromRef(ref: string | undefined, segment: string): string | undefined {
  return ref?.match(new RegExp(`${segment}/(\\d+)`))?.[1]
}

/** Merge one category (goals or assists) across every stage's leaders. */
function mergeCategory(stageData: any[], names: string[]): Raw[] {
  const merged = new Map<string, Raw>()
  for (const d of stageData) {
    if (!d) continue
    const cat = (d.categories || []).find((c: any) => names.includes(c.name))
    for (const l of cat?.leaders || []) {
      const athleteRef: string | undefined = l.athlete?.$ref
      if (!athleteRef) continue
      const athleteId = idFromRef(athleteRef, 'athletes') || athleteRef
      const value = typeof l.value === 'number' ? l.value : Number(l.value) || 0
      const prev = merged.get(athleteId)
      if (prev) prev.value += value
      else merged.set(athleteId, { athleteRef, teamRef: l.team?.$ref, athleteId, value })
    }
  }
  return Array.from(merged.values())
}

async function resolveTop(raws: Raw[], topN: number) {
  const top = raws.sort((a, b) => b.value - a.value).slice(0, topN)
  const out = await Promise.all(
    top.map(async (r, i) => {
      try {
        const a = await getJson(r.athleteRef)
        const id = String(a.id ?? r.athleteId)
        const teamId = idFromRef(r.teamRef || a.team?.$ref, 'teams')
        return {
          rank: i + 1,
          athleteId: id,
          name: a.displayName ?? a.fullName ?? '',
          flag: a.flag?.href as string | undefined,
          headshot: id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png` : undefined,
          position: a.position?.abbreviation as string | undefined,
          teamId,
          value: r.value,
        }
      } catch {
        return null
      }
    })
  )
  return out.filter(Boolean)
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const stageData = await Promise.all(
      TYPES.map((t) => getJson(`${CORE}/types/${t}/leaders?lang=en`).catch(() => null))
    )
    const goalsRaw = mergeCategory(stageData, ['goalsLeaders', 'goals'])
    const assistsRaw = mergeCategory(stageData, ['assistsLeaders', 'assists'])
    const [goals, assists] = await Promise.all([resolveTop(goalsRaw, 15), resolveTop(assistsRaw, 8)])
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
    res.status(200).json({ goals, assists })
  } catch (e: any) {
    res.status(200).json({ goals: [], assists: [], error: String(e?.message || e) })
  }
}
