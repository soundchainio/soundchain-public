/**
 * F1 data via Jolpica-F1 (drop-in Ergast replacement, free, no key required).
 * Endpoint base: https://api.jolpi.ca/ergast/f1/
 *
 * Ergast was officially sunset Dec 2024; Jolpica is the actively-maintained
 * fork with the same response shape. If Jolpica goes down, swap base URL
 * to Ergast mirror or OpenF1.
 */

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'

export interface F1Race {
  season: string
  round: string
  raceName: string
  circuit: { circuitName: string; locality: string; country: string }
  date: string                 // YYYY-MM-DD
  time?: string                // HH:MM:SSZ
}

export interface F1DriverStanding {
  position: string
  points: string
  wins: string
  driver: { driverId: string; givenName: string; familyName: string; code?: string; nationality: string }
  constructor: { constructorId: string; name: string; nationality: string }
}

export interface F1ConstructorStanding {
  position: string
  points: string
  wins: string
  constructor: { constructorId: string; name: string; nationality: string }
}

export interface F1RaceResultEntry {
  position: string
  points: string
  driver: { driverId: string; givenName: string; familyName: string; code?: string }
  constructor: { constructorId: string; name: string }
  status: string               // "Finished" / "+1 Lap" / "Retired"
  time?: { time: string }
}

export interface F1LastRace {
  race: F1Race
  results: F1RaceResultEntry[]
}

async function fetchJSON<T>(path: string): Promise<T> {
  const url = `${JOLPICA_BASE}${path}.json`
  const res = await fetch(url, { next: { revalidate: 300 } as any })
  if (!res.ok) throw new Error(`Jolpica ${path} ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchF1Schedule(): Promise<F1Race[]> {
  const data = await fetchJSON<any>('/current')
  const races = data?.MRData?.RaceTable?.Races ?? []
  return races.map(
    (r: any): F1Race => ({
      season: r.season,
      round: r.round,
      raceName: r.raceName,
      circuit: {
        circuitName: r.Circuit?.circuitName,
        locality: r.Circuit?.Location?.locality,
        country: r.Circuit?.Location?.country,
      },
      date: r.date,
      time: r.time,
    })
  )
}

export async function fetchF1DriverStandings(): Promise<F1DriverStanding[]> {
  const data = await fetchJSON<any>('/current/driverStandings')
  const list =
    data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  return list.map(
    (s: any): F1DriverStanding => ({
      position: s.position,
      points: s.points,
      wins: s.wins,
      driver: {
        driverId: s.Driver?.driverId,
        givenName: s.Driver?.givenName,
        familyName: s.Driver?.familyName,
        code: s.Driver?.code,
        nationality: s.Driver?.nationality,
      },
      constructor: {
        constructorId: s.Constructors?.[0]?.constructorId,
        name: s.Constructors?.[0]?.name,
        nationality: s.Constructors?.[0]?.nationality,
      },
    })
  )
}

export async function fetchF1ConstructorStandings(): Promise<F1ConstructorStanding[]> {
  const data = await fetchJSON<any>('/current/constructorStandings')
  const list =
    data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  return list.map(
    (s: any): F1ConstructorStanding => ({
      position: s.position,
      points: s.points,
      wins: s.wins,
      constructor: {
        constructorId: s.Constructor?.constructorId,
        name: s.Constructor?.name,
        nationality: s.Constructor?.nationality,
      },
    })
  )
}

export async function fetchF1LastRace(): Promise<F1LastRace | null> {
  try {
    const data = await fetchJSON<any>('/current/last/results')
    const race = data?.MRData?.RaceTable?.Races?.[0]
    if (!race) return null
    const results = (race.Results ?? []).map(
      (r: any): F1RaceResultEntry => ({
        position: r.position,
        points: r.points,
        driver: {
          driverId: r.Driver?.driverId,
          givenName: r.Driver?.givenName,
          familyName: r.Driver?.familyName,
          code: r.Driver?.code,
        },
        constructor: {
          constructorId: r.Constructor?.constructorId,
          name: r.Constructor?.name,
        },
        status: r.status,
        time: r.Time ? { time: r.Time.time } : undefined,
      })
    )
    return {
      race: {
        season: race.season,
        round: race.round,
        raceName: race.raceName,
        circuit: {
          circuitName: race.Circuit?.circuitName,
          locality: race.Circuit?.Location?.locality,
          country: race.Circuit?.Location?.country,
        },
        date: race.date,
        time: race.time,
      },
      results,
    }
  } catch (_) {
    return null
  }
}

/** Static team-color map. F1 teams ~rotate every 5-10 years; cheap enough to keep
 *  inline. If Jolpica returns a constructorId we don't know, defaults to grey. */
export const F1_TEAM_COLOR: Record<string, string> = {
  red_bull: '#1E5BC6',
  ferrari: '#E10600',
  mercedes: '#27F4D2',
  mclaren: '#FF8000',
  aston_martin: '#229971',
  alpine: '#FF87BC',
  williams: '#1868DB',
  rb: '#6692FF',                  // RB (Visa Cash App RB)
  alphatauri: '#6692FF',          // legacy id
  haas: '#B6BABD',
  sauber: '#52E252',              // Stake F1 Team Kick Sauber
  alfa: '#9C0000',                // legacy alfa romeo id
}

export function teamColor(constructorId?: string): string {
  if (!constructorId) return '#a3a3a3'
  return F1_TEAM_COLOR[constructorId] ?? '#a3a3a3'
}

/** Find next race after today (assumes schedule is sorted) */
export function findNextRace(schedule: F1Race[]): F1Race | null {
  const now = Date.now()
  const upcoming = schedule
    .map((r) => ({
      r,
      ts: r.time
        ? new Date(`${r.date}T${r.time}`).getTime()
        : new Date(r.date).getTime(),
    }))
    .filter((x) => x.ts > now)
    .sort((a, b) => a.ts - b.ts)
  return upcoming[0]?.r ?? null
}

/** Country → emoji flag for race circuits */
export function countryFlag(country: string): string {
  const map: Record<string, string> = {
    Bahrain: '🇧🇭', 'Saudi Arabia': '🇸🇦', Australia: '🇦🇺', Japan: '🇯🇵',
    China: '🇨🇳', USA: '🇺🇸', 'United States': '🇺🇸', Italy: '🇮🇹',
    Monaco: '🇲🇨', Spain: '🇪🇸', Canada: '🇨🇦', Austria: '🇦🇹', UK: '🇬🇧',
    'United Kingdom': '🇬🇧', Hungary: '🇭🇺', Belgium: '🇧🇪', Netherlands: '🇳🇱',
    Azerbaijan: '🇦🇿', Singapore: '🇸🇬', Mexico: '🇲🇽', Brazil: '🇧🇷',
    'United Arab Emirates': '🇦🇪', UAE: '🇦🇪', Qatar: '🇶🇦', France: '🇫🇷',
    Germany: '🇩🇪', Portugal: '🇵🇹', Turkey: '🇹🇷',
  }
  return map[country] ?? '🏁'
}
