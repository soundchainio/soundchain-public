/**
 * /arena/picks — Sportsbook-style game picks
 *
 * DraftKings meets Web3. Tonight's games across NBA/NHL/MLB/NFL.
 * Pick winners, wager crypto, avatar vs avatar matchup cards.
 * TV-ready: scales beautifully on 60" 4K/8K displays.
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'
import { toast } from 'react-toastify'
import { ethers } from 'ethers'
import { Loader2, Trophy, Zap, TrendingUp, Clock, Check, X, ChevronDown, Wallet, Sparkles, Pencil, Trash2, Coins } from 'lucide-react'
import { TOKEN_CONFIG, LIVE_TOKENS, isTokenLive } from 'lib/arena/fantasy/types'
import { TOKEN_INFO } from 'constants/tokens'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import {
  PICKS_ESCROW_ADDRESS,
  POLYGON_CHAIN_HEX,
  FANTASY_LEAGUE_ESCROW_ABI,
  NATIVE_TOKEN,
  isNativeToken,
  ERC20_MIN_ABI,
  PICK_PLATFORM_BPS_DEFAULT,
} from 'lib/arena/picks/contract'

const OGUN_BONUS_BPS = 1000  // 10% OGUN bonus when wager token is OGUN — paid from rewards pool on settle (commissioner OGUN balance funds it)
// Symbols treated as native POL on the escrow contract.
const NATIVE_TOKEN_SYMBOLS = new Set(['POL', 'MATIC'])
// All Polygon-live wager tokens. POL renders first; LIVE_TOKENS = OGUN, MATIC, USDC, USDT, ETH, LINK, AVAX.
// MATIC is shown as POL via TOKEN_CONFIG[MATIC].label.
const ENABLED_TOKENS: string[] = ['MATIC', 'OGUN', 'USDC', 'USDT', 'ETH', 'LINK', 'AVAX']

// Resolve token symbol → { address, decimals } for client-side signing. address(0) = native POL.
function resolveTokenForSign(symbol: string): { address: string; decimals: number; isNative: boolean } {
  const info = TOKEN_CONFIG[symbol]
  if (!info) throw new Error(`Unknown wager token ${symbol}`)
  const address = NATIVE_TOKEN_SYMBOLS.has(symbol) ? NATIVE_TOKEN : info.address
  return { address, decimals: info.decimals, isNative: isNativeToken(address) }
}

// Resolve EIP-1193 provider with WalletConnect-first preference (per Bug #69 fix).
// Returns provider and the user's address, throws with a user-friendly message on failure.
async function resolveWalletProvider(opts: {
  web3ModalProvider: any
  activeWalletType: string | null
  connectWeb3Modal: () => void | Promise<void>
}): Promise<{ provider: any; address: string }> {
  const injected = (typeof window !== 'undefined' ? (window as any).ethereum : null)
  const provider: any = (opts.activeWalletType === 'web3modal' && opts.web3ModalProvider)
    ? opts.web3ModalProvider
    : injected
  if (!provider) {
    try { await opts.connectWeb3Modal() } catch {}
    throw new Error('Connect a wallet to continue — pick MetaMask, Rainbow, Trust, or Coinbase, then retry')
  }
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  if (!accounts?.[0]) throw new Error('No wallet account available')
  return { provider, address: accounts[0] }
}

async function ensurePolygon(provider: any): Promise<void> {
  const chainId = (await provider.request({ method: 'eth_chainId' })) as string
  if (chainId === POLYGON_CHAIN_HEX) return
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_CHAIN_HEX }] })
  } catch (switchErr: any) {
    if (switchErr?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: POLYGON_CHAIN_HEX,
          chainName: 'Polygon',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
        }],
      })
    } else {
      throw new Error('Switch to Polygon network in your wallet to continue')
    }
  }
}

// Sign escrow.join(leagueId) with the given EIP-1193 provider. Returns the join txHash.
// Native (POL): single TX — escrow.join(leagueId) {value: entryFeeWei}.
// ERC-20 (OGUN, USDC, ...): pre-flight allowance check + erc20.approve() if needed, then escrow.join(leagueId).
async function signEscrowJoin(
  provider: any,
  leagueId: string,
  entryFeeWei: string,
  tokenAddress: string,
): Promise<string> {
  const web3Provider = new ethers.providers.Web3Provider(provider)
  const signer = web3Provider.getSigner()
  const escrow = new ethers.Contract(PICKS_ESCROW_ADDRESS, FANTASY_LEAGUE_ESCROW_ABI, signer)
  const fee = ethers.BigNumber.from(entryFeeWei)

  if (isNativeToken(tokenAddress)) {
    const tx = await escrow.join(leagueId, { value: fee })
    return tx.hash
  }

  // ERC-20 path: skip approve if existing allowance already covers the fee.
  const owner = await signer.getAddress()
  const erc20 = new ethers.Contract(tokenAddress, ERC20_MIN_ABI as any, signer)
  let allowance: ethers.BigNumber = ethers.BigNumber.from(0)
  try { allowance = await erc20.allowance(owner, PICKS_ESCROW_ADDRESS) } catch {}
  if (allowance.lt(fee)) {
    const approveTx = await erc20.approve(PICKS_ESCROW_ADDRESS, fee)
    await approveTx.wait()
  }
  const tx = await escrow.join(leagueId)
  return tx.hash
}

interface Game {
  sport: string; sportLabel: string; sportEmoji: string
  espnGameId: string
  homeTeam: string; awayTeam: string
  homeTeamFull: string; awayTeamFull: string
  homeLogo: string; awayLogo: string
  homeScore: string; awayScore: string
  gameTime: string; state: string; statusDetail: string
  canPick: boolean
}

interface Pick {
  id: string; sport: string
  homeTeam: string; awayTeam: string
  homeTeamFull: string; awayTeamFull: string
  homeLogo: string; awayLogo: string
  creatorHandle: string; creatorPick: 'home' | 'away'
  creatorAvatarUrl?: string | null
  creatorWalletAddress?: string
  creatorDepositTxHash?: string
  takerHandle?: string; takerPick?: 'home' | 'away'
  takerAvatarUrl?: string | null
  takerWalletAddress?: string
  takerDepositTxHash?: string
  entryToken: string; entryFee: number; pot: number
  platformFeeBps?: number  // live on-chain rate locked at createLeague time (Apr 28: 500 bps for Arena)
  status: string; winner?: string; winnerHandle?: string
  finalHomeScore?: number; finalAwayScore?: number
  gameTime: string; gameStatus: string
  // On-chain escrow refs
  escrowContractAddress?: string
  escrowLeagueId?: string
  escrowCreateTxHash?: string
  escrowLockTxHash?: string
  payoutTxHash?: string
}

const SPORT_TABS = [
  { id: 'all', label: 'All Sports', emoji: '🏆' },
  { id: 'nba', label: 'NBA', emoji: '🏀' },
  { id: 'nhl', label: 'NHL', emoji: '🏒' },
  { id: 'mlb', label: 'MLB', emoji: '⚾' },
  { id: 'nfl', label: 'NFL', emoji: '🏈' },
]

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch { return '' }
}

// ─── Matchup Card ──────────────────────────────────────────────
function MatchupCard({ pick, me, onTake, onCancel, onEdit }: { pick: Pick; me: any; onTake: (id: string) => void; onCancel: (id: string) => void; onEdit: (pick: Pick) => void }) {
  const myHandle = me?.profile?.userHandle || me?.handle || ''
  const isCreator = pick.creatorHandle === myHandle
  const isTaker = pick.takerHandle === myHandle
  const isSettled = pick.status === 'settled'
  const isMatched = pick.status === 'matched'
  const isOpen = pick.status === 'open'
  const isPendingDeposit = pick.status === 'pending_deposit'
  const iWon = isSettled && pick.winnerHandle === myHandle
  // Live cosmetic detection — pick.gameStatus is from ESPN ('STATUS_IN_PROGRESS' / 'in' / 'LIVE' etc.)
  const isLive = !isSettled && /live|in.progress|in_progress|^in$/i.test(pick.gameStatus || '')

  const creatorTeam = pick.creatorPick === 'home' ? pick.homeTeam : pick.awayTeam
  const creatorLogo = pick.creatorPick === 'home' ? pick.homeLogo : pick.awayLogo
  const takerTeam = pick.takerPick === 'home' ? pick.homeTeam : pick.awayTeam
  const takerLogo = pick.takerPick === 'home' ? pick.homeLogo : pick.awayLogo

  return (
    <div className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 backdrop-blur-sm ${
      isSettled
        ? iWon
          ? 'border-yellow-500/50 shadow-2xl shadow-yellow-500/30'
          : 'border-gray-700/50 opacity-80'
        : isLive ? 'border-red-500/50 shadow-2xl shadow-red-500/25'
        : isMatched ? 'border-amber-500/40 shadow-xl shadow-amber-500/15'
        : isPendingDeposit ? 'border-purple-500/40 shadow-xl shadow-purple-500/15'
        : 'border-cyan-500/30 shadow-xl shadow-cyan-500/10 hover:border-cyan-400/60 hover:shadow-cyan-400/30'
    }`}>
      {/* Conic-gradient running-light halo — appears on hover for open/matched picks (premium card-frame signal) */}
      {!isSettled && !isLive && <span className="arena-conic-ring" aria-hidden />}
      {/* Won state gets a permanent gold halo */}
      {iWon && <span className="arena-won-ring" aria-hidden />}
      {/* Live state gets a red glow shadow underneath the whole card */}
      {isLive && (
        <span className="absolute -inset-px rounded-2xl pointer-events-none animate-pulse" aria-hidden style={{
          boxShadow: '0 0 32px rgba(239,68,68,0.45), inset 0 0 24px rgba(239,68,68,0.08)'
        }} />
      )}
      {/* Header — sport + game info + creator controls (DK pattern: time/league pill top-left, status top-right) */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-white/5">
        <span className="flex items-center gap-2 text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider tabular-nums">
          <span className="text-gray-500">{pick.sport.toUpperCase()}</span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-300">{formatTime(pick.gameTime)}</span>
        </span>
        <div className="flex items-center gap-2">
          {/* Creator chevrons — edit only pre-deposit (entry fee is on-chain immutable post-deposit). Cancel always (refunds via escrow.cancel when funds are staked). */}
          {isCreator && !pick.takerHandle && (isOpen || isPendingDeposit) && (
            <>
              {isPendingDeposit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(pick) }}
                  className="p-1 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-gray-700 hover:border-cyan-500/50 transition-all"
                  title="Edit wager (pre-deposit only)"
                  aria-label="Edit pick"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(isOpen ? 'Cancel this pick? Your stake will be refunded on-chain.' : 'Delete this pending pick?')) onCancel(pick.id) }}
                className="p-1 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/50 transition-all"
                title={isOpen ? 'Cancel + refund stake' : 'Delete pick'}
                aria-label="Cancel pick"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {/* Status pill — DK/FD taxonomy: LIVE (red pulsing dot) > FINAL > LOCKED IN > AWAITING STAKE > OPEN */}
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/20 text-red-400 ring-1 ring-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.4)]">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
              LIVE
            </span>
          ) : (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isSettled
                ? iWon ? 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40' : 'bg-gray-700 text-gray-300'
                : isMatched ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40 animate-pulse'
                : isPendingDeposit ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40'
                : 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40'
            }`}>
              {isSettled ? (iWon ? '🏆 WON' : 'FINAL') : isMatched ? 'LOCKED IN' : isPendingDeposit ? 'AWAITING STAKE' : 'OPEN'}
            </span>
          )}
        </div>
      </div>

      {/* VS Card — avatar vs avatar */}
      <div className="bg-gradient-to-b from-gray-900/95 to-black p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Creator side */}
          <div className="flex-1 text-center">
            <div className="relative inline-block mb-1">
              {creatorLogo ? (
                <img src={creatorLogo} alt={creatorTeam} className="w-14 h-14 lg:w-20 lg:h-20 object-contain mx-auto" />
              ) : (
                <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto text-2xl font-black text-cyan-400">{creatorTeam.charAt(0)}</div>
              )}
              {/* Creator user avatar — small overlay bottom-left of team logo */}
              {pick.creatorAvatarUrl ? (
                <img src={pick.creatorAvatarUrl} alt={`@${pick.creatorHandle}`} className="absolute -bottom-1 -left-1 w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-gray-900 object-cover bg-gray-800" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              ) : (
                <div className="absolute -bottom-1 -left-1 w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-gray-900 bg-cyan-500/30 flex items-center justify-center text-[10px] font-black text-cyan-300">
                  {pick.creatorHandle.charAt(0).toUpperCase()}
                </div>
              )}
              {isSettled && pick.winner === pick.creatorPick && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5 text-black" />
                </div>
              )}
            </div>
            <p className="text-[10px] lg:text-xs text-cyan-400 font-bold truncate mt-1">@{pick.creatorHandle}</p>
            {isSettled && pick.creatorPick === 'home' && <p className="text-lg font-black text-white mt-1">{pick.finalHomeScore}</p>}
            {isSettled && pick.creatorPick === 'away' && <p className="text-lg font-black text-white mt-1">{pick.finalAwayScore}</p>}
          </div>

          {/* VS divider — tabular numerics for the wager (DK signature), pulsing halo on live, holographic crown on win */}
          <div className="flex flex-col items-center gap-1 px-2">
            <div className={`relative w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-all ${
              isLive
                ? 'arena-live-halo bg-gradient-to-br from-red-500 to-orange-600 shadow-[0_0_24px_rgba(239,68,68,0.7)] ring-2 ring-red-400/60'
                : isSettled
                  ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 shadow-[0_0_24px_rgba(251,191,36,0.6)] ring-2 ring-yellow-300/60'
                  : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 ring-1 ring-amber-300/30'
            }`}>
              <span className="text-sm lg:text-lg font-black text-black tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">VS</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] lg:text-xs font-black text-amber-400 tabular-nums leading-tight">
                {pick.entryFee} <span className="text-amber-300/80 font-mono text-[9px] lg:text-[10px]">{pick.entryToken}</span>
              </p>
              {isMatched && (
                <p className="text-[8px] lg:text-[10px] text-emerald-400/80 tabular-nums font-mono">
                  POT <span className="font-bold">{pick.pot}</span>
                </p>
              )}
            </div>
          </div>

          {/* Taker side */}
          <div className="flex-1 text-center">
            {pick.takerHandle ? (
              <>
                <div className="relative inline-block mb-2">
                  {takerLogo ? (
                    <img src={takerLogo} alt={takerTeam} className="w-14 h-14 lg:w-20 lg:h-20 object-contain mx-auto" />
                  ) : (
                    <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto text-2xl font-black text-purple-400">{takerTeam?.charAt(0) || '?'}</div>
                  )}
                  {/* Taker user avatar — small overlay bottom-right */}
                  {pick.takerAvatarUrl ? (
                    <img src={pick.takerAvatarUrl} alt={`@${pick.takerHandle}`} className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-gray-900 object-cover bg-gray-800" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                  ) : (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-gray-900 bg-purple-500/30 flex items-center justify-center text-[10px] font-black text-purple-300">
                      {(pick.takerHandle || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isSettled && pick.winner === pick.takerPick && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-black" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] lg:text-xs text-purple-400 truncate mt-1">@{pick.takerHandle}</p>
                {pick.takerWalletAddress && (
                  <p className="text-[8px] lg:text-[10px] text-emerald-400/80 truncate font-mono" title={`Signed by ${pick.takerWalletAddress}`}>
                    ✓ {pick.takerWalletAddress.slice(0, 6)}…{pick.takerWalletAddress.slice(-4)}
                  </p>
                )}
                {isSettled && pick.takerPick === 'home' && <p className="text-lg font-black text-white mt-1">{pick.finalHomeScore}</p>}
                {isSettled && pick.takerPick === 'away' && <p className="text-lg font-black text-white mt-1">{pick.finalAwayScore}</p>}
              </>
            ) : (
              <div className="flex flex-col items-center">
                {/* Waiting placeholder — animated pulsing dashed ring (the slot where the opponent will appear) */}
                <div className="relative w-14 h-14 lg:w-20 lg:h-20 mb-2">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-600 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl text-gray-500 font-mono font-light">?</span>
                  </div>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Waiting...</p>
                {!isCreator && me?.profile && (
                  <button
                    onClick={() => onTake(pick.id)}
                    className="relative mt-2 px-4 py-1.5 text-xs font-black bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_28px_rgba(168,85,247,0.6)] ring-1 ring-cyan-300/50 overflow-hidden arena-shimmer"
                  >
                    <span className="relative z-10 font-mono uppercase tracking-wider">TAKE {pick.creatorPick === 'home' ? pick.awayTeam : pick.homeTeam}</span>
                  </button>
                )}
                {/* Creator controls — share + cancel */}
                {isCreator && isOpen && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/arena/picks?take=${pick.id}`
                        if (navigator.share) {
                          try { await navigator.share({ title: `${creatorTeam} vs ${pick.creatorPick === 'home' ? pick.awayTeam : pick.homeTeam} — ${pick.entryFee} ${pick.entryToken}`, url }) } catch {}
                        } else {
                          await navigator.clipboard.writeText(url)
                          toast.success('Pick link copied — send to your opponent!')
                        }
                      }}
                      className="px-3 py-1 text-[10px] font-bold text-gray-400 hover:text-cyan-400 border border-gray-700 hover:border-cyan-500/50 rounded-full transition-all"
                    >
                      📤 SHARE
                    </button>
                    <button
                      onClick={() => { if (confirm('Cancel this pick?')) onCancel(pick.id) }}
                      className="px-3 py-1 text-[10px] font-bold text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-500/50 rounded-full transition-all"
                    >
                      ✕ CANCEL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result banner — premium celebration: holographic shimmer for the winner, gradient confetti sparks raining for own win */}
        {isSettled && pick.winnerHandle && (
          <div className={`relative mt-3 text-center py-3 rounded-lg border overflow-hidden ${
            iWon
              ? 'arena-shimmer bg-gradient-to-r from-yellow-500/25 via-amber-500/35 to-yellow-500/25 border-yellow-400/60 shadow-[0_0_30px_rgba(234,179,8,0.35)]'
              : 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30'
          }`}>
            {/* Confetti sparks rain on personal win */}
            {iWon && (
              <>
                <span className="arena-confetti-spark s1" aria-hidden />
                <span className="arena-confetti-spark s2" aria-hidden />
                <span className="arena-confetti-spark s3" aria-hidden />
              </>
            )}
            <p className={`relative text-xs font-black tabular-nums ${iWon ? 'text-yellow-200' : 'text-yellow-400'}`}>
              <Trophy className={`w-3.5 h-3.5 inline mr-1.5 ${iWon ? 'animate-bounce text-yellow-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''}`} />
              <span className={iWon ? 'arena-hologram-text font-black' : ''}>@{pick.winnerHandle}</span>
              <span className="text-yellow-300/70 mx-1">wins</span>
              <span className={`tabular-nums ${iWon ? 'text-yellow-100' : 'text-amber-200'}`}>
                {(pick.pot * (10000 - (pick.platformFeeBps ?? PICK_PLATFORM_BPS_DEFAULT)) / 10000).toFixed(4)}
              </span>
              <span className="text-amber-300/80 font-mono ml-1">{pick.entryToken}</span>
            </p>
          </div>
        )}
      </div>

      {/* BEARER TICKET FOOTER — Vegas-style trust strip: leagueId + tx, Polygonscan deeplink, monospace tabular.
          Only renders when on-chain refs exist (post-create). The card IS the ticket. */}
      {(pick.escrowLeagueId || pick.payoutTxHash || pick.escrowCreateTxHash) && (
        <div className="border-t border-dashed border-gray-700/60 bg-black/40 px-3 py-1.5 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wider">
          <span className="text-gray-500 truncate">
            {pick.escrowLeagueId && (
              <>LEAGUE <span className="text-cyan-400 tabular-nums">#{pick.escrowLeagueId}</span></>
            )}
          </span>
          {(pick.payoutTxHash || pick.escrowCreateTxHash) && (
            <a
              href={`https://polygonscan.com/tx/${pick.payoutTxHash || pick.escrowCreateTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-emerald-400/80 hover:text-emerald-300 hover:underline truncate flex-shrink-0"
              title="Verify on Polygonscan"
            >
              {(pick.payoutTxHash || pick.escrowCreateTxHash || '').slice(0, 8)}…{(pick.payoutTxHash || pick.escrowCreateTxHash || '').slice(-4)} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Game Card (for creating picks) ────────────────────────────
function GameCard({ game, onPick }: { game: Game; onPick: (game: Game, side: 'home' | 'away') => void }) {
  const isLive = game.state === 'in'
  const isFinal = game.state === 'post'
  // Score-leader detection so we can highlight the leading side (FD pattern: green on the winning leg)
  const awayLeading = (isLive || isFinal) && (game.awayScore ?? 0) > (game.homeScore ?? 0)
  const homeLeading = (isLive || isFinal) && (game.homeScore ?? 0) > (game.awayScore ?? 0)

  return (
    <div className={`rounded-xl border p-3 lg:p-4 transition-all ${
      isLive ? 'border-red-500/50 bg-red-500/5 shadow-lg shadow-red-500/10' :
      isFinal ? 'border-gray-700/30 bg-gray-900/50 opacity-60' :
      'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] lg:text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
          {game.sportEmoji} {game.sportLabel}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1 text-[10px] lg:text-xs font-mono font-black text-red-400 uppercase tracking-wider tabular-nums">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
            LIVE · {game.statusDetail}
          </span>
        ) : isFinal ? (
          <span className="text-[10px] lg:text-xs font-mono font-black text-gray-500 uppercase tracking-wider">FINAL</span>
        ) : (
          <span className="text-[10px] lg:text-xs font-mono font-bold text-gray-400 uppercase tracking-wider tabular-nums">
            {formatTime(game.gameTime)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* Away team — DK pattern: tap-to-bet on team rows themselves */}
        <button
          onClick={() => game.canPick && onPick(game, 'away')}
          disabled={!game.canPick}
          className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-all ${
            game.canPick ? 'hover:bg-cyan-500/10 hover:ring-1 hover:ring-cyan-500/30 cursor-pointer active:scale-95' : 'cursor-default'
          } ${awayLeading ? 'bg-emerald-500/[0.04]' : ''}`}
        >
          {game.awayLogo && <img src={game.awayLogo} alt={game.awayTeamFull} title={game.awayTeamFull} className="w-8 h-8 lg:w-12 lg:h-12 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
          {/* Text block — mobile only. Desktop relies on logo alone (mobile screenshot Frank approved Apr 29 keeps these labels; desktop grid is too narrow). */}
          <div className="text-left min-w-0 lg:hidden">
            <p className="text-sm font-black text-white truncate">{game.awayTeam}</p>
            <p className="text-[9px] text-gray-500 truncate">{game.awayTeamFull}</p>
          </div>
          {(isLive || isFinal) && (
            <span className={`text-lg lg:text-xl font-black ml-auto tabular-nums ${awayLeading ? 'text-emerald-300' : 'text-white'}`}>
              {game.awayScore}
            </span>
          )}
        </button>

        <span className="text-gray-600 text-xs font-mono font-bold px-1">@</span>

        {/* Home team */}
        <button
          onClick={() => game.canPick && onPick(game, 'home')}
          disabled={!game.canPick}
          className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-all ${
            game.canPick ? 'hover:bg-purple-500/10 hover:ring-1 hover:ring-purple-500/30 cursor-pointer active:scale-95' : 'cursor-default'
          } ${homeLeading ? 'bg-emerald-500/[0.04]' : ''}`}
        >
          {game.homeLogo && <img src={game.homeLogo} alt={game.homeTeamFull} title={game.homeTeamFull} className="w-8 h-8 lg:w-12 lg:h-12 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
          {/* Text block — mobile only. Desktop logo-only per Apr 29 desktop card-overlap fix. */}
          <div className="text-left min-w-0 lg:hidden">
            <p className="text-sm font-black text-white truncate">{game.homeTeam}</p>
            <p className="text-[9px] text-gray-500 truncate">{game.homeTeamFull}</p>
          </div>
          {(isLive || isFinal) && (
            <span className={`text-lg lg:text-xl font-black ml-auto tabular-nums ${homeLeading ? 'text-emerald-300' : 'text-white'}`}>
              {game.homeScore}
            </span>
          )}
        </button>
      </div>

      {game.canPick && (
        <p className="text-[9px] text-center text-gray-600 mt-2 font-mono uppercase tracking-wider">
          Tap a team to wager
        </p>
      )}
    </div>
  )
}

// ─── Create Pick Modal ─────────────────────────────────────────
function CreatePickModal({ game, side, onClose, onCreated }: { game: Game; side: 'home' | 'away'; onClose: () => void; onCreated: () => void }) {
  const [token, setToken] = useState<string>(ENABLED_TOKENS[0])
  const [amount, setAmount] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'idle' | 'creating' | 'awaiting_signature' | 'finalizing'>('idle')
  const [payoutFlash, setPayoutFlash] = useState(false)
  const { connectWeb3Modal, activeWalletType, web3ModalProvider, activeAddress } = useUnifiedWallet()
  const isExternalWalletReady = activeWalletType === 'web3modal' && !!web3ModalProvider && !!activeAddress
  const isMagicWallet = activeWalletType === 'magic' || (!isExternalWalletReady && !!activeAddress)
  const shortAddr = activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : null

  // FD pattern — odds/payout briefly flash cyan when the user changes amount or token. Cheap, hugely tactile.
  useEffect(() => {
    setPayoutFlash(true)
    const t = setTimeout(() => setPayoutFlash(false), 350)
    return () => clearTimeout(t)
  }, [amount, token])

  const team = side === 'home' ? game.homeTeam : game.awayTeam
  const teamFull = side === 'home' ? game.homeTeamFull : game.awayTeamFull
  const logo = side === 'home' ? game.homeLogo : game.awayLogo
  const opponent = side === 'home' ? game.awayTeam : game.homeTeam

  const submit = async () => {
    setSubmitting(true)
    let createdPickId: string | null = null
    try {
      // Step 1: server creates on-chain league + MongoDB doc with status=pending_deposit
      setStep('creating')
      const r = await fetch('/api/arena/picks', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: game.sport, espnGameId: game.espnGameId, pick: side, entryToken: token, entryFee: amount }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Failed'); return }
      const pickId: string = d.pick.id
      createdPickId = pickId
      const { leagueId, entryFeeWei, tokenAddress: respTokenAddress } = d.requiresDeposit || {}
      if (!leagueId || !entryFeeWei) { toast.error('Server response missing on-chain params'); return }
      // tokenAddress falls back to local resolver for older server responses
      const tokenAddress = respTokenAddress || resolveTokenForSign(token).address

      // Step 2: creator signs escrow.join(leagueId) with their own wallet
      setStep('awaiting_signature')
      const { provider, address } = await resolveWalletProvider({ web3ModalProvider, activeWalletType, connectWeb3Modal })
      await ensurePolygon(provider)
      const stakeMsg = isNativeToken(tokenAddress)
        ? `Confirm in wallet — depositing ${amount} ${token} stake to escrow`
        : `Confirm in wallet — approving + depositing ${amount} ${token} stake to escrow (2 signatures)`
      const sigToast = toast.loading(stakeMsg)
      let txHash: string
      try {
        txHash = await signEscrowJoin(provider, leagueId, entryFeeWei, tokenAddress)
      } catch (e: any) {
        toast.dismiss(sigToast)
        const cancelled = e?.code === 4001 || /reject|denied|cancel/i.test(e?.message || '')
        toast.error(cancelled ? 'Stake deposit cancelled in wallet — pick will auto-clean in 30 min' : (e?.message || 'Stake deposit failed'))
        return
      }
      toast.dismiss(sigToast)

      // Step 3: tell server to verify on-chain join + flip status to 'open'.
      // Brief delay to give the chain a moment to confirm the tx so escrowHasJoined returns true.
      setStep('finalizing')
      await new Promise(r => setTimeout(r, 4000))
      const finalize = await fetch(`/api/arena/picks/${pickId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deposit', txHash, walletAddress: address }),
      })
      const fd = await finalize.json()
      if (!finalize.ok) {
        toast.error(`On-chain stake confirmed but server couldn't verify yet: ${fd.error}. Refresh in a few seconds — your pick will appear once verified.`, { autoClose: 14000 })
        return
      }
      toast.success(`Pick LIVE on-chain · ${team} to win · tx ${txHash.slice(0, 10)}…`, { autoClose: 8000 })
      onCreated()
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false); setStep('idle') }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      {/* Layered backdrop — black + radial cyan/purple bloom + grain. The modal feels like it's emerging from a portal */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(34,211,238,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 35% at 50% 50%, rgba(168,85,247,0.10) 0%, transparent 70%)'
        }}
      />
      <div className="group relative w-full max-w-sm bg-gradient-to-b from-gray-900 via-gray-950 to-black border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Conic running-light ring around the modal frame — premium signal */}
        <span className="arena-conic-ring" aria-hidden style={{ opacity: 1 }} />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black arena-hologram-text tracking-tight">Create Pick</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white hover:rotate-90 transition-all"><X className="w-5 h-5" /></button>
          </div>

          {/* Team picked — shimmering panel showing the chosen side */}
          <div className="relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/15 via-cyan-500/10 to-purple-500/10 border border-cyan-500/30 mb-4 overflow-hidden">
            {logo && <img src={logo} alt="" className="relative w-12 h-12 object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]" />}
            <div className="relative">
              <p className="text-base font-black text-white tracking-tight">{team} <span className="text-cyan-400">to WIN</span></p>
              <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">vs {opponent} · {formatTime(game.gameTime)}</p>
            </div>
          </div>

          {/* Signing wallet status — explicit per-modal so user knows which wallet will execute the on-chain stake.
              Magic OAuth = warning (Magic RPC is broken for L2 sends per feedback_oauth_send_broken.md).
              Web3Modal connected = green check + truncated address.
              Nothing connected = prominent CTA to open Web3Modal. */}
          <div className="mb-4">
            {isExternalWalletReady ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[10px] font-mono text-emerald-300 truncate">SIGNING · {shortAddr}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { try { connectWeb3Modal() } catch {} }}
                  className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 tracking-widest"
                >
                  SWITCH
                </button>
              </div>
            ) : isMagicWallet ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Wallet className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-bold text-amber-300 leading-tight">CONNECT EXTERNAL WALLET</p>
                    <p className="text-[9px] text-amber-300/70 leading-tight truncate">Magic RPC is broken for on-chain stakes — connect MetaMask / Coinbase / Rainbow / Trust to sign</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { try { connectWeb3Modal() } catch {} }}
                  className="flex-shrink-0 text-[9px] font-mono font-black text-black bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded tracking-widest transition-colors"
                >
                  CONNECT
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { try { connectWeb3Modal() } catch {} }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/40 hover:border-cyan-400/60 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono font-black text-cyan-300 tracking-widest">CONNECT WALLET TO PLACE PICK</span>
              </button>
            )}
          </div>

          {/* Token + Amount */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-gray-400">Wager Token</span>
              <select value={token} onChange={e => setToken(e.target.value)} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {ENABLED_TOKENS.map(t => {
                  const info = TOKEN_INFO[t as keyof typeof TOKEN_INFO]
                  const label = TOKEN_CONFIG[t]?.label || t
                  return (
                    <option key={t} value={t} className="bg-gray-900">
                      {info?.icon || ''} {label}{t === 'OGUN' ? ' ✨' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Wager Amount</span>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" min={1} />
            </label>
          </div>

          {/* Quick amounts — FD stake-chip pattern */}
          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all active:scale-95 tabular-nums ${
                  amount === a
                    ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(34,211,238,0.55)] ring-1 ring-cyan-300'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {token === 'OGUN' && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-[10px] lg:text-xs text-amber-300 font-bold leading-tight tabular-nums">
                +{OGUN_BONUS_BPS / 100}% OGUN bonus to winner — paid from rewards pool on settle
              </p>
            </div>
          )}

          {/* Live payout calc — FD odds-flash pattern: brief cyan glow on every input change */}
          <div className={`text-center mb-4 py-2.5 rounded-lg border transition-all duration-200 ${
            payoutFlash
              ? 'border-cyan-400/50 bg-cyan-500/[0.07] shadow-[0_0_24px_rgba(34,211,238,0.35)]'
              : 'border-gray-800 bg-black/20'
          }`}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">WINNER TAKES</p>
            <p className={`text-xl font-black tabular-nums transition-colors ${payoutFlash ? 'text-cyan-300' : 'text-white'}`}>
              {(amount * 2 * (10000 - PICK_PLATFORM_BPS_DEFAULT) / 10000).toFixed(4)} <span className="text-amber-400 text-base font-mono">{token}</span>
            </p>
            <p className="text-[9px] font-mono text-gray-600 mt-1 tracking-wider">
              {(PICK_PLATFORM_BPS_DEFAULT / 100)}% PLATFORM RAKE · ON-CHAIN ESCROW POLYGON
            </p>
          </div>

          {/* CTA — stage-aware. Clean idle. Spinner mid-flight. Always tabular nums on the amount. */}
          <button
            onClick={submit}
            disabled={submitting || amount <= 0}
            className={`w-full py-3 text-sm font-black rounded-xl transition-all active:scale-95 disabled:opacity-50 tabular-nums ${
              submitting
                ? 'bg-gray-800 text-cyan-300 cursor-wait'
                : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white hover:scale-[1.02] shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2 font-mono uppercase tracking-wider text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                {step === 'creating' && '[1/3] CREATING ON-CHAIN LEAGUE'}
                {step === 'awaiting_signature' && '[2/3] CONFIRM IN WALLET'}
                {step === 'finalizing' && '[3/3] VERIFYING ON-CHAIN'}
                {step === 'idle' && 'WORKING'}
              </span>
            ) : (
              <span className="font-mono uppercase tracking-wider">PLACE PICK · {amount} {token}</span>
            )}
          </button>

          {/* Trust strip — Vegas bearer-ticket pattern; reinforces "this is real money on a real ledger" */}
          <p className="text-[9px] font-mono text-center text-gray-600 mt-3 uppercase tracking-wider">
            Stake locked in <span className="text-emerald-500/80">FantasyLeagueEscrow</span> · auto-settles via ESPN final
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Pick Modal — creator-only, wager amount + token (team is locked) ─────
function EditPickModal({ pick, onClose, onSaved }: { pick: Pick; onClose: () => void; onSaved: () => void }) {
  const [token, setToken] = useState(pick.entryToken)
  const [amount, setAmount] = useState(pick.entryFee)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch(`/api/arena/picks/${pick.id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', entryToken: token, entryFee: amount }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Failed'); return }
      toast.success('Pick updated')
      onSaved()
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const creatorTeam = pick.creatorPick === 'home' ? pick.homeTeam : pick.awayTeam
  const opponent = pick.creatorPick === 'home' ? pick.awayTeam : pick.homeTeam

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(34,211,238,0.10) 0%, transparent 60%), radial-gradient(ellipse 50% 35% at 50% 50%, rgba(168,85,247,0.08) 0%, transparent 70%)'
        }}
      />
      <div className="group relative w-full max-w-sm bg-gradient-to-b from-gray-900 via-gray-950 to-black border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden" onClick={e => e.stopPropagation()}>
        <span className="arena-conic-ring" aria-hidden style={{ opacity: 1 }} />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black arena-hologram-text tracking-tight">Edit Wager</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white hover:rotate-90 transition-all"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/15 via-cyan-500/10 to-purple-500/10 border border-cyan-500/30 mb-4">
            <p className="text-sm font-black text-white tracking-tight">{creatorTeam} <span className="text-cyan-400">to WIN</span></p>
            <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">vs {opponent} · team locked, edit wager only</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-gray-400">Wager Token</span>
              <select value={token} onChange={e => setToken(e.target.value)} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {ENABLED_TOKENS.map(t => {
                  const info = TOKEN_INFO[t as keyof typeof TOKEN_INFO]
                  const label = TOKEN_CONFIG[t]?.label || t
                  return (
                    <option key={t} value={t} className="bg-gray-900">
                      {info?.icon || ''} {label}{t === 'OGUN' ? ' ✨' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Wager Amount</span>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" min={1} />
            </label>
          </div>

          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map(a => (
              <button key={a} onClick={() => setAmount(a)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${amount === a ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {a}
              </button>
            ))}
          </div>

          <button onClick={submit} disabled={submitting || amount <= 0} className="w-full py-3 text-sm font-black bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/20">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `SAVE — ${amount} ${token}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────
export default function ArenaPicksPage() {
  const me = useMe()
  const router = useRouter()
  // Arena = L2 = WalletConnect-first per Frank's directive (kill Magic OAuth RPC for wagers)
  const { connectWeb3Modal, activeWalletType, web3ModalProvider } = useUnifiedWallet()
  const [tab, setTab] = useState('all')
  const [view, setView] = useState<'games' | 'picks' | 'my'>('games')
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [pickModal, setPickModal] = useState<{ game: Game; side: 'home' | 'away' } | null>(null)
  const [editModal, setEditModal] = useState<Pick | null>(null)

  // Deep link: ?take=pickId — auto-switch to Open Picks view
  useEffect(() => {
    if (router.query.take) setView('picks')
  }, [router.query.take])

  const loadGames = useCallback(async () => {
    try {
      const url = tab === 'all' ? '/api/arena/picks/games' : `/api/arena/picks/games?sport=${tab}`
      const r = await fetch(url)
      const d = await r.json()
      setGames(d.games || [])
    } catch {}
  }, [tab])

  const loadPicks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (tab !== 'all') params.set('sport', tab)
      if (view === 'my') params.set('mine', 'true')
      else params.set('status', 'open')
      const r = await fetch(`/api/arena/picks?${params}`, { credentials: 'include' })
      const d = await r.json()
      setPicks(d.picks || [])
    } catch {}
  }, [tab, view])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadGames(), loadPicks()]).finally(() => setLoading(false))
  }, [loadGames, loadPicks])

  // Auto-refresh every 60s
  useEffect(() => {
    const i = setInterval(() => { loadGames(); loadPicks() }, 60000)
    return () => clearInterval(i)
  }, [loadGames, loadPicks])

  const handleTake = async (pickId: string) => {
    const pick = picks.find(p => p.id === pickId)
    if (!pick) { toast.error('Pick not found'); return }
    if (!pick.escrowLeagueId) { toast.error('This pick is missing on-chain data — refresh and retry'); return }

    const takerTeam = pick.creatorPick === 'home' ? pick.awayTeam : pick.homeTeam

    // Step 1: resolve provider, switch to Polygon
    let provider: any, address: string
    try {
      const r = await resolveWalletProvider({ web3ModalProvider, activeWalletType, connectWeb3Modal })
      provider = r.provider
      address = r.address
    } catch (e: any) {
      toast.info(e?.message || 'Wallet connection required', { autoClose: 9000 })
      return
    }
    try { await ensurePolygon(provider) } catch (e: any) {
      toast.error(e?.message || 'Could not switch to Polygon')
      return
    }

    // Step 2: sign escrow.join(leagueId) with full entryFee staked (native or ERC-20 dual path)
    let tokenInfo: { address: string; decimals: number; isNative: boolean }
    try {
      tokenInfo = resolveTokenForSign(pick.entryToken)
    } catch (e: any) {
      toast.error(e?.message || `Unknown wager token ${pick.entryToken}`)
      return
    }
    const entryFeeWei = ethers.utils.parseUnits(String(pick.entryFee), tokenInfo.decimals).toString()
    const stakeMsg = tokenInfo.isNative
      ? `Confirm in wallet — staking ${pick.entryFee} ${pick.entryToken} on ${takerTeam}`
      : `Confirm in wallet — approving + staking ${pick.entryFee} ${pick.entryToken} on ${takerTeam} (2 signatures)`
    const sigToast = toast.loading(stakeMsg)
    let txHash: string
    try {
      txHash = await signEscrowJoin(provider, pick.escrowLeagueId, entryFeeWei, tokenInfo.address)
    } catch (e: any) {
      toast.dismiss(sigToast)
      const cancelled = e?.code === 4001 || /reject|denied|cancel/i.test(e?.message || '')
      toast.error(cancelled ? 'Take cancelled in wallet' : (e?.reason || e?.message || 'Transaction failed'))
      return
    }
    toast.dismiss(sigToast)

    // Step 3: server verifies on-chain join, signs lock(), flips MongoDB to 'matched'.
    // Brief delay so the chain has a moment to confirm.
    const verifyToast = toast.loading('Stake confirmed — locking on-chain match…')
    await new Promise(r => setTimeout(r, 4000))
    try {
      const r = await fetch(`/api/arena/picks/${pickId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take', txHash, walletAddress: address }),
      })
      const d = await r.json()
      toast.dismiss(verifyToast)
      if (!r.ok) {
        const dbg = d.debug ? ` [server sees you as @${d.debug.yourHandle} · ${String(d.debug.yourProfileId).slice(-6)} | creator @${d.debug.creatorHandle} · ${String(d.debug.creatorProfileId).slice(-6)}]` : ''
        toast.error(`${d.error || 'Failed'}${dbg}`, { autoClose: 14000 })
        return
      }
      toast.success(`MATCHED on-chain · ${takerTeam} · stake ${pick.entryFee} ${pick.entryToken} · tx ${txHash.slice(0, 10)}…`, { autoClose: 10000 })
      loadPicks()
    } catch (e: any) {
      toast.dismiss(verifyToast)
      toast.error(e.message)
    }
  }

  const handleCancel = async (pickId: string) => {
    try {
      const r = await fetch(`/api/arena/picks/${pickId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Failed'); return }
      toast.success('Pick cancelled')
      loadPicks()
    } catch (e: any) { toast.error(e.message) }
  }

  // Aggregate counts for tab + view badges (DK/FD pattern: lobby header always tells you what's hot)
  const livePickCount = picks.filter(p => p.status === 'matched' && /live|in/i.test(p.gameStatus || '')).length
  const openPickCount = picks.filter(p => p.status === 'open' && !p.takerHandle).length
  const myPickCount = picks.filter(p => {
    const h = me?.profile?.userHandle || me?.handle || ''
    return p.creatorHandle === h || p.takerHandle === h
  }).length
  const liveGameCount = games.filter(g => g.state === 'in').length
  const totalEscrowed = picks.reduce((acc, p) => acc + (p.status === 'matched' || p.status === 'open' ? p.entryFee : 0), 0)
  const sportCount = (id: string) => id === 'all' ? picks.length + games.length : (picks.filter(p => p.sport === id).length + games.filter(g => g.sport === id).length)

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Arena high-end graphics framework lives in globals.css (.arena-* classes). */}

      {/* Ambient layered atmosphere — mesh + grid + grain. Pinned, non-interactive, no scroll cost. */}
      <div className="fixed inset-0 arena-mesh-bg pointer-events-none" aria-hidden />
      <div className="fixed inset-0 arena-grid-overlay pointer-events-none" aria-hidden />
      <div className="fixed inset-0 arena-grain-overlay pointer-events-none" aria-hidden />

      {/* Big-board live ticker — DK/Vegas inspired: aggregate counts, tabular nums, neon. Hides on small empty boards. */}
      {(livePickCount + liveGameCount + openPickCount > 0) && (
        <div className="border-b border-cyan-500/20 bg-gradient-to-r from-black via-cyan-950/20 to-black backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4 lg:gap-6 overflow-x-auto scrollbar-hide text-[10px] lg:text-xs font-mono uppercase tracking-wider whitespace-nowrap">
            {liveGameCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="font-bold tabular-nums">{liveGameCount}</span> GAME{liveGameCount === 1 ? '' : 'S'} LIVE
              </span>
            )}
            {livePickCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <span className="font-bold tabular-nums">{livePickCount}</span> LOCKED-IN LIVE
              </span>
            )}
            {openPickCount > 0 && (
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="font-bold tabular-nums">{openPickCount}</span> OPEN PICKS
              </span>
            )}
            {totalEscrowed > 0 && (
              <span className="flex items-center gap-1.5 text-purple-400 ml-auto">
                <span className="font-bold tabular-nums">{totalEscrowed.toFixed(0)}</span> IN ESCROW
              </span>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 py-6 relative z-10">
        {/* Hero — full holographic foil title + animated underline + tagline. The first thing users see, the first thing that has to wow. */}
        <div className="mb-6 relative">
          {/* Glow bloom behind the title — subtle radial bloom adds depth */}
          <div className="absolute -inset-4 -z-10 rounded-3xl blur-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10 pointer-events-none" aria-hidden />
          <h1 className="arena-hologram-text text-3xl lg:text-5xl font-black tracking-tight inline-block leading-none">
            ARENA PICKS
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-0.5 w-12 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-full shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
            <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-[0.25em]">L2 · POLYGON · ON-CHAIN</span>
          </div>
          <p className="text-gray-400 text-xs lg:text-sm mt-3 font-mono uppercase tracking-wider">
            <span className="text-gray-500">PICK WINNERS</span>
            <span className="text-gray-700 mx-1.5">·</span>
            <span className="text-gray-500">WAGER CRYPTO</span>
            <span className="text-gray-700 mx-1.5">·</span>
            <span className="text-gray-500">SETTLE ON-CHAIN</span>
            <span className="text-gray-700 mx-1.5">·</span>
            <span className="text-amber-400">5% RAKE</span>
          </p>
        </div>

        {/* Sport tabs — DK pattern: pill rail, gradient active state, count badges per sport */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {SPORT_TABS.map(s => {
            const count = sportCount(s.id)
            const active = tab === s.id
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/40 ring-1 ring-cyan-300/50'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono tabular-nums px-1.5 rounded-full ${active ? 'bg-black/30 text-white' : 'bg-white/10 text-cyan-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* View toggle — segmented control with live count badges (FD My Bets pattern) */}
        <div className="flex items-center gap-1 mb-6 bg-gray-900/80 backdrop-blur rounded-full p-1 w-fit border border-white/5">
          {[
            { id: 'games', label: "Today's Games", icon: Zap, count: games.length },
            { id: 'picks', label: 'Open Picks', icon: TrendingUp, count: openPickCount },
            { id: 'my', label: 'My Picks', icon: Trophy, count: myPickCount },
          ].map(v => {
            const active = view === v.id
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id as any)}
                className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  active ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <v.icon className="w-3.5 h-3.5" />
                <span>{v.label}</span>
                {v.count > 0 && (
                  <span className={`text-[9px] font-mono tabular-nums px-1.5 rounded-full ${active ? 'bg-black/15 text-black' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {v.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* LIVE NOW horizontal rail — DK signature: in-progress games scrolling at top with score, time, "QUICK PICK" CTA */}
        {!loading && liveGameCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[10px] font-mono font-bold text-red-400 tracking-widest">LIVE NOW</span>
              <span className="text-[10px] font-mono text-gray-600">· {liveGameCount} GAME{liveGameCount === 1 ? '' : 'S'} IN PROGRESS</span>
              <div className="flex-1 h-px bg-gradient-to-r from-red-500/30 to-transparent ml-2" />
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {games.filter(g => g.state === 'in').map(g => (
                <button
                  key={g.espnGameId}
                  onClick={() => g.canPick && setPickModal({ game: g, side: 'home' })}
                  className="group relative flex-shrink-0 w-64 rounded-xl overflow-hidden border border-red-500/40 bg-gradient-to-br from-red-950/30 via-black to-orange-950/20 p-3 text-left hover:border-red-400/60 transition-all"
                >
                  <span className="arena-conic-ring" aria-hidden />
                  <div className="relative flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-red-400 tracking-widest">
                      <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" /> LIVE · {g.statusDetail}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">{g.sportEmoji} {g.sportLabel}</span>
                  </div>
                  <div className="relative space-y-1.5">
                    <div className="flex items-center gap-2">
                      {g.awayLogo
                        ? <img src={g.awayLogo} alt={g.awayTeamFull} title={g.awayTeamFull} className="w-7 h-7 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        : <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-[9px] font-mono text-gray-400 flex-shrink-0">{g.awayTeam.slice(0, 3)}</span>}
                      <span className="text-xs font-bold text-white truncate lg:hidden">{g.awayTeam}</span>
                      <span className={`ml-auto text-base font-mono font-black tabular-nums ${(parseInt(g.awayScore || '0') > parseInt(g.homeScore || '0')) ? 'text-emerald-400' : 'text-gray-300'}`}>{g.awayScore || '0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.homeLogo
                        ? <img src={g.homeLogo} alt={g.homeTeamFull} title={g.homeTeamFull} className="w-7 h-7 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        : <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-[9px] font-mono text-gray-400 flex-shrink-0">{g.homeTeam.slice(0, 3)}</span>}
                      <span className="text-xs font-bold text-white truncate lg:hidden">{g.homeTeam}</span>
                      <span className={`ml-auto text-base font-mono font-black tabular-nums ${(parseInt(g.homeScore || '0') > parseInt(g.awayScore || '0')) ? 'text-emerald-400' : 'text-gray-300'}`}>{g.homeScore || '0'}</span>
                    </div>
                  </div>
                  {g.canPick && (
                    <div className="relative mt-2 text-center text-[10px] font-mono font-bold text-cyan-400 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">QUICK PICK →</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body — 3-column rails layout on lg+. Mobile collapses to single column (rails hidden). */}
        <div className="lg:grid lg:grid-cols-[220px_1fr_220px] lg:gap-4 xl:grid-cols-[240px_1fr_240px] xl:gap-5">
          {/* LEFT RAIL — TONIGHT'S CARD: vertical games list, sticky on lg+ */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest">TONIGHT'S CARD</span>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-black/60 backdrop-blur-sm overflow-hidden">
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide divide-y divide-white/5">
                  {games.length === 0 && <div className="p-3 text-[11px] font-mono text-gray-500 text-center">No games today</div>}
                  {games.slice(0, 16).map(g => {
                    const tip = new Date(g.gameTime)
                    const tipStr = tip.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    const isLive = g.state === 'in'
                    const isFinal = g.state === 'post'
                    return (
                      <button
                        key={g.espnGameId}
                        onClick={() => g.canPick && setPickModal({ game: g, side: 'home' })}
                        disabled={!g.canPick}
                        className={`w-full p-2.5 text-left transition-colors ${g.canPick ? 'hover:bg-cyan-500/10 cursor-pointer' : 'cursor-default opacity-70'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-gray-500">{g.sportEmoji} {g.sportLabel}</span>
                          <span className={`text-[9px] font-mono font-bold ${isLive ? 'text-red-400' : isFinal ? 'text-gray-500' : 'text-cyan-400'}`}>
                            {isLive ? `LIVE · ${g.statusDetail}` : isFinal ? 'FINAL' : tipStr}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            {g.awayLogo
                              ? <img src={g.awayLogo} alt={g.awayTeamFull} title={g.awayTeamFull} className="w-5 h-5 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                              : <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-[8px] font-mono text-gray-400 flex-shrink-0">{g.awayTeam.slice(0, 3)}</span>}
                            {(isLive || isFinal) && <span className="ml-auto font-mono tabular-nums text-gray-300">{g.awayScore || 0}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            {g.homeLogo
                              ? <img src={g.homeLogo} alt={g.homeTeamFull} title={g.homeTeamFull} className="w-5 h-5 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                              : <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-[8px] font-mono text-gray-400 flex-shrink-0">{g.homeTeam.slice(0, 3)}</span>}
                            {(isLive || isFinal) && <span className="ml-auto font-mono tabular-nums text-gray-300">{g.homeScore || 0}</span>}
                          </div>
                        </div>
                        {g.canPick && (
                          <div className="mt-1.5 text-[9px] font-mono font-bold text-cyan-400/70 tracking-widest">PICK 'EM →</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER — existing loading/grid */}
          <main className="min-w-0">
        {loading ? (
          /* Premium loading state — radial pulse + tabular caption */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
              <div className="absolute inset-1 rounded-full border-2 border-purple-500/40 animate-ping" style={{ animationDelay: '0.3s' }} />
              <Loader2 className="absolute inset-0 m-auto w-6 h-6 animate-spin text-cyan-400" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Loading the board…</p>
          </div>
        ) : view === 'games' ? (
          /* Today's Games Grid */
          <div>
            {games.length === 0 ? (
              <div className="relative text-center py-24 text-gray-500">
                <div className="absolute inset-0 -z-10 max-w-md mx-auto blur-3xl opacity-30 bg-gradient-to-br from-cyan-500 via-purple-500 to-amber-500 rounded-full" />
                <div className="inline-block relative mb-4">
                  <Zap className="w-16 h-16 mx-auto text-cyan-400/40" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                  </span>
                </div>
                <p className="text-xl font-black text-white mb-1">No games today</p>
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500">Check back when ESPN posts the next slate</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {games.map(g => (
                  <GameCard key={g.espnGameId} game={g} onPick={(game, side) => setPickModal({ game, side })} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Picks Board — matchup cards */
          <div>
            {picks.length === 0 ? (
              <div className="relative text-center py-24 text-gray-500">
                <div className="absolute inset-0 -z-10 max-w-md mx-auto blur-3xl opacity-30 bg-gradient-to-br from-cyan-500 via-purple-500 to-amber-500 rounded-full" />
                <div className="inline-block relative mb-4">
                  <Trophy className="w-16 h-16 mx-auto text-amber-400/40" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                </div>
                <p className="text-xl font-black text-white mb-1">{view === 'my' ? 'No picks yet' : 'No open picks'}</p>
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-4">
                  {view === 'my' ? 'Your wagers will appear here' : 'The board is empty — be the first'}
                </p>
                {view !== 'my' && games.length > 0 && (
                  <button
                    onClick={() => setView('games')}
                    className="px-5 py-2 text-xs font-black bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.4)] font-mono uppercase tracking-wider"
                  >
                    Create the first pick →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {picks.map(p => (
                  <MatchupCard key={p.id} pick={p} me={me} onTake={handleTake} onCancel={handleCancel} onEdit={(pk) => setEditModal(pk)} />
                ))}
              </div>
            )}
          </div>
        )}
          </main>

          {/* RIGHT RAIL — HOT PICKS / TRENDING: most recently matched picks, sticky on lg+ */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-mono font-bold text-amber-400 tracking-widest">HOT PICKS</span>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-black/60 backdrop-blur-sm overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto scrollbar-hide divide-y divide-white/5">
                  {(() => {
                    const hot = [...picks]
                      .filter(p => p.status === 'matched' || (p.status === 'open' && !p.takerHandle))
                      .sort((a: any, b: any) => new Date(b.matchedAt || b.createdAt).getTime() - new Date(a.matchedAt || a.createdAt).getTime())
                      .slice(0, 8)
                    if (hot.length === 0) return <div className="p-3 text-[11px] font-mono text-gray-500 text-center">No matched picks yet</div>
                    return hot.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setView(p.status === 'open' ? 'picks' : 'my')}
                        className="w-full p-2.5 text-left hover:bg-amber-500/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-gray-500 truncate">@{p.creatorHandle}{p.takerHandle ? ` vs @${p.takerHandle}` : ''}</span>
                          <span className={`text-[9px] font-mono font-bold ${p.status === 'matched' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                            {p.status === 'matched' ? 'LOCKED' : 'OPEN'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.awayLogo && <img src={p.awayLogo} alt={p.awayTeamFull} title={p.awayTeamFull} className="w-5 h-5 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
                          <span className="text-[10px] font-mono text-gray-600">@</span>
                          {p.homeLogo && <img src={p.homeLogo} alt={p.homeTeamFull} title={p.homeTeamFull} className="w-5 h-5 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-mono text-amber-300">{p.pot} {p.entryToken}</span>
                          <span className="text-[9px] font-mono text-gray-500 tracking-widest">POT</span>
                        </div>
                      </button>
                    ))
                  })()}
                </div>
              </div>

              {/* Parlay slip placeholder — DK signature side panel */}
              <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest">PARLAY SLIP</span>
                  <span className="text-[8px] font-mono text-amber-300/70 bg-amber-500/10 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase tracking-wider">SOON</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">Combine 2+ picks for higher payouts. Multi-leg on-chain settlement.</p>
                <div className="mt-2 text-[10px] font-mono text-gray-600 italic">Tap any open pick to add (coming soon)</div>
              </div>

              {/* Running pot total */}
              <div className="rounded-xl border border-purple-500/20 bg-black/60 backdrop-blur-sm p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-purple-400 tracking-widest">TOTAL ESCROWED</span>
                  <Coins className="w-3 h-3 text-purple-400" />
                </div>
                <div className="arena-hologram-text text-2xl font-black tabular-nums leading-none">{totalEscrowed.toFixed(0)}</div>
                <div className="text-[9px] font-mono text-gray-500 tracking-widest mt-1">ACROSS {(picks.filter(p => p.status === 'matched' || p.status === 'open').length)} OPEN/LOCKED PICKS</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Create Pick Modal */}
      {pickModal && (
        <CreatePickModal
          game={pickModal.game}
          side={pickModal.side}
          onClose={() => setPickModal(null)}
          onCreated={() => { loadPicks(); loadGames() }}
        />
      )}

      {/* Edit Pick Modal */}
      {editModal && (
        <EditPickModal
          pick={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => loadPicks()}
        />
      )}
    </div>
  )
}
