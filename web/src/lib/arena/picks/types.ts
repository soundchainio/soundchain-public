/**
 * Arena Game Picks — wager on winners of live sports games
 *
 * Supports: NBA, NHL, MLB, NFL
 * Same FantasyLeagueEscrow contract — maxTeams: 2, settle on final score.
 */

export type PickSport = 'nba' | 'nhl' | 'mlb' | 'nfl'
export type PickStatus = 'open' | 'matched' | 'settled' | 'cancelled' | 'expired'

export interface GamePick {
  _id?: string
  id?: string
  sport: PickSport
  // ESPN game data
  espnGameId: string
  homeTeam: string           // abbreviation e.g. 'LAL'
  awayTeam: string           // e.g. 'BOS'
  homeTeamFull: string       // 'Los Angeles Lakers'
  awayTeamFull: string       // 'Boston Celtics'
  homeLogo?: string
  awayLogo?: string
  gameTime: string           // ISO — scheduled start
  gameStatus: 'pre' | 'in' | 'post'  // from ESPN
  finalHomeScore?: number
  finalAwayScore?: number
  // Wager
  creatorHandle: string
  creatorProfileId: string
  creatorPick: 'home' | 'away'   // which team creator picked
  takerHandle?: string
  takerProfileId?: string
  takerPick?: 'home' | 'away'   // opposite of creator
  entryToken: string             // OGUN, POL, USDC, etc.
  entryFee: number               // each side pays this
  pot: number                    // entryFee * 2
  // Settlement
  winner?: 'home' | 'away'
  winnerHandle?: string
  payoutTxHash?: string
  platformFeeBps: number         // 500 = 5%
  ogunBonusBps?: number          // 1000 = 10% bonus to winner when entryToken === 'OGUN', paid from rewards pool on settle
  // Escrow
  creatorDepositTxHash?: string
  takerDepositTxHash?: string
  escrowContractAddress?: string
  // Take action — wallet sig + on-chain platform fee proof (Polygon)
  takerWalletAddress?: string
  takerTxHash?: string
  takerFeePaidWei?: string
  takerSignedAt?: string
  // Meta
  status: PickStatus
  createdAt: string
  matchedAt?: string
  settledAt?: string
  expiresAt: string              // auto-cancel if not matched by game time
}

export const SPORT_CONFIG: Record<PickSport, { label: string; emoji: string; espnSport: string; espnLeague: string }> = {
  nba: { label: 'NBA', emoji: '🏀', espnSport: 'basketball', espnLeague: 'nba' },
  nhl: { label: 'NHL', emoji: '🏒', espnSport: 'hockey', espnLeague: 'nhl' },
  mlb: { label: 'MLB', emoji: '⚾', espnSport: 'baseball', espnLeague: 'mlb' },
  nfl: { label: 'NFL', emoji: '🏈', espnSport: 'football', espnLeague: 'nfl' },
}
