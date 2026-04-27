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
import { Loader2, Trophy, Zap, TrendingUp, Clock, Check, X, ChevronDown, Wallet, Sparkles, Pencil, Trash2 } from 'lucide-react'
import { TOKEN_CONFIG, LIVE_TOKENS, isTokenLive } from 'lib/arena/fantasy/types'
import { TOKEN_INFO } from 'constants/tokens'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'

const OGUN_BONUS_BPS = 1000  // 10% OGUN bonus when wager token is OGUN — paid from rewards pool on settle
// Only show tokens that have a real on-chain destination today. Cross-chain tokens (BTC/SOL/etc.)
// flip on automatically when SoundchainPicksEscrow deploys to ZetaChain mainnet and isTokenLive() expands.
const ENABLED_TOKENS: string[] = ['OGUN', ...LIVE_TOKENS.filter(t => t !== 'OGUN')]

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
  takerHandle?: string; takerPick?: 'home' | 'away'
  takerAvatarUrl?: string | null
  takerWalletAddress?: string
  entryToken: string; entryFee: number; pot: number
  status: string; winner?: string; winnerHandle?: string
  finalHomeScore?: number; finalAwayScore?: number
  gameTime: string; gameStatus: string
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
          {/* Creator chevrons — edit + delete, always visible on own open picks */}
          {isCreator && isOpen && !pick.takerHandle && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(pick) }}
                className="p-1 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-gray-700 hover:border-cyan-500/50 transition-all"
                title="Edit wager"
                aria-label="Edit pick"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this pick?')) onCancel(pick.id) }}
                className="p-1 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/50 transition-all"
                title="Delete pick"
                aria-label="Delete pick"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isSettled ? 'bg-gray-700 text-gray-300' :
            isMatched ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
            'bg-cyan-500/20 text-cyan-400'
          }`}>
            {isSettled ? 'FINAL' : isMatched ? 'LOCKED IN' : 'OPEN'}
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
              @{pick.winnerHandle} wins {Math.floor(pick.pot * 0.95)} {pick.entryToken}
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
  const [token, setToken] = useState('OGUN')
  const [amount, setAmount] = useState(100)
  const [submitting, setSubmitting] = useState(false)

  const team = side === 'home' ? game.homeTeam : game.awayTeam
  const teamFull = side === 'home' ? game.homeTeamFull : game.awayTeamFull
  const logo = side === 'home' ? game.homeLogo : game.awayLogo
  const opponent = side === 'home' ? game.awayTeam : game.homeTeam

  const submit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch('/api/arena/picks', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: game.sport, espnGameId: game.espnGameId, pick: side, entryToken: token, entryFee: amount }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Failed'); return }
      toast.success(`Pick created: ${team} to win!`)
      onCreated()
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
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
            Winner takes {Math.floor(amount * 2 * 0.95)} {token} · 5% platform fee
            <br/>
            <span className="text-gray-600">Entry routes via ZetaChain · Polygon = default gas (0.05%)</span>
          </div>

          <button onClick={submit} disabled={submitting || amount <= 0} className="w-full py-3 text-sm font-black bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/20">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `PLACE PICK — ${amount} ${token}`}
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

    // WalletConnect-first per Frank's directive — Magic OAuth RPC is broken for wagers (-32603).
    // Resolve EIP-1193 provider in this order:
    //   1. Web3Modal (MetaMask Mobile / Rainbow / Trust / Coinbase via WC v2 deeplink)
    //   2. Injected window.ethereum (desktop MetaMask, Coinbase extension, in-app browsers)
    //   3. Neither → open Web3Modal so user can connect, then retry
    const injected = (typeof window !== 'undefined' ? (window as any).ethereum : null)
    const provider: any = (activeWalletType === 'web3modal' && web3ModalProvider)
      ? web3ModalProvider
      : injected

    if (!provider) {
      toast.info('Connect a wallet to take this pick — pick MetaMask, Rainbow, Trust, or Coinbase, then tap Take again', { autoClose: 9000 })
      try { await connectWeb3Modal() } catch {}
      return
    }

    const TREASURY = '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b'
    const POLYGON_HEX = '0x89'

    const isNativeWager = pick.entryToken === 'MATIC' || pick.entryToken === 'POL'
    const feePol = isNativeWager ? Math.max(pick.entryFee * 0.0005, 0.001) : 0.001
    const feeWeiHex = '0x' + BigInt(Math.round(feePol * 1e18)).toString(16)
    const takerTeam = pick.creatorPick === 'home' ? pick.awayTeam : pick.homeTeam

    let address: string
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      if (!accounts?.[0]) throw new Error('No wallet account available')
      address = accounts[0]
    } catch (e: any) {
      toast.error(e?.message || 'Wallet connection cancelled')
      return
    }

    try {
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string
      if (chainId !== POLYGON_HEX) {
        try {
          await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_HEX }] })
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: POLYGON_HEX,
                chainName: 'Polygon',
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com'],
                blockExplorerUrls: ['https://polygonscan.com'],
              }],
            })
          } else {
            toast.error('Switch to Polygon network in your wallet to continue')
            return
          }
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not verify Polygon network')
      return
    }

    const sigToast = toast.loading(`Confirm in wallet — taking ${takerTeam} · ${feePol.toFixed(4)} POL platform fee`)
    let txHash: string
    try {
      txHash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: TREASURY, value: feeWeiHex }],
      })) as string
    } catch (e: any) {
      toast.dismiss(sigToast)
      const cancelled = e?.code === 4001 || /reject|denied|cancel/i.test(e?.message || '')
      toast.error(cancelled ? 'Take cancelled in wallet' : (e?.message || 'Transaction failed'))
      return
    }
    toast.dismiss(sigToast)

    try {
      const r = await fetch(`/api/arena/picks/${pickId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take', txHash, walletAddress: address }),
      })
      const d = await r.json()
      if (!r.ok) {
        const dbg = d.debug ? ` [server sees you as @${d.debug.yourHandle} · ${String(d.debug.yourProfileId).slice(-6)} | creator @${d.debug.creatorHandle} · ${String(d.debug.creatorProfileId).slice(-6)}]` : ''
        toast.error(`${d.error || 'Failed'}${dbg}`, { autoClose: 12000 })
        return
      }
      toast.success(`Pick matched · ${address.slice(0, 6)}…${address.slice(-4)} · tx ${txHash.slice(0, 10)}…`, { autoClose: 8000 })
      loadPicks()
    } catch (e: any) { toast.error(e.message) }
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
