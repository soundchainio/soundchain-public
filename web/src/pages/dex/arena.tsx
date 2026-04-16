/**
 * /dex/arena — Console Gaming Arena (Nodeverse)
 *
 * Players connect their Xbox/PlayStation/PC via:
 * - Parsec (P2P low-latency game streaming)
 * - GeForce NOW (cloud gaming via browser)
 * - Xbox Cloud Gaming (xCloud)
 * - Steam Remote Play
 *
 * SoundChain layer adds:
 * - Matchmaking (active players list)
 * - OGUN-staked tournaments (winner takes pot, 0.05% fee)
 * - Spectator mode (residents portal in to watch)
 * - PPV gating (exclusive matches charge OGUN to watch — 0.05% fee)
 * - On-chain leaderboards
 * - Replay storage on IPFS
 */
import { ReactElement, useState } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
import { ArrowLeft, Gamepad2, Trophy, Users, Eye, Coins, Zap, Lock, Radio, ExternalLink } from 'lucide-react'

interface Match {
  id: string
  title: string
  game: string
  player1: string
  player2: string
  status: 'live' | 'upcoming' | 'finished'
  spectators: number
  isPPV: boolean
  ppvCost: number
  ogunPot?: number
  startTime?: string
}

// Mock matches — real ones will come from /api/arena/matches
const MOCK_MATCHES: Match[] = [
  { id: 'm1', title: 'Championship Quarter-Final', game: 'NBA 2K26', player1: 'furdA1', player2: 'jeremy_soundchain', status: 'live', spectators: 47, isPPV: true, ppvCost: 5, ogunPot: 100 },
  { id: 'm2', title: 'Casual Pickup Game', game: 'NBA 2K26', player1: 'rog_', player2: 'mini', status: 'live', spectators: 12, isPPV: false, ppvCost: 0 },
  { id: 'm3', title: 'Friday Night Tournament', game: 'Street Fighter 6', player1: 'TBD', player2: 'TBD', status: 'upcoming', spectators: 0, isPPV: true, ppvCost: 10, ogunPot: 500, startTime: 'Friday 8pm PST' },
  { id: 'm4', title: 'Squad Practice', game: 'Apex Legends', player1: 'furdA1', player2: '+3 squad', status: 'live', spectators: 8, isPPV: false, ppvCost: 0 },
]

const SUPPORTED_PLATFORMS = [
  { id: 'parsec', name: 'Parsec', tag: 'P2P · low latency', color: 'text-cyan-400' },
  { id: 'gfn', name: 'GeForce NOW', tag: 'NVIDIA cloud', color: 'text-green-400' },
  { id: 'xcloud', name: 'Xbox Cloud', tag: 'Microsoft', color: 'text-blue-400' },
  { id: 'remote', name: 'PlayStation Remote', tag: 'Sony WebRTC', color: 'text-indigo-400' },
  { id: 'steam', name: 'Steam Remote Play', tag: 'Valve', color: 'text-orange-400' },
]

export default function ArenaPage() {
  const me = useMe()
  const router = useRouter()
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [paidPPV, setPaidPPV] = useState<Set<string>>(new Set())

  const buyPPV = async (match: Match) => {
    // TODO: real OGUN transfer to treasury (0.05% fee)
    if (window.confirm(`Pay ${match.ppvCost} OGUN to watch?\n\n0.05% fee goes to SoundChain treasury.`)) {
      setPaidPPV(s => new Set([...Array.from(s), match.id]))
      fetch('/api/agent/analytics-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'arena_ppv_purchase', meta: { matchId: match.id, cost: match.ppvCost, game: match.game } }),
      }).catch(() => {})
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <TopNavBar />

      {/* Lower nav pills */}
      <div className="border-b border-red-500/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
          <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/dex/users/${me.profile.userHandle}` }] : []),
                { id: 'nodes', label: 'Nodes', route: '/dex/nodes' },
                { id: 'explore3d', label: 'Explore 3D', route: '/dex/explore3d' },
                { id: 'gallery3d', label: 'Gallery 3D', route: '/dex/gallery3d' },
                { id: 'arena', label: 'Arena', route: '/dex/arena' },
                { id: 'explore', label: 'Explore', route: '/dex/explore' },
                { id: 'users', label: 'Users', route: '/dex/users' },
                { id: 'radio', label: 'Radio', route: '/radio' },
                { id: 'moltbook', label: 'Moltbook', route: '/backend' },
                { id: 'library', label: 'Library', route: '/dex/library' },
                { id: 'playlist', label: 'Playlists', route: '/dex/playlist' },
                { id: 'archive', label: 'Archive', route: '/dex/archive' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => router.push(item.route)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    item.id === 'arena'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-red-500/20 bg-black/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dex/nodes')} className="p-1.5 rounded hover:bg-white/10 transition">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <Gamepad2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-mono font-bold text-red-400 tracking-wider">ARENA</h1>
              <p className="text-[9px] font-mono text-gray-600">CONSOLE GAMING via PORTALNODES · OGUN tournaments · spectator mode · PPV exclusive matches</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: <Radio className="w-4 h-4 text-red-400" />, label: 'LIVE MATCHES', value: MOCK_MATCHES.filter(m => m.status === 'live').length, color: 'red' },
            { icon: <Eye className="w-4 h-4 text-cyan-400" />, label: 'SPECTATORS', value: MOCK_MATCHES.reduce((s, m) => s + m.spectators, 0), color: 'cyan' },
            { icon: <Coins className="w-4 h-4 text-yellow-400" />, label: 'OGUN POT', value: MOCK_MATCHES.reduce((s, m) => s + (m.ogunPot || 0), 0).toLocaleString(), color: 'yellow' },
            { icon: <Trophy className="w-4 h-4 text-purple-400" />, label: 'PLATFORM FEE', value: '0.05%', color: 'purple' },
          ].map((s, i) => (
            <div key={i} className={`p-3 rounded-lg border border-${s.color}-500/10 bg-black/40`}>
              <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-[8px] font-mono text-gray-600 tracking-wider">{s.label}</span></div>
              <span className={`text-sm font-mono font-bold text-${s.color}-400`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Supported platforms */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/30">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-2">CONNECT YOUR CONSOLE / PC</div>
          <div className="flex items-center gap-2 flex-wrap">
            {SUPPORTED_PLATFORMS.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-white/[0.02] text-[10px] font-mono">
                <span className={p.color}>{p.name}</span>
                <span className="text-gray-700 text-[8px]">{p.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live matches grid */}
        <div>
          <h2 className="text-xs font-mono font-bold text-gray-400 tracking-wider mb-2 flex items-center gap-2">
            <Zap className="w-3 h-3 text-red-400" /> LIVE MATCHES
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MOCK_MATCHES.map(match => {
              const isPaid = paidPPV.has(match.id)
              const canWatch = !match.isPPV || isPaid
              return (
                <div key={match.id} className="p-4 rounded-lg border border-white/10 bg-black/40 hover:bg-black/60 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold ${match.status === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                      {match.status === 'live' ? '● LIVE' : `⏰ ${match.startTime || 'UPCOMING'}`}
                    </span>
                    {match.isPPV && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> PPV {match.ppvCost} OGUN
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-mono font-bold text-white mb-1">{match.title}</h3>
                  <p className="text-[10px] font-mono text-gray-500 mb-2">{match.game}</p>
                  <div className="flex items-center gap-3 mb-3 text-[10px] font-mono">
                    <span className="text-cyan-400">{match.player1}</span>
                    <span className="text-gray-600">vs</span>
                    <span className="text-purple-400">{match.player2}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {match.spectators}</span>
                      {match.ogunPot ? <span className="flex items-center gap-1 text-yellow-500"><Coins className="w-3 h-3" /> {match.ogunPot}</span> : null}
                    </div>
                    {match.status === 'live' ? (
                      canWatch ? (
                        <button onClick={() => setSelectedMatch(match)} className="px-3 py-1 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition">
                          WATCH
                        </button>
                      ) : (
                        <button onClick={() => buyPPV(match)} className="flex items-center gap-1 px-3 py-1 rounded text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition">
                          <Lock className="w-3 h-3" /> Pay {match.ppvCost} OGUN
                        </button>
                      )
                    ) : (
                      <button className="px-3 py-1 rounded text-[10px] font-mono text-gray-500 border border-white/10">
                        Set Reminder
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Soundchain Layer pitch */}
        <div className="p-4 rounded-lg border border-red-500/10 bg-gradient-to-br from-red-900/10 via-black/40 to-yellow-900/10">
          <h2 className="text-xs font-mono font-bold text-yellow-400 tracking-wider mb-3">THE SOUNDCHAIN LAYER</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-mono text-gray-400">
            <div>✓ Matchmaking by location/skill</div>
            <div>✓ OGUN-staked tournaments (0.05% fee on pot)</div>
            <div>✓ Spectator mode (residents portal in)</div>
            <div>✓ PPV exclusive matches (0.05% fee per ticket)</div>
            <div>✓ On-chain leaderboards (Polygon)</div>
            <div>✓ Replay storage (IPFS pinned)</div>
            <div>✓ Live chat overlay during play</div>
            <div>✓ Cross-platform: Xbox · PlayStation · PC</div>
          </div>
          <div className="mt-3 pt-3 border-t border-red-500/10 text-[9px] font-mono text-gray-600">
            Your console + WebRTC + SoundChain = global tournaments with on-chain prizes.
            We don't host games — we host the social + economic layer.
          </div>
        </div>
      </div>

      {/* Match viewer modal — PPV gated */}
      {selectedMatch && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setSelectedMatch(null)}>
          <div className="w-full max-w-5xl bg-[#0a0f1f] border border-red-500/30 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 bg-black/40">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">● LIVE</span>
                <h3 className="text-sm font-mono font-bold text-white">{selectedMatch.title}</h3>
                <span className="text-[10px] font-mono text-gray-500">{selectedMatch.player1} vs {selectedMatch.player2}</span>
              </div>
              <button onClick={() => setSelectedMatch(null)} className="p-1 hover:bg-white/10 rounded text-gray-400 text-xl leading-none">×</button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {/* Real implementation: <iframe src={parsec.com/embed/...} /> */}
              <div className="text-center space-y-2 p-8">
                <Gamepad2 className="w-16 h-16 text-red-500/30 mx-auto" />
                <div className="text-red-400 font-mono text-sm">PARSEC STREAM PLACEHOLDER</div>
                <div className="text-gray-500 font-mono text-[10px] max-w-md">
                  Real implementation: iframe to parsec.app/embed/{selectedMatch.id}<br/>
                  P2P WebRTC stream from player's console → your browser<br/>
                  Sub-50ms latency · 1080p60 · audio + chat overlay
                </div>
                <a href="https://parsec.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[10px] font-mono text-cyan-400 hover:text-cyan-300">
                  parsec.app <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {selectedMatch.isPPV && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-[9px] font-mono text-yellow-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PPV TICKET ACTIVE
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-red-500/20 bg-black/40 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-3 text-gray-400">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-cyan-400" /> {selectedMatch.spectators + 1} watching</span>
                {selectedMatch.ogunPot ? <span className="flex items-center gap-1 text-yellow-400"><Coins className="w-3 h-3" /> {selectedMatch.ogunPot} OGUN pot</span> : null}
              </div>
              <span className="text-gray-600">{selectedMatch.game} · powered by Parsec</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

;(ArenaPage as any).getLayout = (page: ReactElement) => page
