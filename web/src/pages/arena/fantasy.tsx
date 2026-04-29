/**
 * /arena/fantasy — Fantasy League Hub
 *
 * List all fantasy leagues + create button. Detail view lives at /arena/fantasy/[id].
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'
// DexNavBar inherited from Layout.tsx — no inline mount needed
import { ArrowLeft, Trophy, Plus, Users, Coins, Loader2, X, Crown, Flame, Star, TrendingUp, Award, Target, Zap, Shield } from 'lucide-react'
import { toast } from 'react-toastify'
import { FantasyLeague, EntryToken, TOKEN_CONFIG, isTokenLive } from 'lib/arena/fantasy/types'
import { TOKEN_INFO, SUPPORTED_TOKENS } from 'constants/tokens'

export default function FantasyHubPage() {
  const router = useRouter()
  const me = useMe()
  const [leagues, setLeagues] = useState<FantasyLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const loadLeagues = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/arena/fantasy?status=all', { credentials: 'include' })
      const d = await r.json()
      setLeagues(d.leagues || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLeagues() }, [])

  // Auto-open create modal when landed via /arena/fantasy?new=1
  useEffect(() => {
    if (router.query.new === '1' && me?.profile) setShowCreate(true)
  }, [router.query.new, me?.profile])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* High-end ambient graphics — framework lives in globals.css (port from /arena/picks) */}
      <div className="fixed inset-0 arena-mesh-bg pointer-events-none" aria-hidden />
      <div className="fixed inset-0 arena-grid-overlay pointer-events-none" aria-hidden />
      <div className="fixed inset-0 arena-grain-overlay pointer-events-none" aria-hidden />
      <div className="relative max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {me?.id && (
            <button
              onClick={() => setShowCreate(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 rounded-full text-sm font-black ring-1 ring-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_28px_rgba(168,85,247,0.55)] arena-shimmer overflow-hidden transition-all"
            >
              <Plus className="w-4 h-4" /> New League
            </button>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10 text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
            <h1 className="arena-hologram-text text-4xl lg:text-6xl font-black tracking-tight leading-none">FANTASY LEAGUES</h1>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            NFL fantasy with OGUN / POL prize pools. Smart contract escrow. 5% platform fee.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
        ) : leagues.length === 0 ? (
          <FantasyPreviewTheatre onStart={() => setShowCreate(true)} canStart={!!me?.id} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leagues.map(l => <LeagueCard key={String((l as any)._id)} league={l} />)}
          </div>
        )}
      </div>

      {showCreate && <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={loadLeagues} />}
    </div>
  )
}

// =============================================================
// FANTASY PREVIEW THEATRE — Hollywood/Vegas density at zero state
// All data here is illustrative; every section tagged with PREVIEW.
// Real leagues replace this view as soon as the first one is created.
// =============================================================

const PREVIEW_STANDINGS = [
  { rank: 1,  name: 'OGUN Originals',         handle: '@degen_sports',  w: 9, l: 2, pf: 1342.4, pa: 1098.2, streak: 'W4', accent: 'from-cyan-500 to-purple-500' },
  { rank: 2,  name: 'Polygon Punishers',      handle: '@parlay_king',   w: 8, l: 3, pf: 1289.7, pa: 1102.5, streak: 'W2', accent: 'from-purple-500 to-pink-500' },
  { rank: 3,  name: 'Web3 Warriors',          handle: '@stake_master',  w: 8, l: 3, pf: 1267.0, pa: 1145.8, streak: 'W1', accent: 'from-pink-500 to-amber-500' },
  { rank: 4,  name: 'Mainnet Mavericks',      handle: '@vegas_vibes',   w: 7, l: 4, pf: 1244.5, pa: 1167.3, streak: 'W3', accent: 'from-amber-500 to-cyan-500' },
  { rank: 5,  name: 'Block Builders',         handle: '@first_take',    w: 7, l: 4, pf: 1221.8, pa: 1189.6, streak: 'L1', accent: 'from-emerald-500 to-cyan-500' },
  { rank: 6,  name: 'Liquidity Lions',        handle: '@yield_chaser',  w: 6, l: 5, pf: 1198.2, pa: 1212.4, streak: 'W1', accent: 'from-orange-500 to-rose-500' },
  { rank: 7,  name: 'Yield Yetis',            handle: '@degen_sniper',  w: 6, l: 5, pf: 1184.6, pa: 1228.7, streak: 'L2', accent: 'from-sky-500 to-indigo-500' },
  { rank: 8,  name: 'Smart Contract Saints',  handle: '@chain_chad',    w: 5, l: 6, pf: 1156.3, pa: 1245.0, streak: 'L1', accent: 'from-indigo-500 to-purple-500' },
  { rank: 9,  name: 'Bytecode Bandits',       handle: '@gas_god',       w: 5, l: 6, pf: 1142.7, pa: 1267.1, streak: 'W1', accent: 'from-teal-500 to-emerald-500' },
  { rank: 10, name: 'Hashrate Hooligans',     handle: '@hashrate_bro',  w: 4, l: 7, pf: 1118.4, pa: 1289.4, streak: 'L3', accent: 'from-fuchsia-500 to-pink-500' },
  { rank: 11, name: 'Validator Vipers',       handle: '@stake_or_die',  w: 3, l: 8, pf: 1087.5, pa: 1312.6, streak: 'L4', accent: 'from-rose-500 to-orange-500' },
  { rank: 12, name: 'Gas Fee Ghouls',         handle: '@rugged_again',  w: 2, l: 9, pf: 1054.9, pa: 1356.2, streak: 'L2', accent: 'from-red-500 to-rose-500' },
]

const PREVIEW_PLAYERS = [
  { name: 'Patrick Mahomes',     pos: 'QB', team: 'KC',  weekPts: 32.4, projected: 28.2, color: 'red',     stat: '342 PYDS · 3 TD' },
  { name: 'Lamar Jackson',       pos: 'QB', team: 'BAL', weekPts: 30.5, projected: 26.8, color: 'purple',  stat: '264 PYDS · 88 RUSH · 3 TD' },
  { name: 'Christian McCaffrey', pos: 'RB', team: 'SF',  weekPts: 28.8, projected: 24.5, color: 'amber',   stat: '142 RYDS · 64 RECYDS · 2 TD' },
  { name: 'Justin Jefferson',    pos: 'WR', team: 'MIN', weekPts: 26.2, projected: 22.0, color: 'fuchsia', stat: '11 REC · 162 YDS · 1 TD' },
  { name: 'Tyreek Hill',         pos: 'WR', team: 'MIA', weekPts: 24.1, projected: 21.2, color: 'cyan',    stat: '9 REC · 148 YDS · 1 TD' },
  { name: 'Travis Kelce',        pos: 'TE', team: 'KC',  weekPts: 22.6, projected: 18.4, color: 'rose',    stat: '8 REC · 98 YDS · 2 TD' },
]

const PREVIEW_BRACKET = {
  semi1: { team1: 'OGUN Originals', team2: 'Mainnet Mavericks', proj1: 134.2, proj2: 121.8, week: 'WK 15' },
  semi2: { team1: 'Polygon Punishers', team2: 'Web3 Warriors',   proj1: 128.6, proj2: 126.3, week: 'WK 15' },
  final: { team1: 'OGUN Originals', team2: 'Polygon Punishers',  proj1: 138.4, proj2: 132.7, week: 'WK 16' },
}

const PREVIEW_LEADERBOARD = [
  { handle: '@degen_sports',  ogun: 248.7, picks: 47, wins: 31 },
  { handle: '@parlay_king',   ogun: 192.4, picks: 52, wins: 29 },
  { handle: '@stake_master',  ogun: 167.0, picks: 38, wins: 24 },
  { handle: '@vegas_vibes',   ogun: 145.2, picks: 41, wins: 22 },
  { handle: '@first_take',    ogun: 132.8, picks: 36, wins: 19 },
]

function PreviewBadge() {
  return (
    <span className="text-[9px] font-mono font-bold tracking-[0.18em] text-amber-300/70 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded uppercase">PREVIEW</span>
  )
}

function FantasyPreviewTheatre({ onStart, canStart }: { onStart: () => void; canStart: boolean }) {
  const matchup = {
    home: { name: 'OGUN Originals', record: '9-2', proj: 124.5, points: 0,  color: 'from-cyan-500 via-purple-500 to-pink-500' },
    away: { name: 'Polygon Punishers', record: '8-3', proj: 118.3, points: 0, color: 'from-pink-500 via-amber-500 to-cyan-500' },
    h2h: '4-2',
  }
  return (
    <div className="space-y-6">
      {/* Top banner — Hollywood preview marquee */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-black to-purple-950/40 p-5 sm:p-7 group arena-shimmer">
        <span className="arena-conic-ring" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2"><PreviewBadge /><span className="text-[10px] font-mono text-gray-500 tracking-widest">FANTASY THEATRE · 2026 SEASON · MOCK DATA</span></div>
            <h2 className="arena-hologram-text text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">No leagues yet — but here's what one looks like.</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-2xl">Standings, brackets, player cards, matchups, leaderboards — all populated below. Spin up a real league and these become yours.</p>
          </div>
          <button
            onClick={onStart}
            disabled={!canStart}
            className="relative shrink-0 px-6 py-3 rounded-full text-sm font-black bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-[0_0_28px_rgba(168,85,247,0.55)] hover:shadow-[0_0_42px_rgba(236,72,153,0.65)] ring-1 ring-cyan-300/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="inline w-4 h-4 mr-1 -mt-0.5" /> Start Your League
          </button>
        </div>
      </div>

      {/* MATCHUP OF THE WEEK — hero row */}
      <section>
        <SectionHeader icon={<Flame className="w-4 h-4 text-orange-400" />} title="MATCHUP OF THE WEEK" subtitle="Featured · WK 14" />
        <div className="relative rounded-2xl overflow-hidden border border-orange-500/30 bg-gradient-to-br from-orange-950/30 via-black to-rose-950/30 p-5 sm:p-7 group">
          <span className="arena-conic-ring" aria-hidden />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3">
            <div className="flex-1 text-center sm:text-right">
              <div className={`inline-block px-3 py-1 rounded-md bg-gradient-to-r ${matchup.home.color} text-white text-xs font-black tracking-wider mb-2`}>{matchup.home.name}</div>
              <div className="text-xs text-gray-400 font-mono">{matchup.home.record} · PROJ {matchup.home.proj}</div>
            </div>
            <div className="flex flex-col items-center gap-2 px-3">
              <div className="arena-hologram-text text-3xl font-black tracking-tighter">VS</div>
              <span className="text-[9px] font-mono text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded uppercase tracking-wider">H2H {matchup.h2h}</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className={`inline-block px-3 py-1 rounded-md bg-gradient-to-r ${matchup.away.color} text-white text-xs font-black tracking-wider mb-2`}>{matchup.away.name}</div>
              <div className="text-xs text-gray-400 font-mono">{matchup.away.record} · PROJ {matchup.away.proj}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout: standings (lg:col-span-2) + bracket (lg:col-span-1) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STANDINGS */}
        <div className="lg:col-span-2">
          <SectionHeader icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} title="LEAGUE STANDINGS" subtitle="Top 12 · 2026 regular season" />
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-[10px] font-mono text-gray-400 tracking-widest">
                    <th className="px-3 py-2 text-left w-10">#</th>
                    <th className="px-3 py-2 text-left">TEAM</th>
                    <th className="px-3 py-2 text-center w-14">W-L</th>
                    <th className="px-3 py-2 text-right w-20 hidden sm:table-cell">PF</th>
                    <th className="px-3 py-2 text-right w-20 hidden sm:table-cell">PA</th>
                    <th className="px-3 py-2 text-center w-14">STRK</th>
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_STANDINGS.map((t, i) => (
                    <tr key={t.rank} className={`border-b border-white/5 hover:bg-white/5 transition ${i < 4 ? 'bg-cyan-500/[0.03]' : ''}`}>
                      <td className="px-3 py-2 font-mono text-gray-500">{t.rank}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-1 h-6 rounded-full bg-gradient-to-b ${t.accent}`} />
                          <div>
                            <div className="font-bold text-white text-xs">{t.name}</div>
                            <div className="text-[10px] font-mono text-gray-500">{t.handle}</div>
                          </div>
                          {t.rank === 1 && <Crown className="w-3 h-3 text-amber-400 ml-1" />}
                          {t.rank <= 4 && t.rank !== 1 && <span className="text-[8px] font-mono text-cyan-400 ml-1 tracking-wider">PLAYOFFS</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-white">{t.w}-{t.l}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-300 hidden sm:table-cell">{t.pf.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 hidden sm:table-cell">{t.pa.toFixed(1)}</td>
                      <td className={`px-3 py-2 text-center font-mono font-bold text-[11px] ${t.streak.startsWith('W') ? 'text-emerald-400' : 'text-rose-400'}`}>{t.streak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500 tracking-widest">TOP 4 ADVANCE TO PLAYOFFS</span>
              <PreviewBadge />
            </div>
          </div>
        </div>

        {/* BRACKET */}
        <div>
          <SectionHeader icon={<Trophy className="w-4 h-4 text-amber-400" />} title="PLAYOFF BRACKET" subtitle="WK 15-16 · Single-elim" />
          <div className="relative rounded-xl border border-amber-500/20 bg-black/60 backdrop-blur-sm p-4 space-y-3">
            <BracketMatch label="SEMI 1 · WK 15" team1={PREVIEW_BRACKET.semi1.team1} team2={PREVIEW_BRACKET.semi1.team2} proj1={PREVIEW_BRACKET.semi1.proj1} proj2={PREVIEW_BRACKET.semi1.proj2} />
            <BracketMatch label="SEMI 2 · WK 15" team1={PREVIEW_BRACKET.semi2.team1} team2={PREVIEW_BRACKET.semi2.team2} proj1={PREVIEW_BRACKET.semi2.proj1} proj2={PREVIEW_BRACKET.semi2.proj2} />
            <div className="border-t border-amber-500/20 pt-3">
              <BracketMatch label="🏆 FINAL · WK 16" team1={PREVIEW_BRACKET.final.team1} team2={PREVIEW_BRACKET.final.team2} proj1={PREVIEW_BRACKET.final.proj1} proj2={PREVIEW_BRACKET.final.proj2} highlight />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-amber-400/70 tracking-widest flex items-center gap-1"><Crown className="w-3 h-3" /> CHAMPIONSHIP TROPHY MINTS ON WIN</span>
              <PreviewBadge />
            </div>
          </div>
        </div>
      </section>

      {/* PLAYER CARDS — top performers */}
      <section>
        <SectionHeader icon={<Star className="w-4 h-4 text-yellow-400" />} title="TOP PERFORMERS — WK 14" subtitle="Live PPR scoring · ESPN feed" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {PREVIEW_PLAYERS.map(p => <PlayerCard key={p.name} {...p} />)}
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionHeader icon={<Award className="w-4 h-4 text-emerald-400" />} title="OGUN LEADERBOARD" subtitle="Total prize-pool earnings · season-to-date" />
          <div className="relative rounded-xl overflow-hidden border border-emerald-500/20 bg-black/60 backdrop-blur-sm">
            {PREVIEW_LEADERBOARD.map((u, i) => (
              <div key={u.handle} className={`flex items-center gap-3 px-4 py-3 ${i < PREVIEW_LEADERBOARD.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' : i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white' : 'bg-white/10 text-gray-400'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{u.handle}</div>
                  <div className="text-[10px] font-mono text-gray-500">{u.wins}W · {u.picks} PICKS · {((u.wins / u.picks) * 100).toFixed(0)}% HIT RATE</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="arena-hologram-text font-black text-base">{u.ogun.toFixed(1)}</div>
                  <div className="text-[9px] font-mono text-gray-500 tracking-widest">OGUN WON</div>
                </div>
              </div>
            ))}
            <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500 tracking-widest">PRIZE-POOL EARNINGS · ALL LEAGUES</span>
              <PreviewBadge />
            </div>
          </div>
        </div>

        {/* CTA panel */}
        <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-black to-pink-950/40 p-5 flex flex-col justify-between overflow-hidden group arena-shimmer">
          <span className="arena-conic-ring" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-cyan-400" /><span className="text-[10px] font-mono text-cyan-300 tracking-widest">EVERY PIXEL ABOVE</span></div>
            <h3 className="arena-hologram-text text-xl font-black leading-tight tracking-tight mb-2">Build your league. Real prize pools. On-chain escrow.</h3>
            <p className="text-xs text-gray-400 leading-relaxed">All the numbers above are illustrative — but the moment you start a real league, those tables, brackets and player cards become live.</p>
          </div>
          <div className="relative mt-4 space-y-2">
            <ul className="text-[11px] text-gray-300 space-y-1.5">
              <li className="flex items-center gap-2"><Shield className="w-3 h-3 text-emerald-400" /> Smart-contract escrow on Polygon</li>
              <li className="flex items-center gap-2"><Coins className="w-3 h-3 text-amber-400" /> OGUN / POL / USDC / 7 wager tokens</li>
              <li className="flex items-center gap-2"><Target className="w-3 h-3 text-pink-400" /> Top-4 playoffs · Trophy NFT mints to champ</li>
              <li className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-cyan-400" /> Live ESPN PPR scoring · 30-min refresh</li>
            </ul>
            <button
              onClick={onStart}
              disabled={!canStart}
              className="w-full mt-3 relative px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-[0_0_24px_rgba(168,85,247,0.55)] ring-1 ring-cyan-300/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Plus className="inline w-3.5 h-3.5 mr-1 -mt-0.5" /> Start Your League
            </button>
            {!canStart && <p className="text-[10px] font-mono text-gray-500 text-center">Sign in to create a league.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-sm font-black tracking-widest text-white">{title}</h2>
      {subtitle && <span className="text-[10px] font-mono text-gray-500 tracking-wider">· {subtitle}</span>}
      <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      <PreviewBadge />
    </div>
  )
}

function BracketMatch({ label, team1, team2, proj1, proj2, highlight }: { label: string; team1: string; team2: string; proj1: number; proj2: number; highlight?: boolean }) {
  const winner = proj1 >= proj2 ? 1 : 2
  return (
    <div>
      <div className={`text-[9px] font-mono tracking-widest mb-1.5 ${highlight ? 'text-amber-400' : 'text-gray-500'}`}>{label}</div>
      <div className="space-y-1">
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded ${winner === 1 ? (highlight ? 'bg-amber-500/15 border border-amber-400/40' : 'bg-cyan-500/10 border border-cyan-500/30') : 'bg-white/5 border border-white/10'}`}>
          <span className={`text-xs font-bold truncate ${winner === 1 ? 'text-white' : 'text-gray-400'}`}>{team1}</span>
          <span className={`text-xs font-mono shrink-0 ml-2 ${winner === 1 ? (highlight ? 'text-amber-300' : 'text-cyan-300') : 'text-gray-500'}`}>{proj1.toFixed(1)}</span>
        </div>
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded ${winner === 2 ? (highlight ? 'bg-amber-500/15 border border-amber-400/40' : 'bg-cyan-500/10 border border-cyan-500/30') : 'bg-white/5 border border-white/10'}`}>
          <span className={`text-xs font-bold truncate ${winner === 2 ? 'text-white' : 'text-gray-400'}`}>{team2}</span>
          <span className={`text-xs font-mono shrink-0 ml-2 ${winner === 2 ? (highlight ? 'text-amber-300' : 'text-cyan-300') : 'text-gray-500'}`}>{proj2.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

function PlayerCard({ name, pos, team, weekPts, projected, color, stat }: { name: string; pos: string; team: string; weekPts: number; projected: number; color: string; stat: string }) {
  const colorMap: Record<string, string> = {
    red:     'from-red-500/30 via-red-500/10 to-transparent border-red-500/30',
    purple:  'from-purple-500/30 via-purple-500/10 to-transparent border-purple-500/30',
    amber:   'from-amber-500/30 via-amber-500/10 to-transparent border-amber-500/30',
    fuchsia: 'from-fuchsia-500/30 via-fuchsia-500/10 to-transparent border-fuchsia-500/30',
    cyan:    'from-cyan-500/30 via-cyan-500/10 to-transparent border-cyan-500/30',
    rose:    'from-rose-500/30 via-rose-500/10 to-transparent border-rose-500/30',
  }
  const beat = weekPts > projected
  return (
    <div className={`group relative rounded-xl overflow-hidden border bg-gradient-to-b ${colorMap[color]} p-3 hover:scale-[1.02] transition-transform`}>
      <span className="arena-conic-ring" aria-hidden />
      <div className="relative flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold tracking-widest text-white bg-black/60 px-1.5 py-0.5 rounded">{pos}</span>
        <span className="text-[9px] font-mono text-gray-300 tracking-widest">{team}</span>
      </div>
      <div className="relative">
        <div className="text-sm font-black text-white truncate leading-tight">{name}</div>
        <div className="text-[9px] font-mono text-gray-400 mt-0.5">{stat}</div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="arena-hologram-text text-2xl font-black leading-none">{weekPts.toFixed(1)}</div>
            <div className="text-[9px] font-mono text-gray-500 tracking-widest mt-0.5">PPR PTS</div>
          </div>
          <div className={`text-[10px] font-mono font-bold ${beat ? 'text-emerald-400' : 'text-rose-400'}`}>{beat ? '↑' : '↓'} PROJ {projected.toFixed(1)}</div>
        </div>
      </div>
    </div>
  )
}

function LeagueCard({ league }: { league: FantasyLeague }) {
  const id = String((league as any)._id)
  const statusColor: Record<string, string> = {
    open: 'bg-cyan-500/20 text-cyan-300',
    drafting: 'bg-yellow-500/20 text-yellow-300',
    live: 'bg-green-500/20 text-green-300',
    complete: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }
  return (
    <Link href={`/arena/fantasy/${id}`} className="group block relative bg-gray-900/80 border border-gray-800 hover:border-cyan-500/50 rounded-lg p-4 transition overflow-hidden">
      <span className="arena-conic-ring" aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-white">{league.leagueName}</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusColor[league.status] || ''}`}>
          {league.status}
        </span>
      </div>
      <div className="text-xs text-gray-400 flex items-center gap-3">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(league.teams || []).length}/{league.maxTeams}</span>
        <span className="flex items-center gap-1"><Coins className="w-3 h-3" />{league.entryFee} {league.entryToken}</span>
        <span>by @{league.commissionerHandle}</span>
      </div>
    </Link>
  )
}

function CreateLeagueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leagueName, setLeagueName] = useState('')
  const [maxTeams, setMaxTeams] = useState(10)
  const [entryToken, setEntryToken] = useState<EntryToken>('OGUN')
  const [entryFee, setEntryFee] = useState(100)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (leagueName.trim().length < 3) return toast.error('League name must be at least 3 chars')
    setSubmitting(true)
    try {
      const r = await fetch('/api/arena/fantasy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueName, maxTeams, entryToken, entryFee }),
      })
      const d = await r.json()
      if (!r.ok) return toast.error(d.error || 'Failed to create')
      toast.success('League created!')
      onCreated()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Fantasy League</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <label className="block mb-3">
          <span className="text-xs text-gray-400">League Name</span>
          <input
            type="text"
            value={leagueName}
            onChange={e => setLeagueName(e.target.value)}
            placeholder="Sunday Degens"
            className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
            maxLength={60}
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-gray-400">Max Teams</span>
          <select
            value={maxTeams}
            onChange={e => setMaxTeams(Number(e.target.value))}
            className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
          >
            {[4, 6, 8, 10, 12, 14].map(n => <option key={n} value={n} className="bg-gray-900">{n} teams</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-xs text-gray-400">Entry Token</span>
            <select
              value={entryToken}
              onChange={e => setEntryToken(e.target.value as EntryToken)}
              className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
            >
              {Object.keys(TOKEN_CONFIG).map(token => {
                const live = isTokenLive(token)
                const info = TOKEN_INFO[token as keyof typeof TOKEN_INFO]
                return (
                  <option key={token} value={token} disabled={!live} className="bg-gray-900">
                    {info?.icon || ''} {TOKEN_CONFIG[token]?.label || token}{!live ? ' (coming)' : ''}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">Entry Fee</span>
            <input
              type="number"
              value={entryFee}
              onChange={e => setEntryFee(Number(e.target.value))}
              min={1}
              className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="text-[11px] text-gray-500 mb-4 bg-black/40 border border-gray-800 rounded p-3">
          Default prize split: 1st 60% · 2nd 25% · 3rd 10% · 5% platform fee · 0.05% SoundChain fee<br />
          Smart contract: <code className="text-cyan-400">FantasyLeagueEscrow.sol</code> (deployment pending)<br />
          Phase 1 ships off-chain escrow via arena backend wallet — same pattern as challenge matches.
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded py-2 font-bold text-sm flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create League'}
        </button>
      </div>
    </div>
  )
}
