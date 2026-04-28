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
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { toast } from 'react-toastify'
import { ethers } from 'ethers'
import { Loader2, Trophy, Zap, TrendingUp, Clock, Check, X, ChevronDown, Wallet, Sparkles, Pencil, Trash2 } from 'lucide-react'
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

  const creatorTeam = pick.creatorPick === 'home' ? pick.homeTeam : pick.awayTeam
  const creatorLogo = pick.creatorPick === 'home' ? pick.homeLogo : pick.awayLogo
  const takerTeam = pick.takerPick === 'home' ? pick.homeTeam : pick.awayTeam
  const takerLogo = pick.takerPick === 'home' ? pick.homeLogo : pick.awayLogo

  return (
    <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.01] ${
      isSettled ? 'border-gray-700/50 opacity-80' :
      isMatched ? 'border-amber-500/40 shadow-lg shadow-amber-500/10' :
      'border-cyan-500/30 shadow-lg shadow-cyan-500/10'
    }`}>
      {/* Header — sport + game info + creator controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-white/5">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {pick.sport.toUpperCase()} · {formatTime(pick.gameTime)}
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
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isSettled ? 'bg-gray-700 text-gray-300' :
            isMatched ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
            isPendingDeposit ? 'bg-purple-500/20 text-purple-300' :
            'bg-cyan-500/20 text-cyan-400'
          }`}>
            {isSettled ? 'FINAL' : isMatched ? 'LOCKED IN' : isPendingDeposit ? 'AWAITING STAKE' : 'OPEN'}
          </span>
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
            <p className="text-sm lg:text-base font-black text-white">{creatorTeam}</p>
            <p className="text-[10px] lg:text-xs text-cyan-400 font-bold truncate">@{pick.creatorHandle}</p>
            {isSettled && pick.creatorPick === 'home' && <p className="text-lg font-black text-white mt-1">{pick.finalHomeScore}</p>}
            {isSettled && pick.creatorPick === 'away' && <p className="text-lg font-black text-white mt-1">{pick.finalAwayScore}</p>}
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-sm lg:text-lg font-black text-black">VS</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] lg:text-xs font-bold text-amber-400">{pick.entryFee} {pick.entryToken}</p>
              {isMatched && <p className="text-[8px] lg:text-[10px] text-gray-500">POT: {pick.pot} {pick.entryToken}</p>}
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
                <p className="text-sm lg:text-base font-black text-white">{takerTeam}</p>
                <p className="text-[10px] lg:text-xs text-purple-400 truncate">@{pick.takerHandle}</p>
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
                <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mb-2">
                  <span className="text-2xl text-gray-600">?</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Waiting...</p>
                {!isCreator && me?.profile && (
                  <button
                    onClick={() => onTake(pick.id)}
                    className="mt-2 px-4 py-1.5 text-xs font-black bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20"
                  >
                    TAKE {pick.creatorPick === 'home' ? pick.awayTeam : pick.homeTeam}
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

        {/* Result banner */}
        {isSettled && pick.winnerHandle && (
          <div className="mt-3 text-center py-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30">
            <p className="text-xs font-black text-yellow-400">
              <Trophy className="w-3 h-3 inline mr-1" />
              @{pick.winnerHandle} wins {(pick.pot * 0.9995).toFixed(4)} {pick.entryToken}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Game Card (for creating picks) ────────────────────────────
function GameCard({ game, onPick }: { game: Game; onPick: (game: Game, side: 'home' | 'away') => void }) {
  const isLive = game.state === 'in'
  const isFinal = game.state === 'post'

  return (
    <div className={`rounded-xl border p-3 lg:p-4 transition-all ${
      isLive ? 'border-red-500/40 bg-red-500/5' :
      isFinal ? 'border-gray-700/30 bg-gray-900/50 opacity-60' :
      'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] lg:text-xs font-bold text-gray-500">{game.sportEmoji} {game.sportLabel}</span>
        <span className={`text-[10px] lg:text-xs font-bold ${isLive ? 'text-red-400 animate-pulse' : isFinal ? 'text-gray-500' : 'text-gray-400'}`}>
          {isLive ? `LIVE · ${game.statusDetail}` : isFinal ? 'FINAL' : formatTime(game.gameTime)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* Away team */}
        <button
          onClick={() => game.canPick && onPick(game, 'away')}
          disabled={!game.canPick}
          className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-all ${
            game.canPick ? 'hover:bg-cyan-500/10 hover:ring-1 hover:ring-cyan-500/30 cursor-pointer active:scale-95' : 'cursor-default'
          }`}
        >
          {game.awayLogo && <img src={game.awayLogo} alt="" className="w-8 h-8 lg:w-10 lg:h-10 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
          <div className="text-left min-w-0">
            <p className="text-sm lg:text-base font-black text-white truncate">{game.awayTeam}</p>
            <p className="text-[9px] lg:text-[10px] text-gray-500 truncate">{game.awayTeamFull}</p>
          </div>
          {(isLive || isFinal) && <span className="text-lg lg:text-xl font-black text-white ml-auto">{game.awayScore}</span>}
        </button>

        <span className="text-gray-600 text-xs font-bold px-1">@</span>

        {/* Home team */}
        <button
          onClick={() => game.canPick && onPick(game, 'home')}
          disabled={!game.canPick}
          className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-all ${
            game.canPick ? 'hover:bg-purple-500/10 hover:ring-1 hover:ring-purple-500/30 cursor-pointer active:scale-95' : 'cursor-default'
          }`}
        >
          {game.homeLogo && <img src={game.homeLogo} alt="" className="w-8 h-8 lg:w-10 lg:h-10 object-contain flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
          <div className="text-left min-w-0">
            <p className="text-sm lg:text-base font-black text-white truncate">{game.homeTeam}</p>
            <p className="text-[9px] lg:text-[10px] text-gray-500 truncate">{game.homeTeamFull}</p>
          </div>
          {(isLive || isFinal) && <span className="text-lg lg:text-xl font-black text-white ml-auto">{game.homeScore}</span>}
        </button>
      </div>

      {game.canPick && (
        <p className="text-[9px] text-center text-gray-600 mt-2">Tap a team to create a pick</p>
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
  const { connectWeb3Modal, activeWalletType, web3ModalProvider } = useUnifiedWallet()

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">Create Pick</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          {/* Team picked */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
            {logo && <img src={logo} alt="" className="w-12 h-12 object-contain" />}
            <div>
              <p className="text-base font-black text-white">{team} to WIN</p>
              <p className="text-xs text-gray-400">vs {opponent} · {formatTime(game.gameTime)}</p>
            </div>
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

          {/* Quick amounts */}
          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map(a => (
              <button key={a} onClick={() => setAmount(a)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${amount === a ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {a}
              </button>
            ))}
          </div>

          {token === 'OGUN' && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-[10px] lg:text-xs text-amber-300 font-bold leading-tight">
                +{OGUN_BONUS_BPS / 100}% OGUN bonus to winner — paid from rewards pool on settle
              </p>
            </div>
          )}

          <div className="text-[10px] text-gray-500 text-center mb-4 leading-relaxed">
            Winner takes {(amount * 2 * 0.9995).toFixed(4)} {token} · 0.05% platform fee
            <br/>
            <span className="text-gray-600">On-chain escrow on Polygon · stake locked in FantasyLeagueEscrow</span>
          </div>

          <button onClick={submit} disabled={submitting || amount <= 0} className="w-full py-3 text-sm font-black bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/20">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {step === 'creating' ? 'Creating on-chain league…' : step === 'awaiting_signature' ? 'Confirm in wallet…' : step === 'finalizing' ? 'Verifying on-chain…' : 'Working…'}
              </span>
            ) : `PLACE PICK — ${amount} ${token}`}
          </button>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">Edit Wager</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <p className="text-sm font-black text-white">{creatorTeam} to WIN</p>
            <p className="text-xs text-gray-400">vs {opponent} · team is locked, edit wager only</p>
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
  const { setHideBottomNavBarState } = useHideBottomNavBar()

  useEffect(() => {
    setHideBottomNavBarState(true)
    return () => setHideBottomNavBarState(false)
  }, [setHideBottomNavBarState])

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
            ARENA PICKS
          </h1>
          <p className="text-gray-400 text-sm lg:text-base mt-1">Pick winners. Wager crypto. Settle on-chain.</p>
        </div>

        {/* Sport tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {SPORT_TABS.map(s => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                tab === s.id ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 mb-6 bg-gray-900 rounded-full p-1 w-fit">
          {[
            { id: 'games', label: "Today's Games", icon: Zap },
            { id: 'picks', label: 'Open Picks', icon: TrendingUp },
            { id: 'my', label: 'My Picks', icon: Trophy },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                view === v.id ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
        ) : view === 'games' ? (
          /* Today's Games Grid */
          <div>
            {games.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-bold">No games today</p>
                <p className="text-sm">Check back when games are scheduled</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              <div className="text-center py-20 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-bold">{view === 'my' ? 'No picks yet' : 'No open picks'}</p>
                <p className="text-sm">{view === 'my' ? 'Create your first pick from Today\'s Games' : 'Be the first to create a pick'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {picks.map(p => (
                  <MatchupCard key={p.id} pick={p} me={me} onTake={handleTake} onCancel={handleCancel} onEdit={(pk) => setEditModal(pk)} />
                ))}
              </div>
            )}
          </div>
        )}
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
