import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * GET /api/worldcup/stars — real player CUTOUTS for the homepage hero rail.
 *
 * Fox Sports has NO free public API (auth-locked, 401), so — like the rest of
 * Arena — this uses ESPN's open site.api. ESPN serves real transparent-PNG
 * player headshot cutouts at a.espncdn.com/i/headshots/soccer/players/full/<id>.png.
 * We resolve a set of marquee WC federations to their ESPN team ids, pull each
 * roster, and return players that actually have a headshot. Cached hard (6h) so
 * it's one slow multi-roster fetch per region per window.
 */

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

// Marquee federations (matched by name against the live teams list — no
// hardcoded ids, so it survives ESPN id changes) + a flag for the card.
const MARQUEE: { match: string; flag: string }[] = [
  { match: 'Argentina', flag: '🇦🇷' }, { match: 'Brazil', flag: '🇧🇷' },
  { match: 'France', flag: '🇫🇷' }, { match: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { match: 'Spain', flag: '🇪🇸' }, { match: 'Portugal', flag: '🇵🇹' },
  { match: 'Germany', flag: '🇩🇪' }, { match: 'Netherlands', flag: '🇳🇱' },
  { match: 'Belgium', flag: '🇧🇪' }, { match: 'Croatia', flag: '🇭🇷' },
  { match: 'United States', flag: '🇺🇸' }, { match: 'Mexico', flag: '🇲🇽' },
  { match: 'Canada', flag: '🇨🇦' }, { match: 'Uruguay', flag: '🇺🇾' },
]

type Star = { name: string; team: string; flag: string; pos: string; img: string }

async function j(url: string, ms = 12000) {
  const r = await fetch(url, { headers: { 'User-Agent': 'SoundChainArena/1.0' }, signal: AbortSignal.timeout(ms) })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const teamsDoc = await j(`${ESPN}/teams`)
    const teams: any[] = teamsDoc?.sports?.[0]?.leagues?.[0]?.teams || []
    const picks = MARQUEE
      .map(m => {
        const t = teams.find(x => (x.team?.displayName || '').toLowerCase().includes(m.match.toLowerCase()))
        return t ? { id: t.team.id, team: t.team.displayName, flag: m.flag } : null
      })
      .filter(Boolean) as { id: string; team: string; flag: string }[]

    const rosters = await Promise.all(picks.map(async p => {
      try {
        const d = await j(`${ESPN}/teams/${p.id}/roster`)
        const ath: any[] = d?.athletes || []
        const stars: Star[] = []
        for (const a of ath) {
          const it = a?.athlete || a
          const img = it?.headshot?.href
          if (!img) continue
          stars.push({
            name: it.displayName || it.fullName || 'Player',
            team: p.team,
            flag: p.flag,
            pos: it?.position?.abbreviation || it?.position?.name || '',
            img,
          })
        }
        // up to 3 per nation so the rail is diverse, not one-team-heavy
        return stars.slice(0, 3)
      } catch { return [] as Star[] }
    }))

    const flat = rosters.flat()
    // de-dup by image, cap the rail
    const seen = new Set<string>()
    const out = flat.filter(s => (seen.has(s.img) ? false : (seen.add(s.img), true))).slice(0, 28)

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
    return res.status(200).json({ stars: out })
  } catch (e: any) {
    return res.status(200).json({ stars: [], error: e?.message || 'failed' })
  }
}
