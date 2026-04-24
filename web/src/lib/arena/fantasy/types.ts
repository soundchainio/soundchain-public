/**
 * Fantasy league types — shared between API routes and UI.
 *
 * Status flow: open → drafting → live → complete | cancelled
 * Stored in MongoDB collection: fantasy_leagues
 */

export type LeagueStatus = 'open' | 'drafting' | 'live' | 'complete' | 'cancelled'
export type EntryToken = 'OGUN' | 'POL' | 'USDC' | 'XRP'
export type RosterSlot = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DEF' | 'BENCH'

export interface FantasyTeam {
  ownerHandle: string
  ownerProfileId: string
  ownerWallet?: string
  teamName: string
  joinedAt: string
  draftOrder?: number        // 1..N, set when draft starts
  roster: RosterEntry[]
  weeklyScores: Record<number, number>  // week (1..18) → points
  wins: number
  losses: number
  totalPoints: number
  depositTxHash?: string     // on-chain escrow receipt
}

export interface RosterEntry {
  playerId: string           // ESPN athlete id as string
  fullName: string
  position: string           // QB / RB / WR / TE / K / DST / etc.
  teamAbbr: string           // e.g. 'BUF'
  slot: RosterSlot
  draftedAt?: string         // ISO — undefined = waivers / free agent pickup
  draftPick?: number         // overall pick #
}

export interface Matchup {
  week: number
  home: string               // ownerHandle
  away: string               // ownerHandle
  homeScore?: number
  awayScore?: number
  winner?: string            // ownerHandle | 'tie' | undefined (not played)
}

/** Playoff bracket types (top-4 single-elim, two rounds — semis + finals). */
export interface PlayoffMatchup {
  id: string                 // 'semi-1' | 'semi-2' | 'final' | 'consolation'
  week: number               // 15 or 16 by default
  bracket: 'winners' | 'consolation'
  round: 'semifinal' | 'final'
  homeSeed?: number          // 1..4 — only set for semifinals
  awaySeed?: number
  home?: string              // ownerHandle — filled once feeder round has a winner
  away?: string
  homeScore?: number
  awayScore?: number
  winner?: string
  /** For non-semifinal matchups, these identify the feeder matchup IDs. */
  feedsFromHome?: string     // 'semi-1'
  feedsFromAway?: string     // 'semi-2'
}

export interface PlayoffRound {
  week: number
  matchups: PlayoffMatchup[]
}

export interface FantasyLeague {
  _id?: string
  leagueName: string
  sport: 'NFL'               // phase 1 = NFL only
  commissionerHandle: string
  commissionerProfileId: string
  status: LeagueStatus
  maxTeams: number           // 4, 6, 8, 10, 12, 14
  entryToken: EntryToken
  entryFee: number           // in whole-token units (e.g. 100 for 100 OGUN)
  prizeSplit: {              // bps — first+second+third+platform = 10000
    first: number
    second: number
    third: number
    platform: number         // 5 (0.05%)
  }
  teams: FantasyTeam[]
  schedule: Matchup[]
  draftOrder: string[]       // ownerHandles in snake-draft order, set when status → drafting
  currentPickIndex: number   // 0-indexed into a flattened snake draft
  draftRounds: number        // e.g. 15 (QB+RB+RB+WR+WR+TE+FLEX+K+DEF + 6 bench)
  escrowLeagueId?: number    // on-chain leagueId once contract is deployed + called
  escrowContractAddress?: string
  /** Per-player per-week fantasy points. `weekPlayerScores[week][playerId] = pts`.
   *  Populated by the scoring sync cron; used by matchup cards to show
   *  which starters contributed to the weekly total. Optional — legacy leagues
   *  won't have it until the next sync. */
  weekPlayerScores?: Record<string, Record<string, number>>
  lastScoringSyncAt?: string
  lastScoringSyncWeek?: number
  /** Top-4 playoff bracket — set once commissioner triggers `start-playoffs`
   *  after the regular season ends. Progresses as scoring sync fills winners. */
  playoffBracket?: PlayoffRound[]
  /** Final standings snapshot after settle() — for season summary + NFT metadata. */
  winners?: { first?: string; second?: string; third?: string }
  payoutTxHash?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/** Standard NFL roster: 9 starters + 6 bench = 15 rounds. */
export const DEFAULT_ROSTER_TEMPLATE: RosterSlot[] = [
  'QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF',
  'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH',
]

/** Default prize split: 60% / 25% / 10% / 5% platform = 10000 bps total. */
export const DEFAULT_PRIZE_SPLIT = { first: 6000, second: 2500, third: 1000, platform: 500 }

/** Allowed token config — address(0) means native POL. */
export const TOKEN_CONFIG: Record<EntryToken, { address: string; decimals: number; label: string }> = {
  OGUN: { address: '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c', decimals: 18, label: 'OGUN' },
  POL:  { address: '0x0000000000000000000000000000000000000000', decimals: 18, label: 'POL' },
  USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, label: 'USDC' },
  // WXRP reserved — wrap on Polygon when liquid. Placeholder address for now.
  XRP:  { address: '0x0000000000000000000000000000000000000000', decimals: 18, label: 'XRP (coming)' },
}
