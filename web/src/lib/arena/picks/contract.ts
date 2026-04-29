/**
 * Arena Picks — On-chain Escrow Configuration
 *
 * The FantasyLeagueEscrow contract (deployed on Polygon) is the canonical
 * settlement layer for Arena Game Picks. A "pick" is modeled as a 2-team
 * league: maxTeams=2, secondBps=0, thirdBps=0, platformBps=<contract default>.
 * `firstBps` is computed dynamically as 10000 - platformBps so the server
 * stays self-healing if the platform rate is bumped on-chain.
 *
 * Platform fee policy (Apr 28, 2026):
 *   • Arena (picks + fantasy): match FanDuel/DraftKings rake — 5% (500 bps)
 *   • Music side (OGUN streaming, /shop, marketplace, staking, DEX): 0.05% (5 bps)
 *
 * Toggle via Polygonscan: `setDefaultPlatformBps(500)` on FantasyLeagueEscrow
 * (contract owner only). Once bumped, all NEW picks settle at 5% — existing
 * open / pending_deposit picks stay at whatever rate was locked at create time.
 * No retro change.
 *
 * Lifecycle:
 *   1. Server (commissioner) calls createLeague(token, ...) → emits LeagueCreated → server reads leagueId from receipt
 *   2. Creator calls join(leagueId):
 *        - Native: join(leagueId) {value: entryFee}
 *        - ERC-20: erc20.approve(escrow, entryFee) then join(leagueId) (no value)
 *   3. Taker calls join(leagueId) — same dual path
 *   4. Server calls lock(leagueId)
 *   5. After ESPN final, server calls settle(leagueId, winnerAddress, address(0), address(0))
 *
 * Supported wager tokens (Polygon): POL (native), OGUN, USDC, USDT, WETH, LINK, AVAX.
 * Cross-chain tokens unlock when SoundchainPicksEscrow deploys to ZetaChain.
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

export const isNativeToken = (addr: string): boolean =>
  !addr || addr === NATIVE_TOKEN || addr.toLowerCase() === NATIVE_TOKEN.toLowerCase()

// Minimal ERC-20 ABI fragment — only allowance + approve for the join() pre-flight.
export const ERC20_MIN_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
] as const

// Pick payout split — second + third are always 0 for 1v1 picks.
// firstBps is computed at request time as 10000 - platformBps (read from contract);
// see escrowServer.ts → getDefaultPlatformBps + escrowCreatePick. The server passes
// the dynamically computed firstBps to createLeague, so the on-chain split adjusts
// automatically when commissioner runs setDefaultPlatformBps(...) on Polygonscan.
export const PICK_SECOND_BPS = 0
export const PICK_THIRD_BPS = 0

// Default platform-fee rate used as a UI fallback before the API responds with
// the live on-chain value. Updated to 500 bps (5%) Apr 28, 2026 to match
// FanDuel / DraftKings / Pinnacle rake on Arena while music side stays 0.05%.
// The actual rate per-pick is whatever was on-chain at `createLeague` time and
// is stored on the pick doc as `platformFeeBps`.
export const PICK_PLATFORM_BPS_DEFAULT = 500
// Legacy alias — retained for any caller still importing PICK_PLATFORM_BPS.
// Will be removed once all callers migrate to PICK_PLATFORM_BPS_DEFAULT or read
// the per-pick `platformFeeBps` field from the API.
export const PICK_PLATFORM_BPS = PICK_PLATFORM_BPS_DEFAULT

export const FANTASY_LEAGUE_ESCROW_ABI = EscrowAbi as any
