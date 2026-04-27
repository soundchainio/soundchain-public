/**
 * Arena Picks — On-chain Escrow Configuration
 *
 * The FantasyLeagueEscrow contract (deployed on Polygon) is the canonical
 * settlement layer for Arena Game Picks. A "pick" is modeled as a 2-team
 * league: maxTeams=2, firstBps=9995, secondBps=0, thirdBps=0, platformBps=5.
 *
 * Lifecycle:
 *   1. Server (commissioner) calls createLeague(...) → emits LeagueCreated → server reads leagueId from receipt
 *   2. Creator calls join(leagueId) {value: entryFee}
 *   3. Taker calls join(leagueId) {value: entryFee}
 *   4. Server calls lock(leagueId)
 *   5. After ESPN final, server calls settle(leagueId, winnerAddress, address(0), address(0))
 *
 * v1 ships POL-only. ERC-20 (OGUN, USDC) requires an approve()+join() bundled UX
 * which is deferred until basic flow is verified on mainnet.
 */
import EscrowAbi from 'contract/FantasyLeagueEscrow.sol/FantasyLeagueEscrow.json'

export const PICKS_ESCROW_ADDRESS = '0x9cCB15833767B956cF55aa805D74c62d08F8acEd'
export const POLYGON_CHAIN_ID = 137
export const POLYGON_CHAIN_HEX = '0x89'

// Public RPC endpoints — use multiple for redundancy.
// Server-side: prefer first (PolygonNode public archive). Client falls back via wallet provider.
export const POLYGON_RPC_URLS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon-rpc.com',
  'https://polygon.llamarpc.com',
] as const

// Native token sentinel — FantasyLeagueEscrow treats address(0) as native POL.
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000'

// Pick payout split — must sum with defaultPlatformBps (5) to 10000.
export const PICK_FIRST_BPS = 9995
export const PICK_SECOND_BPS = 0
export const PICK_THIRD_BPS = 0
export const PICK_PLATFORM_BPS = 5  // 0.05%, matches contract's defaultPlatformBps

export const FANTASY_LEAGUE_ESCROW_ABI = EscrowAbi as any
