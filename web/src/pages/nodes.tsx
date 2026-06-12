/**
 * Nodes — Live P2P Network Dashboard
 * Shows all connected peers, IPFS pins, relay health, bandwidth, swarm status.
 */
import { useEffect, useState, useCallback, useMemo, useRef, ReactElement, Component, ErrorInfo, ReactNode } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { useGroupedTracks as useGroupedTracksQuery } from 'hooks/useGroupedTracksDirect'  // Phase 7e — Vercel-direct
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import dynamic from 'next/dynamic'
import { DexNavBar } from 'components/DexNavBar'
import MainPillNav from 'components/MainPillNav'
import { Post } from 'components/Post/Post'
import { CompactPost } from 'components/Post/CompactPost'
import { PostFormTimeline } from 'components/Post/PostFormTimeline'
import { PostSkeleton } from 'components/Post/PostSkeleton'
import { FlightDeck } from 'components/nodes/FlightDeck'

// Nodes page uses a custom getLayout (skips default <Layout>), so the modals
// mounted there (AuthorActionsModal + PostModal) never render. Mount them here
// so the ellipsis → Edit/Delete flow works on /nodes.
const AuthorActionsModal = dynamic(() => import('components/modals/AuthorActionsModal').then(m => m.AuthorActionsModal), { ssr: false })
const PostModal = dynamic(() => import('components/Post/PostModal').then(m => m.PostModal), { ssr: false })
// 24hr Stories/Reels bar — match the dex schema feed header so users see reels here too.
const StoriesBar = dynamic(() => import('components/dex/StoriesBar').then(m => m.StoriesBar), { ssr: false })
import {
  HardDrive, Wifi, WifiOff, Activity, Globe, Radio, Shield, Zap,
  Server, Database, ArrowUpRight, ArrowDownLeft, RefreshCw, Terminal,
  Eye, Clock, ChevronRight, ChevronDown, Signal, Cpu, Lock, Music, Film, PenLine,
  LayoutGrid, List as ListIcon
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
  // Lambda/Apollo detached (sovereign roster, Jun 2026) — anvil is the compute node now
  { id: 'anvil-1', type: 'Anvil', label: 'Anvil (Sovereign GPU)', region: 'sovereign', latency: 0, status: 'online' },
  { id: 'polygon-1', type: 'Chain', label: 'Polygon RPC', region: 'global', latency: 0, status: 'online' },
]

const TYPE_COLORS: Record<string, string> = {
  IPFS: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Nostr: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  WebRTC: 'text-green-400 bg-green-500/10 border-green-500/20',
  Database: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Edge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Anvil: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Chain: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
}

const TYPE_ICONS: Record<string, typeof Server> = {
  IPFS: Database,
  Nostr: Radio,
  WebRTC: Wifi,
  Database: Server,
  Edge: Globe,
  Anvil: Cpu,
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
  const [collectionView, setCollectionView] = useState<'cards' | 'table'>('table')
  const [composerOpen, setComposerOpen] = useState(false)
  const [feedViewMode, setFeedViewMode] = useState<'list' | 'grid'>('list')
  const [mobileTab, setMobileTab] = useState<'network' | 'feed'>(() => {
    if (typeof window === 'undefined') return 'feed'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'network') return 'network'
    return 'feed'
  })

  // Avatar-menu Network link routes to /nodes?tab=network. Since user may already be
  // on /nodes when they click it, Next.js shallow-nav won't remount — sync from query.
  useEffect(() => {
    const t = router.query?.tab
    if (t === 'network') setMobileTab('network')
    else setMobileTab('feed')
  }, [router.query?.tab])
  // Feed — Vercel direct route (Phase 6: kills Apollo/Lambda dependency for reads)
  const { playlistState } = useAudioPlayerContext()
  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedCursor, setFeedCursor] = useState<string | null>(null)
  const [feedHasNext, setFeedHasNext] = useState(false)

  const loadFeed = useCallback(async (cursor?: string | null) => {
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (me?.profile?.id) params.set('profileId', me.profile.id)
      if (cursor) params.set('cursor', cursor)
      const r = await fetch(`/api/feed/posts?${params.toString()}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`feed ${r.status}`)
      const data = await r.json()
      setFeedPosts(prev => cursor ? [...prev, ...data.posts] : data.posts)
      setFeedHasNext(!!data.hasNextPage)
      setFeedCursor(data.endCursor || null)
    } catch (e) {
      // leave existing posts intact on error
    } finally {
      setFeedLoading(false)
    }
  }, [me?.profile?.id])

  useEffect(() => {
    setFeedLoading(true)
    loadFeed(null)
  }, [loadFeed])

  // Remove a post from the local feed state as soon as AuthorActionsModal confirms deletion.
  // The backend already marks deleted + clears feeditems; this just avoids a refetch roundtrip.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onDeleted = (e: Event) => {
      const postId = (e as CustomEvent<{ postId: string }>).detail?.postId
      if (!postId) return
      setFeedPosts(prev => prev.filter(p => p?.id !== postId))
    }
    window.addEventListener('soundchain:postDeleted', onDeleted)
    return () => window.removeEventListener('soundchain:postDeleted', onDeleted)
  }, [])

  // Adapt to the {post: ...} shape the rest of nodes.tsx expects
  const feedNodes = useMemo(() => feedPosts.map(p => ({ post: p })), [feedPosts])
  const feedPageInfo = { hasNextPage: feedHasNext, endCursor: feedCursor }
  const feedFetchMore = useCallback(() => {
    if (feedCursor) loadFeed(feedCursor)
  }, [feedCursor, loadFeed])
  // Auto-load the next feed page as you near the bottom (so grid/list don't stop at 20).
  // Additive pagination — appends to the existing .map, autoplay untouched. LOAD MORE
  // button stays as the Fire-TV/d-pad fallback. loadingMoreFeedRef dedupes the burst.
  const loadingMoreFeedRef = useRef(false)
  const feedFooterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = feedFooterRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && feedHasNext && !feedLoading && !loadingMoreFeedRef.current) {
        loadingMoreFeedRef.current = true
        feedFetchMore()
      }
    }, { rootMargin: '1200px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [feedHasNext, feedLoading, feedFetchMore])
  useEffect(() => { loadingMoreFeedRef.current = false }, [feedPosts.length])
  const handleFeedPlayClicked = useCallback((trackId: string) => {
    const tracks = feedNodes
      .filter(fi => fi?.post?.track && !fi.post.track.deleted)
      .map(fi => ({
        src: fi.post.track!.playbackUrl,
        trackId: fi.post.track!.id,
        art: fi.post.track!.artworkUrl,
        title: fi.post.track!.title,
        artist: fi.post.track!.artist,
        isFavorite: fi.post.track!.isFavorite,
      }))
    const idx = tracks.findIndex(t => t.trackId === trackId)
    playlistState(tracks as any, idx)
  }, [feedNodes, playlistState])

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
        else if (node.type === 'Anvil') {
          // sovereign box behind the relay — no-cors HEAD: resolving at all = up
          const aStart = Date.now()
          const ar = await fetch('https://anvil.soundchain.io', { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(5000) }).catch(() => null)
          return { ...node, latency: Date.now() - aStart, status: (ar ? 'online' : 'offline') as string }
        }
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

  // Grouped tracks — deduplicated editions (one card per unique track)
  const { data: tracksData, loading: tracksLoading, refetch: refetchTracks, fetchMore: fetchMoreTracks } = useGroupedTracksQuery({
    variables: { page: { first: 60 } },
    fetchPolicy: 'cache-and-network',
  })
  const collection = useMemo(() => tracksData?.groupedTracks?.nodes || [], [tracksData])
  const collectionHasNext = !!tracksData?.groupedTracks?.pageInfo?.hasNextPage
  // Footer-reach pagination for the Collection rail — loads the next page as you scroll
  // toward the footer so the right rail extends down alongside the feed (desktop look).
  const loadingMoreCollectionRef = useRef(false)
  const collectionFooterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = collectionFooterRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && collectionHasNext && !tracksLoading && !loadingMoreCollectionRef.current) {
        loadingMoreCollectionRef.current = true
        Promise.resolve(fetchMoreTracks()).finally(() => { loadingMoreCollectionRef.current = false })
      }
    }, { rootMargin: '800px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [collectionHasNext, tracksLoading, fetchMoreTracks])

  useEffect(() => {
    fetchStatus()
    fetchAnalytics()
    const iv = setInterval(fetchStatus, 15000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus, fetchAnalytics, me?.profile?.id])

  // Auto-ping on mount
  useEffect(() => { pingAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onlineCount = nodes.filter(n => n.status === 'online').length

  // MET — Mission Elapsed Time since SoundChain genesis (Jul 14 2021), shown
  // on the cupola glass. Client-only state (null on SSR → no hydration drift).
  const [met, setMet] = useState<string | null>(null)
  useEffect(() => {
    const genesis = Date.UTC(2021, 6, 14)
    const tick = () => {
      const s = Math.floor((Date.now() - genesis) / 1000)
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      setMet(`T+${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* SoundChain Starship: the flight-deck cockpit hull around the live
          dashboard (console strips, Falcon-flicker LEDs, deck floor rail). */}
      <FlightDeck />
      <DexNavBar />

      {/* Lower nav pills — matches dex page nav so users aren't stuck */}
      <MainPillNav active="nodes" />

{/* 1380px column so the FlightDeck console racks own the dead space ≥1540px */}
<div className={`mx-auto pt-1 pb-4 space-y-2 ${mobileTab === 'feed' ? 'px-0 max-w-[680px] lg:max-w-[1380px] lg:px-4' : 'px-4 max-w-[1380px]'}`}>
        {/* Mobile tab toggle retired — feed is the default mobile landing.
            Network lives in the avatar-menu dropdown on mobile (?tab=network deeplink). */}

        {/* CUPOLA — the flight deck's window strip: structural ribs, stars,
            Mission Elapsed Time etched on the glass. Pure CSS + 1s clock. */}
        <div className="sc-cupola h-14 sm:h-20 flex items-center justify-between px-4 sm:px-6">
          {[[7, 28, '2.8s', '0s'], [16, 62, '4.1s', '1.2s'], [27, 40, '3.2s', '0.6s'], [38, 70, '2.4s', '1.8s'], [47, 25, '3.7s', '0.3s'], [58, 55, '2.1s', '1.5s'], [69, 35, '4.4s', '0.9s'], [78, 65, '2.9s', '2.1s'], [88, 30, '3.5s', '0.4s'], [93, 58, '2.6s', '1.1s']].map(([l, t, d, dl], i) => (
            <b key={i} style={{ left: `${l}%`, top: `${t}%`, ['--d' as string]: d, ['--dl' as string]: dl }} />
          ))}
          <div className="sc-rib" style={{ left: '30%' }} />
          <div className="sc-rib" style={{ left: '55%' }} />
          <div className="sc-rib" style={{ left: '80%' }} />
          <div className="relative z-10 flex flex-col gap-0.5">
            <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.35em] text-white/35 uppercase">SoundChain Mesh · Exterior View</span>
            <span className="hidden sm:block text-[8px] font-mono tracking-[0.3em] text-white/20 uppercase">Belt Density Nominal · Tracks Pinned {analytics?.totalTracks?.toLocaleString() || '…'}</span>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-0.5">
            <span className="hidden sm:block sc-readout text-[9px] text-[#39ff7a]/70">{met ? `EPOCH ${new Date().toISOString().slice(0, 10)}` : ''}</span>
            <span className="sc-readout text-[9px] sm:text-[11px] text-[#39ff7a]">{met ? `MET ${met}` : ''}</span>
          </div>
        </div>

        {/* Top stats row */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 ${mobileTab === 'feed' ? 'hidden lg:grid' : ''}`}>
          <StatBox icon={<Signal className="w-4 h-4 text-green-400" />} label="NODES" value={`${onlineCount}/${nodes.length}`} color="green" />
          <StatBox icon={<Database className="w-4 h-4 text-cyan-400" />} label="IPFS PINS" value={stats?.ipfs?.pins?.toLocaleString() || '...'} color="cyan" />
          <StatBox icon={<Activity className="w-4 h-4 text-purple-400" />} label="RELAYS" value={stats?.nostr?.relays?.toString() || '...'} color="purple" />
          <StatBox icon={<Zap className="w-4 h-4 text-yellow-400" />} label="LATENCY" value={stats?.ipfs?.latency ? `${stats.ipfs.latency}ms` : '...'} color="yellow" />
          <StatBox icon={<HardDrive className="w-4 h-4 text-blue-400" />} label="TRACKS" value={analytics?.totalTracks?.toLocaleString() || '...'} color="blue" />
          <StatBox icon={<Shield className="w-4 h-4 text-pink-400" />} label="PROTOCOL" value="DTLS 1.2" color="pink" />
        </div>

        {/* ─── Split Layout: Network (left sidebar) + Feed (main) on desktop ─── */}
        {/* Desktop = 3-col (Network | centered Feed | Collection) via flex order; mobile = tabbed stack */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* LEFT RAIL: Network dashboard */}
        <div className={`${mobileTab === 'feed' ? 'hidden lg:block' : ''} lg:order-1 lg:w-[300px] lg:flex-shrink-0 min-w-0 space-y-4`}>

        {/* ANNUNCIATOR MATRIX — Apollo-style caution/warning lamps WIRED to the
            real node + protocol state (green nominal · amber blink degraded ·
            red offline). Same data, presented as the flight-deck spec demands. */}
        <div className="sc-mfd p-3">
          <h2 className="text-[9px] font-mono font-bold text-gray-500 tracking-[0.25em] mb-2">CAUTION / WARNING</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { lab: 'IPFS', ok: stats?.ipfs?.status === 'online', known: !!stats },
              { lab: 'RELAY', ok: (stats?.nostr?.relays || 0) > 0, known: !!stats },
              { lab: 'TURN', ok: !!stats?.webrtc?.available, known: !!stats },
              { lab: 'ATLAS', ok: nodes.find(n => n.id === 'atlas-1')?.status === 'online', known: true },
              { lab: 'EDGE', ok: nodes.find(n => n.id === 'vercel-1')?.status === 'online', known: true },
              { lab: 'ANVIL', ok: nodes.find(n => n.id === 'anvil-1')?.status === 'online', known: true },
              { lab: 'CHAIN', ok: nodes.find(n => n.id === 'polygon-1')?.status === 'online', known: true },
              { lab: 'MESH', ok: onlineCount === nodes.length, known: true },
            ].map(l => (
              <span key={l.lab}
                className={`text-[6.5px] font-mono tracking-[0.1em] text-center py-1.5 rounded-sm border border-black ${!l.known ? 'text-gray-600 bg-[#0c1016]' : ''}`}
                style={l.known ? {
                  background: '#0c1016',
                  color: l.ok ? '#39ff7a' : '#ffb000',
                  textShadow: `0 0 5px ${l.ok ? '#39ff7a' : '#ffb000'}`,
                  animation: l.ok ? undefined : 'scLedB 1.2s steps(1) infinite',
                } : undefined}
              >{l.lab}</span>
            ))}
          </div>
        </div>

        {/* Node swarm grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono font-bold text-gray-400 tracking-wider">SWARM NODES · BREAKERS</h2>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-[9px] font-mono text-gray-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              {/* SYS CHECK — re-ping every node (pingAll existed but had no button) */}
              <button
                onClick={pingAll}
                disabled={pinging}
                className="px-2 py-0.5 rounded border border-[#39ff7a]/30 text-[8px] font-mono text-[#39ff7a]/80 hover:text-[#39ff7a] hover:border-[#39ff7a]/60 transition disabled:opacity-40"
              >
                <RefreshCw className={`w-2.5 h-2.5 inline mr-1 ${pinging ? 'animate-spin' : ''}`} />SYS CHECK
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {nodes.map(node => {
              const colorClass = TYPE_COLORS[node.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'
              const Icon = TYPE_ICONS[node.type] || Server
              return (
                <div key={node.id} className={`sc-mfd p-3 transition-all hover:brightness-125 ${
                  node.status === 'online' ? '' : node.status === 'degraded' ? '!border-yellow-500/30' : '!border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {/* breaker lever — up = online, down = degraded/offline */}
                    <span className="sc-breaker" style={{ ['--p' as string]: node.status === 'online' ? '2px' : '12px' }} />
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

        {/* TACTICAL SCOPE — phosphor radar: every swarm node is a live blip
            (deterministic polar position per id, color by type, degraded ones
            flicker). Rotating sweep is pure CSS. Reads the same `nodes` state. */}
        <div className="sc-mfd p-3">
          <h2 className="text-[9px] font-mono font-bold text-gray-500 tracking-[0.25em] mb-2">TACTICAL SCOPE</h2>
          <div className="sc-scope max-w-[230px] mx-auto">
            {nodes.map(node => {
              let h = 0
              for (let i = 0; i < node.id.length; i++) h = (Math.imul(h, 31) + node.id.charCodeAt(i)) >>> 0
              const ang = (h % 360) * (Math.PI / 180)
              const rad = 16 + ((h >>> 3) % 30) // % of radius from center
              const x = 50 + Math.cos(ang) * rad
              const y = 50 + Math.sin(ang) * rad
              const BLIP: Record<string, string> = { IPFS: '#3fd9ff', Nostr: '#a07bff', WebRTC: '#39ff7a', Database: '#ffb000', Edge: '#4db8ff', Anvil: '#ff8a3d', Chain: '#ff3d9a' }
              return (
                <i key={node.id} className={node.status !== 'online' ? 'deg' : undefined}
                  title={node.label}
                  style={{ left: `${x}%`, top: `${y}%`, ['--bc' as string]: node.status === 'offline' ? '#ff3b30' : BLIP[node.type] || '#39ff7a' }} />
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[7px] font-mono text-gray-600 tracking-[0.2em]">
            <span>SWEEP 5.0s</span><span>{onlineCount}/{nodes.length} CONTACTS</span><span>RNG 50px</span>
          </div>
        </div>

        {/* Protocol details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* IPFS Details */}
          <div className="sc-mfd p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-400">MFD-1 · IPFS / PINATA</span>
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
          <div className="sc-mfd p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold text-purple-400">MFD-2 · NOSTR RELAYS</span>
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
          <div className="sc-mfd p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-xs font-mono font-bold text-green-400">MFD-3 · WebRTC P2P</span>
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
          <div className="sc-mfd p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-mono font-bold text-pink-400">MFD-4 · POLYGON CHAIN</span>
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

        </div>{/* end LEFT RAIL: Network dashboard */}

        {/* RIGHT RAIL: Collection — tracks/NFTs/SCIDs; extends down + paginates to the footer on desktop */}
        <div className={`${mobileTab === 'feed' ? 'hidden lg:block' : ''} lg:order-3 lg:w-[340px] lg:flex-shrink-0 min-w-0`}>
        {/* ─── Network Collection — NFTs/SCids on IPFS ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider">CARGO MANIFEST</h2>
              <span className="text-[8px] font-mono text-gray-600">{collection.length} objects in hold · IPFS</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCollectionView('cards')} className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${collectionView === 'cards' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}>CARDS</button>
              <button onClick={() => setCollectionView('table')} className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${collectionView === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}>TABLE</button>
              <button onClick={() => refetchTracks()} className="px-2 py-0.5 rounded text-[8px] font-mono text-gray-600 hover:text-cyan-400 transition">
                <RefreshCw className={`w-3 h-3 inline ${tracksLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {collectionView === 'cards' ? (
            /* Mini card grid — like wallet page NFT cards */
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
              {collection.length === 0 && !tracksLoading && (
                <div className="col-span-full text-center py-8 text-[10px] font-mono text-gray-700">No tracks found — upload via Operator or SCID</div>
              )}
              {tracksLoading && collection.length === 0 && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
              {collection.map((track: any, i: number) => (
                <div key={track.id || i} className="group relative rounded-lg overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer bg-black/40 hover:bg-black/60"
                  onClick={() => window.open(`/dex/track/${track.id}`, '_blank', 'noopener')}
                >
                  <div className="aspect-square bg-gradient-to-br from-cyan-900/30 to-purple-900/30 relative">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-6 h-6 text-gray-700" />
                      </div>
                    )}
                    {/* Edition fraction badge — degens know what 1/10 means */}
                    {track.editionSize > 1 && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 border border-purple-500/30 backdrop-blur-sm">
                        <span className="text-[7px] font-mono font-bold text-purple-300">1/{track.editionSize}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[8px] font-mono text-white truncate font-bold">{track.title || 'Untitled'}</p>
                    <p className="text-[7px] font-mono text-gray-600 truncate">{track.artist || 'Unknown'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {track.nftData?.tokenId ? <span className="text-[6px] font-mono text-purple-400 px-1 py-0 rounded bg-purple-500/10">NFT</span> : <span className="text-[6px] font-mono text-cyan-400 px-1 py-0 rounded bg-cyan-500/10">SCid</span>}
                      {track.nftData?.ipfsCid && <span className="text-[6px] font-mono text-cyan-400 px-1 py-0 rounded bg-cyan-500/10">IPFS</span>}
                      {track.playbackCount > 0 && <span className="text-[6px] font-mono text-gray-600">{track.playbackCount}x</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Blur-style data table */
            <div className="sc-mfd overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-0 px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
                <span className="col-span-1 text-[7px] font-mono text-gray-600">#</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600">ART</span>
                <span className="col-span-3 text-[7px] font-mono text-gray-600">TITLE</span>
                <span className="col-span-2 text-[7px] font-mono text-gray-600">ARTIST</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">SUPPLY</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">PLAYS</span>
                <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">TYPE</span>
                <span className="col-span-2 text-[7px] font-mono text-gray-600 text-right">CID / PIN</span>
              </div>
              {/* Rows */}
              <div className="max-h-[400px] overflow-y-auto lg:max-h-none lg:overflow-visible">
                {collection.length === 0 && !tracksLoading && (
                  <div className="text-center py-6 text-[10px] font-mono text-gray-700">No data — upload tracks to populate</div>
                )}
                {tracksLoading && collection.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-white/[0.01] animate-pulse border-b border-white/[0.02]" />
                ))}
                {collection.map((track: any, i: number) => {
                  const cid = track.nftData?.ipfsCid || track.playbackUrl?.split('/ipfs/')?.[1]?.split('?')?.[0] || ''
                  const shortCid = cid ? `${cid.slice(0, 6)}...${cid.slice(-4)}` : '—'
                  const isNFT = !!track.nftData?.tokenId
                  const edSize = track.editionSize || 1
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
                      <span className="col-span-1 text-[8px] font-mono text-right">
                        {edSize > 1 ? (
                          <span className="text-purple-400">1/{edSize}</span>
                        ) : (
                          <span className="text-gray-600">1/1</span>
                        )}
                      </span>
                      <span className="col-span-1 text-[8px] font-mono text-gray-400 text-right">{track.playbackCount || 0}</span>
                      <span className="col-span-1 text-right">
                        {isNFT ? (
                          <span className="text-[7px] font-mono text-purple-400 px-1 rounded bg-purple-500/10">NFT</span>
                        ) : (
                          <span className="text-[7px] font-mono text-cyan-400 px-1 rounded bg-cyan-500/10">SCid</span>
                        )}
                      </span>
                      <span className="col-span-2 text-right flex items-center justify-end gap-1">
                        <span className="text-[7px] font-mono text-cyan-500/60 truncate" title={cid}>{shortCid}</span>
                        {cid ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="PINNED" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-700 flex-shrink-0" />}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

          {collectionHasNext && (
            <div ref={collectionFooterRef} className="w-full py-3 text-center text-[8px] font-mono text-gray-700">loading more…</div>
          )}
        </div>{/* end RIGHT RAIL: Collection */}

        {/* CENTER: Feed — centered between the rails on desktop */}
        <div className={`${mobileTab === 'network' ? 'hidden lg:block' : 'w-full'} lg:order-2 flex-1 min-w-0 lg:max-w-[640px] lg:mx-auto`}>
          <div className="space-y-1.5">
            {/* FEED label — tight under MainPillNav, sits directly above Stories/Reels */}
            <div className="flex items-center gap-2 px-3 sm:px-0">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider">COMMS · TRANSMISSION LOG</h2>
              <span className="text-[8px] font-mono text-gray-600">{feedNodes.length} transmissions</span>
            </div>

            {/* 24hr Stories/Reels — matches dex schema feed */}
            <StoriesBar />

            {/* Composer gate relaxed from me?.profile → me. Some half-baked
                signups (Magic bypass path pre-May 17 hotfix) end up with a
                user row but no profile doc; the inner PostFormTimeline
                handles missing-profile gracefully and /api/me auto-creates
                a minimal profile on first visit. */}
            {/* Compose + view-toggle row — composer on left, grid/list pills on far right */}
            <div className="mb-2 flex items-center gap-2">
              {me ? (
                <button
                  onClick={() => setComposerOpen(o => !o)}
                  className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border border-white/5 bg-black/40 hover:bg-black/60 transition"
                  aria-expanded={composerOpen}
                >
                  <span className="flex items-center gap-2">
                    <PenLine className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">TRANSMIT TO THE MESH</span>
                  </span>
                  {composerOpen
                    ? <ChevronDown className="w-4 h-4 text-gray-500" />
                    : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex items-center flex-shrink-0 rounded-lg border border-white/5 bg-black/40 p-0.5">
                <button
                  onClick={() => setFeedViewMode('list')}
                  aria-label="List view"
                  aria-pressed={feedViewMode === 'list'}
                  className={`p-1.5 rounded-md transition-all ${feedViewMode === 'list' ? 'text-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFeedViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={feedViewMode === 'grid'}
                  className={`p-1.5 rounded-md transition-all ${feedViewMode === 'grid' ? 'text-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
            {me && composerOpen && (
              <div className="mb-2">
                <PostFormTimeline onPosted={() => { loadFeed(null); setComposerOpen(false) }} />
              </div>
            )}

            <div className={feedViewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2'
              : 'space-y-2'}>
              {feedLoading && feedNodes.length === 0 && (
                feedViewMode === 'grid' ? (
                  <>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-[3/4] bg-neutral-900 border border-white/5 rounded-lg animate-pulse" />
                    ))}
                  </>
                ) : (
                  <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                  </>
                )
              )}
              {!feedLoading && feedNodes.length === 0 && (
                <div className={`text-center py-8 text-[10px] font-mono text-gray-700 ${feedViewMode === 'grid' ? 'col-span-full' : ''}`}>
                  {me?.profile?.id ? 'No posts yet — follow users to fill your feed' : 'Sign in to see your feed'}
                </div>
              )}
              {feedNodes
                .filter((fi: any) => fi?.post?.id && fi?.post?.profile)
                .map((feedItem: any) => (
                  <PostErrorBoundary key={feedItem.post.id} postId={feedItem.post.id}>
                    {feedViewMode === 'grid' ? (
                      <CompactPost
                        post={feedItem.post}
                        handleOnPlayClicked={handleFeedPlayClicked}
                      />
                    ) : (
                      <Post
                        post={feedItem.post}
                        handleOnPlayClicked={handleFeedPlayClicked}
                      />
                    )}
                  </PostErrorBoundary>
                ))}
              {/* Auto-load sentinel — pulls the next page in before you hit the bottom */}
              {feedPageInfo?.hasNextPage && (
                <div ref={feedFooterRef} className={feedViewMode === 'grid' ? 'col-span-full h-px' : 'h-px'} />
              )}
              {/* Load more (fallback) */}
              {feedPageInfo?.hasNextPage && (
                <button
                  onClick={() => feedFetchMore()}
                  className={`py-2 text-[9px] font-mono text-cyan-400/60 hover:text-cyan-400 border border-white/5 rounded-lg hover:border-cyan-500/20 transition ${feedViewMode === 'grid' ? 'col-span-full w-full' : 'w-full'}`}
                >
                  LOAD MORE
                </button>
              )}
            </div>
          </div>
        </div>

        </div>{/* end split layout */}

        {/* Modals — normally mounted in <Layout>, but Nodes bypasses it.
            #modals portal target must exist before these mount or ClientOnlyPortal renders null. */}
        <div id="modals" className="absolute z-20 w-full" />
        <AuthorActionsModal />
        <PostModal />

        {/* Supported protocols banner */}
        <div className="sc-mfd p-3 flex items-center justify-between flex-wrap gap-2">
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

// Segmented-LED instrument readout (flight-deck skin). Same props as the old
// StatBox — explicit color map (the old `border-${color}-500/10` template
// string was a Tailwind-purge no-op anyway).
const READOUT_COLORS: Record<string, string> = {
  green: '#39ff7a', cyan: '#3fd9ff', purple: '#a07bff',
  yellow: '#ffb000', blue: '#4db8ff', pink: '#ff3d9a',
}
function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const c = READOUT_COLORS[color] || '#39ff7a'
  return (
    <div className="sc-mfd p-3 relative">
      <span className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-white/15" />
      <span className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-white/15" />
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[8px] font-mono text-gray-500 tracking-[0.2em]">{label}</span>
      </div>
      <span className="sc-readout text-sm font-bold" style={{ color: c }}>{value}</span>
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

// Per-post ErrorBoundary so one bad post can't crash /nodes
class PostErrorBoundary extends Component<{ postId: string; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { postId: string; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PostErrorBoundary] post', this.props.postId, error, info)
  }
  render() {
    // Silently skip broken posts — no ugly banner between good posts
    if (this.state.hasError) return null
    return this.props.children
  }
}

// Skip default Layout — use our own TopNavBar (matches dex page pattern)
;(NodesPage as any).getLayout = (page: ReactElement) => page
