/**
 * /dex/land — NODEVERSE LAND Atlas
 *
 * 2D top-down map of all 10,000 squares.
 * Color-coded by tier. Owned squares show owner color.
 * Click any square → purchase modal.
 * Filters: by tier, by ownership status.
 *
 * Multi-level support coming: Z-axis (above/underground levels).
 */
import { ReactElement, useEffect, useRef, useState } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
import { ArrowLeft, MapPin, Coins, Lock, Filter, ZoomIn, ZoomOut, Wallet, X } from 'lucide-react'
import { useMagicContext } from 'hooks/useMagicContext'

interface Square {
  x: number
  z: number
  ownerHandle?: string
  ownerColor?: string
  price?: number
  tier?: string
  label?: string
}

const TIER_COLORS = {
  origin: '#facc15',
  inner: '#a855f7',
  mid: '#22d3ee',
  outer: '#666666',
}

const TIER_PRICES = { origin: 1000, inner: 100, mid: 25, outer: 5 }

function getTier(x: number, z: number): keyof typeof TIER_COLORS {
  const dist = Math.sqrt(x * x + z * z)
  if (dist <= 5) return 'origin'
  if (dist <= 20) return 'inner'
  if (dist <= 40) return 'mid'
  return 'outer'
}

export default function LandAtlasPage() {
  const me = useMe()
  const router = useRouter()
  const { account, ogunBalance } = useMagicContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [owned, setOwned] = useState<Square[]>([])
  const [stats, setStats] = useState<{ totalOwned: number; totalRevenue: number } | null>(null)
  const [zoom, setZoom] = useState(8)  // pixels per square
  const [pan, setPan] = useState({ x: 0, z: 0 })
  const [hoveredSq, setHoveredSq] = useState<{ x: number; z: number; tier: string; price: number; owner?: Square } | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<{ x: number; z: number; tier: string; price: number } | null>(null)
  const [tierFilter, setTierFilter] = useState<string>('')
  const [purchasing, setPurchasing] = useState(false)

  const fetchLand = () => {
    fetch('/api/nodeverse/squares')
      .then(r => r.json())
      .then(data => {
        setOwned(data.squares || [])
        setStats(data.stats || null)
      })
      .catch(() => {})
  }
  useEffect(fetchLand, [])

  // Render the atlas to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    canvas.width = W * window.devicePixelRatio
    canvas.height = H * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Background
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, W, H)

    const cx = W / 2 + pan.x
    const cy = H / 2 + pan.z
    const ownedMap = new Map<string, Square>()
    owned.forEach(s => ownedMap.set(`${s.x},${s.z}`, s))

    // Draw all squares within visible range
    const visibleRange = Math.ceil(Math.max(W, H) / zoom / 2) + 2
    for (let x = -50; x <= 50; x++) {
      for (let z = -50; z <= 50; z++) {
        const px = cx + x * zoom
        const py = cy + z * zoom
        if (px < -zoom || px > W + zoom || py < -zoom || py > H + zoom) continue

        const tier = getTier(x, z)
        if (tierFilter && tier !== tierFilter) continue

        const ownedSq = ownedMap.get(`${x},${z}`)

        // Tile fill
        if (ownedSq) {
          ctx.fillStyle = ownedSq.ownerColor || '#22d3ee'
          ctx.globalAlpha = 0.7
        } else {
          ctx.fillStyle = TIER_COLORS[tier]
          ctx.globalAlpha = tier === 'origin' ? 0.25 : tier === 'inner' ? 0.15 : tier === 'mid' ? 0.1 : 0.06
        }
        ctx.fillRect(px - zoom / 2 + 0.5, py - zoom / 2 + 0.5, zoom - 1, zoom - 1)

        // Border for owned
        if (ownedSq && zoom >= 6) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = ownedSq.ownerColor || '#22d3ee'
          ctx.lineWidth = 1
          ctx.strokeRect(px - zoom / 2 + 0.5, py - zoom / 2 + 0.5, zoom - 1, zoom - 1)
        }
      }
    }

    // Origin marker (0,0)
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, zoom / 2, 0, Math.PI * 2)
    ctx.stroke()

    // Tier ring guides
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = '#facc15'
    ctx.beginPath(); ctx.arc(cx, cy, 5 * zoom, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = '#a855f7'
    ctx.beginPath(); ctx.arc(cx, cy, 20 * zoom, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = '#22d3ee'
    ctx.beginPath(); ctx.arc(cx, cy, 40 * zoom, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1
  }, [owned, zoom, pan, tierFilter])

  // Mouse interaction
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2 + pan.x
    const cy = rect.height / 2 + pan.z
    const x = Math.round((e.clientX - rect.left - cx) / zoom)
    const z = Math.round((e.clientY - rect.top - cy) / zoom)
    if (Math.abs(x) > 50 || Math.abs(z) > 50) return
    const ownedSq = owned.find(s => s.x === x && s.z === z)
    if (ownedSq) {
      alert(`OWNED by @${ownedSq.ownerHandle}\nPrice paid: ${ownedSq.price} OGUN\nTier: ${ownedSq.tier}`)
    } else {
      const tier = getTier(x, z)
      setPurchaseModal({ x, z, tier, price: TIER_PRICES[tier] })
    }
  }

  const handleMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2 + pan.x
    const cy = rect.height / 2 + pan.z
    const x = Math.round((e.clientX - rect.left - cx) / zoom)
    const z = Math.round((e.clientY - rect.top - cy) / zoom)
    if (Math.abs(x) > 50 || Math.abs(z) > 50) { setHoveredSq(null); return }
    const ownedSq = owned.find(s => s.x === x && s.z === z)
    const tier = getTier(x, z)
    setHoveredSq({ x, z, tier, price: TIER_PRICES[tier], owner: ownedSq })
  }

  const purchase = async () => {
    if (!purchaseModal || !me) return
    setPurchasing(true)
    try {
      const res = await fetch('/api/nodeverse/squares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: purchaseModal.x,
          z: purchaseModal.z,
          ownerHandle: me.handle,
          ownerColor: '#22d3ee',
        }),
      })
      if (res.ok) {
        setPurchaseModal(null)
        fetchLand()
      } else {
        const err = await res.json()
        alert(err.error || 'Purchase failed')
      }
    } finally { setPurchasing(false) }
  }

  return (
    <div className="min-h-screen bg-[#030308] text-white flex flex-col">
      <TopNavBar />

      {/* Lower nav */}
      <div className="border-b border-yellow-500/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
          <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/dex/users/${me.profile.userHandle}` }] : []),
                { id: 'nodes', label: 'Nodes', route: '/dex/nodes' },
                { id: 'explore3d', label: 'Explore 3D', route: '/dex/explore3d' },
                { id: 'land', label: 'Land Atlas', route: '/dex/land' },
                { id: 'gallery3d', label: 'Gallery 3D', route: '/dex/gallery3d' },
                { id: 'arena', label: 'Arena', route: '/dex/arena' },
                { id: 'archive', label: 'Archive', route: '/dex/archive' },
              ].map(item => (
                <button key={item.id} onClick={() => router.push(item.route)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${item.id === 'land' ? 'bg-white/15 text-white border border-white/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-yellow-500/20 bg-black/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dex/explore3d')} className="p-1.5 rounded hover:bg-white/10 transition">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <MapPin className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-sm font-mono font-bold text-yellow-400 tracking-wider">NODEVERSE LAND ATLAS</h1>
              <p className="text-[9px] font-mono text-gray-600">250,000 parcels · 16×16 each · ∞ outer expansion · 0.05% perpetual fee</p>
            </div>
          </div>
          {/* Wallet status */}
          <div className="flex items-center gap-2">
            {account ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-[9px] font-mono text-green-400">
                <Wallet className="w-3 h-3" /> {ogunBalance ? `${Number(ogunBalance).toFixed(2)} OGUN` : '...'}
              </div>
            ) : (
              <div className="px-2 py-1 rounded bg-gray-500/10 border border-gray-500/20 text-[9px] font-mono text-gray-500">Not connected</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: stats + filters */}
        <div className="w-full lg:w-[280px] border-b lg:border-b-0 lg:border-r border-white/5 bg-black/40 p-4 space-y-3">
          {/* Stats */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono text-gray-500 uppercase">Atlas Stats</div>
            {stats && (
              <>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Owned</span>
                  <span className="text-yellow-400">{stats.totalOwned.toLocaleString()} / 250,000</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Available</span>
                  <span className="text-green-400">{(250000 - stats.totalOwned).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-400">OGUN circulated</span>
                  <span className="text-cyan-400">{stats.totalRevenue.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {/* Tier breakdown */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono text-gray-500 uppercase mt-3 flex items-center gap-1"><Filter className="w-3 h-3" /> Filter by Tier</div>
            <div className="space-y-1">
              <button onClick={() => setTierFilter('')} className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono ${tierFilter === '' ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5'}`}>
                All Tiers
              </button>
              {(['origin', 'inner', 'mid', 'outer'] as const).map(t => (
                <button key={t} onClick={() => setTierFilter(t)} className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-mono transition ${tierFilter === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5'}`}>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: TIER_COLORS[t] }} />
                    {t.toUpperCase()}
                  </span>
                  <span className="text-yellow-500">{TIER_PRICES[t]} OGUN</span>
                </button>
              ))}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="space-y-2 mt-3">
            <div className="text-[9px] font-mono text-gray-500 uppercase">Zoom</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(2, z - 2))} className="flex-1 py-1 rounded border border-white/10 text-gray-400 hover:bg-white/5 text-[10px] font-mono"><ZoomOut className="w-3 h-3 inline" /></button>
              <span className="text-[9px] font-mono text-cyan-400 px-2">{zoom}px</span>
              <button onClick={() => setZoom(z => Math.min(20, z + 2))} className="flex-1 py-1 rounded border border-white/10 text-gray-400 hover:bg-white/5 text-[10px] font-mono"><ZoomIn className="w-3 h-3 inline" /></button>
            </div>
            <button onClick={() => { setZoom(8); setPan({ x: 0, z: 0 }) }} className="w-full py-1 rounded border border-white/10 text-gray-400 hover:bg-white/5 text-[9px] font-mono">RESET VIEW</button>
          </div>

          {/* Hover info */}
          {hoveredSq && (
            <div className="space-y-1 mt-3 p-2 rounded bg-cyan-500/5 border border-cyan-500/20">
              <div className="text-[9px] font-mono text-cyan-400">SQUARE ({hoveredSq.x}, {hoveredSq.z})</div>
              <div className="text-[9px] font-mono text-gray-400">Tier: <span style={{ color: TIER_COLORS[hoveredSq.tier as keyof typeof TIER_COLORS] }}>{hoveredSq.tier.toUpperCase()}</span></div>
              <div className="text-[9px] font-mono text-yellow-400 flex items-center gap-1"><Coins className="w-3 h-3" /> {hoveredSq.price} OGUN</div>
              {hoveredSq.owner ? (
                <div className="text-[9px] font-mono text-purple-400">Owned by @{hoveredSq.owner.ownerHandle}</div>
              ) : (
                <div className="text-[9px] font-mono text-green-400">AVAILABLE</div>
              )}
            </div>
          )}

          <div className="text-[8px] font-mono text-gray-600 leading-relaxed pt-3 border-t border-white/5">
            Click any square to claim it. Owned squares show owner color.
            Multi-level (above/underground) coming soon.
          </div>
        </div>

        {/* Right: 2D atlas canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoveredSq(null)}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Compass */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
            ← W · → E · ↑ N · ↓ S
          </div>
        </div>
      </div>

      {/* Purchase modal */}
      {purchaseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setPurchaseModal(null)}>
          <div className="w-full max-w-md bg-[#0a0f1f] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20 bg-black/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">CLAIM SQUARE</span>
              </div>
              <button onClick={() => setPurchaseModal(null)} className="p-1 hover:bg-white/10 rounded text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center py-3">
                <div className="text-[10px] font-mono text-gray-500 mb-1">COORDINATES</div>
                <div className="text-2xl font-mono font-bold text-cyan-400">({purchaseModal.x}, {purchaseModal.z})</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded border border-white/5 bg-black/40">
                  <div className="text-[8px] font-mono text-gray-600 uppercase">Tier</div>
                  <div className="text-sm font-mono font-bold" style={{ color: TIER_COLORS[purchaseModal.tier as keyof typeof TIER_COLORS] }}>{purchaseModal.tier.toUpperCase()}</div>
                </div>
                <div className="p-3 rounded border border-yellow-500/20 bg-yellow-500/5">
                  <div className="text-[8px] font-mono text-gray-600 uppercase">Price</div>
                  <div className="text-sm font-mono font-bold text-yellow-400 flex items-center gap-1"><Coins className="w-3 h-3" /> {purchaseModal.price} OGUN</div>
                </div>
              </div>
              {!account && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-[9px] font-mono text-red-400">
                  ⚠ No wallet connected. Use the Wallet pill in the top nav to connect via WalletConnect — supports MetaMask, Coinbase, Rainbow, Trust, Ledger + 300 more wallets.
                </div>
              )}
              <div className="text-[9px] font-mono text-gray-600 leading-relaxed pt-2 border-t border-white/5">
                Forever yours. Build, host, rent. Platform fee: <span className="text-yellow-500">{Math.ceil(purchaseModal.price * 0.0005)} OGUN (0.05%)</span> to treasury.
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setPurchaseModal(null)} className="flex-1 py-2 rounded text-[10px] font-mono text-gray-400 border border-white/10 hover:bg-white/5">Cancel</button>
                <button onClick={purchase} disabled={purchasing || !me} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition disabled:opacity-50">
                  {purchasing ? 'CLAIMING...' : <><Lock className="w-3 h-3" /> CLAIM FOR {purchaseModal.price} OGUN</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

;(LandAtlasPage as any).getLayout = (page: ReactElement) => page
