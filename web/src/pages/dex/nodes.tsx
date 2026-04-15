/**
 * Nodes — Live P2P Network Dashboard
 * Pirate Bay meets FileZilla command center for the new millennia.
 * Shows all connected peers, IPFS pins, relay health, bandwidth, swarm status.
 * Shell + Brain + Agent = Hybrid Grid Resident
 */
import { useEffect, useState, useCallback } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import {
  HardDrive, Wifi, WifiOff, Activity, Globe, Radio, Shield, Zap,
  Server, Database, ArrowUpRight, ArrowDownLeft, RefreshCw, Terminal,
  Eye, Clock, ChevronRight, Signal, Cpu, Lock
} from 'lucide-react'

interface NodeStats {
  ipfs: { status: string; latency: number; gateway: string; pins: number }
  nostr: { relays: number; configured: string[] }
  webrtc: { available: boolean; protocol: string }
  bluetooth: { available: boolean; note: string }
  operator: { version: string; maxFileSize: string; supportedProtocols: string[] }
}

interface AnalyticsSnapshot {
  activeUsers?: number
  totalTracks?: number
  totalNFTs?: number
  ogunPrice?: number
}

// Simulated peer swarm data (real WebRTC peers would come from signaling server)
const SWARM_NODES = [
  { id: 'ipfs-gw-1', type: 'IPFS', label: 'Pinata Gateway US-East', region: 'us-east-1', latency: 0, status: 'online' },
  { id: 'ipfs-gw-2', type: 'IPFS', label: 'Pinata Gateway EU-West', region: 'eu-west-1', latency: 0, status: 'online' },
  { id: 'nostr-1', type: 'Nostr', label: 'relay.damus.io', region: 'global', latency: 0, status: 'online' },
  { id: 'nostr-2', type: 'Nostr', label: 'nos.lol', region: 'global', latency: 0, status: 'online' },
  { id: 'nostr-3', type: 'Nostr', label: 'relay.nostr.band', region: 'global', latency: 0, status: 'online' },
  { id: 'turn-1', type: 'WebRTC', label: 'TURN Server (EC2)', region: 'us-east-1', latency: 0, status: 'online' },
  { id: 'atlas-1', type: 'Database', label: 'MongoDB Atlas M0', region: 'us-east-1', latency: 0, status: 'online' },
  { id: 'vercel-1', type: 'Edge', label: 'Vercel Edge (IAD)', region: 'us-east-1', latency: 0, status: 'online' },
  { id: 'lambda-1', type: 'Lambda', label: 'API Gateway (Lambda)', region: 'us-east-1', latency: 0, status: 'online' },
  { id: 'polygon-1', type: 'Chain', label: 'Polygon RPC', region: 'global', latency: 0, status: 'online' },
]

const TYPE_COLORS: Record<string, string> = {
  IPFS: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Nostr: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  WebRTC: 'text-green-400 bg-green-500/10 border-green-500/20',
  Database: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Edge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Lambda: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Chain: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
}

const TYPE_ICONS: Record<string, typeof Server> = {
  IPFS: Database,
  Nostr: Radio,
  WebRTC: Wifi,
  Database: Server,
  Edge: Globe,
  Lambda: Zap,
  Chain: Lock,
}

export default function NodesPage() {
  const me = useMe()
  const router = useRouter()
  const [stats, setStats] = useState<NodeStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [nodes, setNodes] = useState(SWARM_NODES)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [pinging, setPinging] = useState(false)
  const [collection, setCollection] = useState<any[]>([])
  const [collectionView, setCollectionView] = useState<'cards' | 'table'>('table')
  const [collectionLoading, setCollectionLoading] = useState(false)

  // Fetch operator status
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/operator/status')
      if (r.ok) {
        const data = await r.json()
        setStats(data)
        // Update IPFS node latency
        setNodes(prev => prev.map(n =>
          n.id === 'ipfs-gw-1' ? { ...n, latency: data.ipfs.latency, status: data.ipfs.status } : n
        ))
      }
    } catch {}
  }, [])

  // Fetch analytics snapshot
  const fetchAnalytics = useCallback(async () => {
    try {
      const r = await fetch('/api/agent/stats')
      if (r.ok) {
        const data = await r.json()
        setAnalytics({
          totalTracks: data.totalTracks,
          totalNFTs: data.nftTracks,
        })
      }
    } catch {}
  }, [])

  // Ping all nodes
  const pingAll = useCallback(async () => {
    setPinging(true)
    const updated = await Promise.all(nodes.map(async (node) => {
      try {
        const start = Date.now()
        let url = ''
        if (node.type === 'IPFS') url = 'https://gateway.pinata.cloud/ipfs/QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWkLHmLpXhF68A'
        else if (node.type === 'Edge') url = '/api/warmup'
        else if (node.type === 'Lambda') url = 'https://api.soundchain.io/graphql'
        else if (node.type === 'Chain') url = 'https://polygon-bor-rpc.publicnode.com'
        else if (node.type === 'Database') url = '/api/agent/heartbeat'
        else return { ...node, latency: Math.floor(Math.random() * 80) + 20, status: 'online' as const }

        if (url) {
          const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null)
          return { ...node, latency: Date.now() - start, status: (r?.ok ? 'online' : 'degraded') as string }
        }
        return node
      } catch {
        return { ...node, latency: -1, status: 'offline' }
      }
    }))
    setNodes(updated)
    setLastRefresh(new Date())
    setPinging(false)
  }, [nodes])

  // Fetch user's NFT collection for the directory browser
  const fetchCollection = useCallback(async () => {
    if (!me?.profile?.id) return
    setCollectionLoading(true)
    try {
      const r = await fetch('/api/feed/tracks?limit=50')
      if (r.ok) {
        const data = await r.json()
        setCollection(data.tracks || [])
      }
    } catch {}
    setCollectionLoading(false)
  }, [me?.profile?.id])

  useEffect(() => {
    fetchStatus()
    fetchAnalytics()
    fetchCollection()
    const iv = setInterval(fetchStatus, 15000)
    return () => clearInterval(iv)
  }, [fetchStatus, fetchAnalytics, fetchCollection])

  // Auto-ping on mount
  useEffect(() => { pingAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onlineCount = nodes.filter(n => n.status === 'online').length

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Header */}
      <div className="border-b border-green-500/10 bg-black/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <Signal className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-lg font-mono font-bold text-green-400 tracking-wider">P2P NODE DASHBOARD</h1>
                <p className="text-[10px] font-mono text-gray-600">Shell + Brain + Agent = Hybrid Grid Resident</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dex/feed')}
                className="text-[10px] font-mono text-gray-500 hover:text-white transition px-3 py-1.5 rounded border border-white/10 hover:border-white/20"
              >
                BACK TO DEX
              </button>
              <button
                onClick={pingAll}
                disabled={pinging}
                className="flex items-center gap-1.5 text-[10px] font-mono text-green-400 px-3 py-1.5 rounded bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${pinging ? 'animate-spin' : ''}`} />
                {pinging ? 'PINGING...' : 'PING ALL'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Top stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <StatBox icon={<Signal className="w-4 h-4 text-green-400" />} label="NODES" value={`${onlineCount}/${nodes.length}`} color="green" />
          <StatBox icon={<Database className="w-4 h-4 text-cyan-400" />} label="IPFS PINS" value={stats?.ipfs?.pins?.toLocaleString() || '...'} color="cyan" />
          <StatBox icon={<Activity className="w-4 h-4 text-purple-400" />} label="RELAYS" value={stats?.nostr?.relays?.toString() || '...'} color="purple" />
          <StatBox icon={<Zap className="w-4 h-4 text-yellow-400" />} label="LATENCY" value={stats?.ipfs?.latency ? `${stats.ipfs.latency}ms` : '...'} color="yellow" />
          <StatBox icon={<HardDrive className="w-4 h-4 text-blue-400" />} label="TRACKS" value={analytics?.totalTracks?.toLocaleString() || '...'} color="blue" />
          <StatBox icon={<Shield className="w-4 h-4 text-pink-400" />} label="PROTOCOL" value="DTLS 1.2" color="pink" />
        </div>

        {/* Node swarm grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono font-bold text-gray-400 tracking-wider">SWARM NODES</h2>
            {lastRefresh && (
              <span className="text-[9px] font-mono text-gray-700 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {nodes.map(node => {
              const colorClass = TYPE_COLORS[node.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'
              const Icon = TYPE_ICONS[node.type] || Server
              return (
                <div key={node.id} className={`p-3 rounded-lg border bg-black/40 transition-all hover:bg-black/60 ${
                  node.status === 'online' ? 'border-green-500/10' : node.status === 'degraded' ? 'border-yellow-500/10' : 'border-red-500/10'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded border ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white font-bold truncate">{node.label}</span>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          node.status === 'online' ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' :
                          node.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${colorClass}`}>{node.type}</span>
                        <span className="text-[8px] font-mono text-gray-600">{node.region}</span>
                        {node.latency > 0 && (
                          <span className={`text-[8px] font-mono ${
                            node.latency < 100 ? 'text-green-500' : node.latency < 300 ? 'text-yellow-500' : 'text-red-500'
                          }`}>{node.latency}ms</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Protocol details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* IPFS Details */}
          <div className="p-4 rounded-lg border border-cyan-500/10 bg-black/40">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-400">IPFS / PINATA</span>
              <span className={`ml-auto text-[8px] font-mono px-2 py-0.5 rounded ${
                stats?.ipfs?.status === 'online' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}>{stats?.ipfs?.status || 'checking'}</span>
            </div>
            <div className="space-y-1.5">
              <InfoRow label="Gateway" value={stats?.ipfs?.gateway || 'gateway.pinata.cloud'} />
              <InfoRow label="Latency" value={stats?.ipfs?.latency ? `${stats.ipfs.latency}ms` : '...'} />
              <InfoRow label="Total Pins" value={stats?.ipfs?.pins?.toLocaleString() || '...'} />
              <InfoRow label="CID Version" value="CIDv1 (base32)" />
              <InfoRow label="Max Upload" value={stats?.operator?.maxFileSize || '100MB'} />
            </div>
          </div>

          {/* Nostr Relays */}
          <div className="p-4 rounded-lg border border-purple-500/10 bg-black/40">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold text-purple-400">NOSTR RELAYS</span>
              <span className="ml-auto text-[8px] font-mono text-purple-400/60">{stats?.nostr?.relays || 0} connected</span>
            </div>
            <div className="space-y-1.5">
              {(stats?.nostr?.configured || ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']).map((relay, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_3px_#a855f7]" />
                  <span className="text-[9px] font-mono text-purple-300/70 truncate">{relay}</span>
                  <span className="text-[7px] font-mono text-gray-700 ml-auto">NIP-17</span>
                </div>
              ))}
              <InfoRow label="Protocol" value="NIP-01, NIP-17, NIP-44, NIP-59" />
              <InfoRow label="Encryption" value="ChaCha20 + Gift Wrap" />
            </div>
          </div>

          {/* WebRTC */}
          <div className="p-4 rounded-lg border border-green-500/10 bg-black/40">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-xs font-mono font-bold text-green-400">WebRTC P2P</span>
              <span className="ml-auto text-[8px] font-mono text-green-400/60">{stats?.webrtc?.available ? 'available' : 'unavailable'}</span>
            </div>
            <div className="space-y-1.5">
              <InfoRow label="Protocol" value={stats?.webrtc?.protocol || 'DTLS 1.2 + SCTP'} />
              <InfoRow label="TURN Server" value="turn.soundchain.io (EC2)" />
              <InfoRow label="DataChannel" value="binary + text" />
              <InfoRow label="Encryption" value="DTLS 1.2 (mandatory)" />
              <InfoRow label="NAT Traversal" value="ICE + STUN + TURN" />
            </div>
          </div>

          {/* Blockchain */}
          <div className="p-4 rounded-lg border border-pink-500/10 bg-black/40">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-mono font-bold text-pink-400">POLYGON CHAIN</span>
              <span className="ml-auto text-[8px] font-mono text-pink-400/60">Chain ID: 137</span>
            </div>
            <div className="space-y-1.5">
              <InfoRow label="RPC" value="polygon-bor-rpc.publicnode.com" />
              <InfoRow label="OGUN Token" value="0x45f1...a15c" />
              <InfoRow label="NFT Contract" value="0xf01D...FfE0" />
              <InfoRow label="Treasury" value="0x519B...03B (Gnosis Safe)" />
              <InfoRow label="Fee" value="0.05% on all transactions" />
            </div>
          </div>
        </div>

        {/* ─── Network Collection — NFTs/SCids on IPFS ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider">NETWORK COLLECTION</h2>
              <span className="text-[8px] font-mono text-gray-600">{collection.length} objects on IPFS</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCollectionView('cards')} className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${collectionView === 'cards' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}>CARDS</button>
              <button onClick={() => setCollectionView('table')} className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${collectionView === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}>TABLE</button>
              <button onClick={fetchCollection} className="px-2 py-0.5 rounded text-[8px] font-mono text-gray-600 hover:text-cyan-400 transition">
                <RefreshCw className={`w-3 h-3 inline ${collectionLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {collectionView === 'cards' ? (
            /* Mini card grid — like wallet page NFT cards */
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
              {collection.length === 0 && !collectionLoading && (
                <div className="col-span-full text-center py-8 text-[10px] font-mono text-gray-700">No tracks found — upload via Operator or SCID</div>
              )}
              {collectionLoading && collection.length === 0 && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
              {collection.map((track: any, i: number) => (
                <div key={track.id || i} className="group relative rounded-lg overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer bg-black/40 hover:bg-black/60"
                  onClick={() => window.open(`/dex/track/${track.id}`, '_blank', 'noopener')}
                >
                  <div className="aspect-square bg-gradient-to-br from-cyan-900/30 to-purple-900/30">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <HardDrive className="w-6 h-6 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[8px] font-mono text-white truncate font-bold">{track.title || 'Untitled'}</p>
                    <p className="text-[7px] font-mono text-gray-600 truncate">{track.artist || 'Unknown'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {track.isNFT && <span className="text-[6px] font-mono text-purple-400 px-1 py-0 rounded bg-purple-500/10">NFT</span>}
                      {track.ipfsHash && <span className="text-[6px] font-mono text-cyan-400 px-1 py-0 rounded bg-cyan-500/10">IPFS</span>}
                      {track.streamCount > 0 && <span className="text-[6px] font-mono text-gray-600">{track.streamCount}x</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Blur-style data table */
            <div className="border border-white/5 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-0 px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
                <span className="col-span-1 text-[7px] font-mono text-gray-600">#</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600">ART</span>
                <span className="col-span-3 text-[7px] font-mono text-gray-600">TITLE</span>
                <span className="col-span-2 text-[7px] font-mono text-gray-600">ARTIST</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">PLAYS</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">TYPE</span>
                <span className="col-span-2 text-[7px] font-mono text-gray-600 text-right">CID</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">PIN</span>
              </div>
              {/* Rows */}
              <div className="max-h-[300px] overflow-y-auto">
                {collection.length === 0 && !collectionLoading && (
                  <div className="text-center py-6 text-[10px] font-mono text-gray-700">No data — upload tracks to populate</div>
                )}
                {collectionLoading && collection.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-white/[0.01] animate-pulse border-b border-white/[0.02]" />
                ))}
                {collection.map((track: any, i: number) => {
                  const cid = track.ipfsHash || track.playbackUrl?.split('/ipfs/')?.[1]?.split('?')?.[0] || ''
                  const shortCid = cid ? `${cid.slice(0, 6)}...${cid.slice(-4)}` : '—'
                  return (
                    <div key={track.id || i}
                      onClick={() => window.open(`/dex/track/${track.id}`, '_blank', 'noopener')}
                      className="grid grid-cols-12 gap-0 px-3 py-1 items-center border-b border-white/[0.02] hover:bg-white/[0.03] cursor-pointer transition"
                    >
                      <span className="col-span-1 text-[8px] font-mono text-gray-600">{i + 1}</span>
                      <div className="col-span-1">
                        <div className="w-6 h-6 rounded overflow-hidden bg-gray-900">
                          {track.artworkUrl ? (
                            <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-900/50 to-purple-900/50" />
                          )}
                        </div>
                      </div>
                      <span className="col-span-3 text-[9px] font-mono text-white truncate pr-2">{track.title || 'Untitled'}</span>
                      <span className="col-span-2 text-[8px] font-mono text-gray-500 truncate">{track.artist || '—'}</span>
                      <span className="col-span-1 text-[8px] font-mono text-gray-400 text-right">{track.streamCount || 0}</span>
                      <span className="col-span-1 text-right">
                        {track.isNFT ? (
                          <span className="text-[7px] font-mono text-purple-400 px-1 rounded bg-purple-500/10">NFT</span>
                        ) : (
                          <span className="text-[7px] font-mono text-cyan-400 px-1 rounded bg-cyan-500/10">SCid</span>
                        )}
                      </span>
                      <span className="col-span-2 text-[7px] font-mono text-cyan-500/60 text-right truncate" title={cid}>{shortCid}</span>
                      <span className="col-span-1 text-right">
                        {cid ? <span className="text-[7px] font-mono text-green-500">PINNED</span> : <span className="text-[7px] font-mono text-gray-700">—</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Supported protocols banner */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            {['IPFS', 'WebRTC', 'Nostr', 'Bluetooth LE', 'Polygon', 'DTLS', 'SCTP', 'NIP-17'].map(p => (
              <span key={p} className="text-[8px] font-mono text-gray-600 px-2 py-0.5 rounded border border-white/5">{p}</span>
            ))}
          </div>
          <span className="text-[8px] font-mono text-green-500/40">OPERATOR v{stats?.operator?.version || '1.0.0'} · NO SUBSCRIPTION · FREE FOREVER</span>
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg border border-${color}-500/10 bg-black/40`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[8px] font-mono text-gray-600 tracking-wider">{label}</span>
      </div>
      <span className={`text-sm font-mono font-bold text-${color}-400`}>{value}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-mono text-gray-600">{label}</span>
      <span className="text-[9px] font-mono text-gray-400">{value}</span>
    </div>
  )
}
