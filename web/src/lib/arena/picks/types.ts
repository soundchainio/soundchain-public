/**
 * Arena Game Picks — wager on winners of live sports games
 *
 * Supports: NBA, NHL, MLB, NFL
 * Same FantasyLeagueEscrow contract — maxTeams: 2, settle on final score.
 */

export type PickSport = 'nba' | 'nhl' | 'mlb' | 'nfl'
export type PickStatus = 'pending_deposit' | 'open' | 'matched' | 'settled' | 'cancelled' | 'expired'

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
  creatorAvatarUrl?: string | null  // denormalized profilePicture at create time, hydrated from profile lookup for legacy docs
  creatorPick: 'home' | 'away'   // which team creator picked
  takerHandle?: string
  takerProfileId?: string
  takerAvatarUrl?: string | null
  takerPick?: 'home' | 'away'   // opposite of creator
  entryToken: string             // OGUN, POL, USDC, etc.
  entryFee: number               // each side pays this
  pot: number                    // entryFee * 2
  // Settlement
  winner?: 'home' | 'away'
  winnerHandle?: string
  winnerWalletAddress?: string
  payoutTxHash?: string          // settle() tx hash on Polygon
  platformFeeBps: number         // 5 = 0.05% (matches contract default)
  ogunBonusBps?: number          // 1000 = 10% bonus to winner when entryToken === 'OGUN', paid from rewards pool on settle
  ogunBonusTxHash?: string       // OGUN bonus transfer tx hash (commissioner -> winner) on settle
  ogunBonusAt?: string           // ISO timestamp when bonus was attempted (success or skip)
  ogunBonusSkippedReason?: string // 'commissioner-ogun-balance-insufficient' or other reason if bonus not paid
  // On-chain escrow — FantasyLeagueEscrow contract
  escrowContractAddress?: string
  escrowLeagueId?: string        // contract-issued leagueId from LeagueCreated event
  escrowCreateTxHash?: string    // server's createLeague tx
  escrowLockTxHash?: string      // server's lock tx (after both joined)
  escrowCancelTxHash?: string    // server's cancel tx (refunds creator if unmatched)
  // Creator deposit — frontend join() tx
  creatorWalletAddress?: string
  creatorDepositTxHash?: string
  // Taker deposit — frontend join() tx
  takerWalletAddress?: string
  takerDepositTxHash?: string
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
