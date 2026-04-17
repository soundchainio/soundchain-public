/**
 * /dex/land — NODEVERSE LAND Atlas
 *
 * 2D top-down map of all 250,000 parcels.
 * Two render modes:
 *   GRID MODE  — square grid (Decentraland/Sandbox style)
 *   EARTH MODE — world continents from world-110m TopoJSON, parcels overlaid by lat/lng
 *
 * Color-coded by tier. Owned squares show owner color.
 * Click any square → purchase modal.
 *
 * Multi-level support coming: Z-axis (above/underground levels).
 */
import { ReactElement, useEffect, useRef, useState } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
import { ArrowLeft, MapPin, Coins, Lock, Filter, ZoomIn, ZoomOut, Wallet, X, Globe2, Grid3x3, Search, Plane, Loader2 } from 'lucide-react'
import { useMagicContext } from 'hooks/useMagicContext'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { FAMOUS_LANDMARKS, projectLngLat, unprojectXY, parcelToLngLat, lngLatToParcel } from 'lib/nodeverse/landmarks'

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
  if (dist <= 30) return 'inner'
  if (dist <= 100) return 'mid'
  return 'outer'
}

type ViewMode = 'grid' | 'earth'

export default function LandAtlasPage() {
  const me = useMe()
  const router = useRouter()
  const { account, ogunBalance } = useMagicContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [owned, setOwned] = useState<Square[]>([])
  const [stats, setStats] = useState<{ totalOwned: number; totalRevenue: number } | null>(null)
  const [zoom, setZoom] = useState(8)  // GRID: pixels per square; EARTH: pixels per degree
  const [pan, setPan] = useState({ x: 0, z: 0 })
  const [hoveredSq, setHoveredSq] = useState<{ x: number; z: number; tier: string; price: number; owner?: Square } | null>(null)
  const [hoveredLandmark, setHoveredLandmark] = useState<typeof FAMOUS_LANDMARKS[number] | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<{ x: number; z: number; tier: string; price: number; landmark?: typeof FAMOUS_LANDMARKS[number] } | null>(null)
  const [tierFilter, setTierFilter] = useState<string>('')
  const [purchasing, setPurchasing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [worldGeo, setWorldGeo] = useState<FeatureCollection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [searching, setSearching] = useState(false)
  const [highlightedCountryId, setHighlightedCountryId] = useState<string | null>(null)

  // ─── Geocode search via Nominatim (OpenStreetMap — free, no API key) ───
  const searchLocation = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const q = encodeURIComponent(searchQuery.trim())
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { 'User-Agent': 'SoundChain-Nodeverse/1.0' }, // Nominatim requires a user-agent
      })
      const data = await res.json()
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const latNum = parseFloat(lat)
        const lngNum = parseFloat(lon)
        setSearchResult({ name: display_name, lat: latNum, lng: lngNum })
        // Pan + zoom to the location
        const targetZoom = 8
        setZoom(targetZoom)
        setPan({ x: -lngNum * targetZoom, z: lngNum > 0 ? latNum * targetZoom : latNum * targetZoom })
        // Auto-switch to Earth mode if not already
        if (viewMode !== 'earth') setViewMode('earth')
      } else {
        setSearchResult(null)
        alert('Location not found — try a different query')
      }
    } catch {
      alert('Search failed — check your connection')
    } finally {
      setSearching(false)
    }
  }

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

  // Load world TopoJSON once Earth Mode is engaged (lazy — saves bandwidth)
  useEffect(() => {
    if (viewMode !== 'earth' || worldGeo) return
    fetch('/world-110m.json')
      .then(r => r.json())
      .then((topology: Topology) => {
        const countries = topology.objects.countries as GeometryCollection
        const fc = feature(topology, countries) as FeatureCollection
        setWorldGeo(fc)
      })
      .catch(() => {})
  }, [viewMode, worldGeo])

  // Reset zoom + pan when toggling modes (different scales)
  useEffect(() => {
    if (viewMode === 'earth') { setZoom(3); setPan({ x: 0, z: 0 }) }
    else { setZoom(8); setPan({ x: 0, z: 0 }) }
  }, [viewMode])

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

    // ─── Background ────────────────────────────────────────
    if (viewMode === 'earth') {
      // Ocean blue background
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#020617')
      grad.addColorStop(0.5, '#0a1530')
      grad.addColorStop(1, '#020617')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.fillStyle = '#030308'
      ctx.fillRect(0, 0, W, H)
    }

    const cx = W / 2 + pan.x
    const cy = H / 2 + pan.z
    const ownedMap = new Map<string, Square>()
    owned.forEach(s => ownedMap.set(`${s.x},${s.z}`, s))

    if (viewMode === 'earth') {
      // ─── EARTH MODE ───────────────────────────────────────
      // Draw equator + prime meridian (faint)
      ctx.globalAlpha = 0.15
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 0.5
      // Equator
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(W, cy)
      ctx.stroke()
      // Prime meridian
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, H)
      ctx.stroke()

      // Draw graticule (every 30°)
      ctx.globalAlpha = 0.07
      for (let lng = -180; lng <= 180; lng += 30) {
        const x = cx + lng * zoom
        if (x < 0 || x > W) continue
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let lat = -85; lat <= 85; lat += 30) {
        const y = cy - lat * zoom
        if (y < 0 || y > H) continue
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Draw continents
      if (worldGeo) {
        ctx.globalAlpha = 1
        worldGeo.features.forEach((f: Feature<Geometry>) => {
          ctx.beginPath()
          drawGeometry(ctx, f.geometry, zoom, cx, cy)
          ctx.fillStyle = '#1e3a5f'
          ctx.fill()
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = 0.5
          ctx.globalAlpha = 0.5
          ctx.stroke()
          ctx.globalAlpha = 1
        })
      } else {
        // Loading
        ctx.globalAlpha = 0.5
        ctx.fillStyle = '#22d3ee'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Loading world geometry...', W / 2, H / 2)
      }

      // Owned parcels — projected onto map
      owned.forEach(sq => {
        const { lng, lat } = parcelToLngLat(sq.x, sq.z)
        const { x, y } = projectLngLat(lng, lat, zoom, cx, cy)
        if (x < 0 || x > W || y < 0 || y > H) return
        ctx.globalAlpha = 0.85
        ctx.fillStyle = sq.ownerColor || '#22d3ee'
        ctx.beginPath()
        ctx.arc(x, y, Math.max(2, zoom / 4), 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Famous landmarks (Tier S premium pins)
      FAMOUS_LANDMARKS.forEach(lm => {
        const { x, y } = projectLngLat(lm.lng, lm.lat, zoom, cx, cy)
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) return
        const isHov = hoveredLandmark?.name === lm.name
        // Glow ring
        ctx.globalAlpha = isHov ? 0.6 : 0.3
        ctx.fillStyle = '#facc15'
        ctx.beginPath()
        ctx.arc(x, y, isHov ? 12 : 8, 0, Math.PI * 2)
        ctx.fill()
        // Inner pin
        ctx.globalAlpha = 1
        ctx.fillStyle = '#facc15'
        ctx.beginPath()
        ctx.arc(x, y, isHov ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.stroke()
        // Emoji label when zoomed in enough
        if (zoom >= 5) {
          ctx.font = `${Math.min(16, zoom * 1.2)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(lm.emoji, x, y - 10)
        }
      })

      // Search result pin (pulsing red beacon)
      if (searchResult) {
        const { x: sx, y: sy } = projectLngLat(searchResult.lng, searchResult.lat, zoom, cx, cy)
        if (sx > -20 && sx < W + 20 && sy > -20 && sy < H + 20) {
          // Pulsing outer ring
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300)
          ctx.globalAlpha = 0.3 + pulse * 0.4
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(sx, sy, 16 + pulse * 6, 0, Math.PI * 2)
          ctx.fill()
          // Inner pin
          ctx.globalAlpha = 1
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(sx, sy, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
          // Label
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'center'
          const label = searchResult.name.split(',')[0] // Show just city name
          ctx.fillText(`✈ ${label}`, sx, sy - 18)
        }
      }

      // Country highlight (when clicked)
      if (highlightedCountryId && worldGeo) {
        const country = worldGeo.features.find((f: any) => f.id === highlightedCountryId)
        if (country) {
          ctx.globalAlpha = 0.3
          ctx.beginPath()
          drawGeometry(ctx, country.geometry, zoom, cx, cy)
          ctx.fillStyle = '#22d3ee'
          ctx.fill()
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.8
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      // Request another frame for search pin animation
      if (searchResult) {
        requestAnimationFrame(() => {
          const canvas2 = canvasRef.current
          if (canvas2) canvas2.dispatchEvent(new Event('redraw'))
        })
      }
      return
    }

    // ─── GRID MODE (original) ─────────────────────────────
    for (let x = -50; x <= 50; x++) {
      for (let z = -50; z <= 50; z++) {
        const px = cx + x * zoom
        const py = cy + z * zoom
        if (px < -zoom || px > W + zoom || py < -zoom || py > H + zoom) continue

        const tier = getTier(x, z)
        if (tierFilter && tier !== tierFilter) continue

        const ownedSq = ownedMap.get(`${x},${z}`)

        if (ownedSq) {
          ctx.fillStyle = ownedSq.ownerColor || '#22d3ee'
          ctx.globalAlpha = 0.7
        } else {
          ctx.fillStyle = TIER_COLORS[tier]
          ctx.globalAlpha = tier === 'origin' ? 0.25 : tier === 'inner' ? 0.15 : tier === 'mid' ? 0.1 : 0.06
        }
        ctx.fillRect(px - zoom / 2 + 0.5, py - zoom / 2 + 0.5, zoom - 1, zoom - 1)

        if (ownedSq && zoom >= 6) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = ownedSq.ownerColor || '#22d3ee'
          ctx.lineWidth = 1
          ctx.strokeRect(px - zoom / 2 + 0.5, py - zoom / 2 + 0.5, zoom - 1, zoom - 1)
        }
      }
    }

    // Origin marker
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, zoom / 2, 0, Math.PI * 2)
    ctx.stroke()

    // Tier ring guides (squares to match grid style)
    ctx.globalAlpha = 0.3
    const drawSquare = (color: string, r: number) => {
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.rect(cx - r * zoom, cy - r * zoom, r * zoom * 2, r * zoom * 2)
      ctx.stroke()
    }
    drawSquare('#facc15', 5)
    drawSquare('#a855f7', 30)
    drawSquare('#22d3ee', 100)
    ctx.globalAlpha = 1
  }, [owned, zoom, pan, tierFilter, viewMode, worldGeo, hoveredLandmark, searchResult, highlightedCountryId])

  // Mouse interaction
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2 + pan.x
    const cy = rect.height / 2 + pan.z
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (viewMode === 'earth') {
      // Check landmark hit first (biggest target)
      const hitLandmark = FAMOUS_LANDMARKS.find(lm => {
        const { x, y } = projectLngLat(lm.lng, lm.lat, zoom, cx, cy)
        return Math.hypot(x - mx, y - my) < 12
      })
      if (hitLandmark) {
        const { x: parcelX, z: parcelZ } = lngLatToParcel(hitLandmark.lng, hitLandmark.lat)
        setPurchaseModal({ x: parcelX, z: parcelZ, tier: 'landmark', price: hitLandmark.price, landmark: hitLandmark })
        return
      }
      // Check country hit (point-in-polygon via canvas isPointInPath)
      if (worldGeo) {
        const hitCountry = worldGeo.features.find((f: any) => {
          const testCanvas = document.createElement('canvas')
          const testCtx = testCanvas.getContext('2d')!
          testCtx.beginPath()
          drawGeometry(testCtx, f.geometry, zoom, cx, cy)
          return testCtx.isPointInPath(mx, my)
        })
        if (hitCountry) {
          const countryId = (hitCountry as any).id
          // Toggle highlight — click again to deselect
          setHighlightedCountryId(prev => prev === countryId ? null : countryId)
        }
      }

      // Convert pixel → lat/lng → parcel x/z
      const { lng, lat } = unprojectXY(mx, my, zoom, cx, cy)
      if (Math.abs(lng) > 180 || Math.abs(lat) > 85) return
      const { x, z } = lngLatToParcel(lng, lat)
      const ownedSq = owned.find(s => s.x === x && s.z === z)
      if (ownedSq) {
        alert(`OWNED by @${ownedSq.ownerHandle}\nPrice paid: ${ownedSq.price} OGUN\nTier: ${ownedSq.tier}\nLocation: ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`)
      } else {
        const tier = getTier(x, z)
        setPurchaseModal({ x, z, tier, price: TIER_PRICES[tier] })
      }
      return
    }

    // GRID MODE
    const x = Math.round((mx - cx) / zoom)
    const z = Math.round((my - cy) / zoom)
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
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (viewMode === 'earth') {
      // Hover-detect landmarks
      const hit = FAMOUS_LANDMARKS.find(lm => {
        const { x, y } = projectLngLat(lm.lng, lm.lat, zoom, cx, cy)
        return Math.hypot(x - mx, y - my) < 12
      })
      setHoveredLandmark(hit || null)
      // Track parcel under cursor
      const { lng, lat } = unprojectXY(mx, my, zoom, cx, cy)
      if (Math.abs(lng) > 180 || Math.abs(lat) > 85) { setHoveredSq(null); return }
      const { x, z } = lngLatToParcel(lng, lat)
      const ownedSq = owned.find(s => s.x === x && s.z === z)
      const tier = getTier(x, z)
      setHoveredSq({ x, z, tier, price: TIER_PRICES[tier], owner: ownedSq })
      return
    }

    const x = Math.round((mx - cx) / zoom)
    const z = Math.round((my - cy) / zoom)
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
          label: purchaseModal.landmark ? `${purchaseModal.landmark.emoji} ${purchaseModal.landmark.name}` : null,
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
          {/* Mode + wallet */}
          <div className="flex items-center gap-2">
            {/* GRID / EARTH toggle */}
            <div className="flex items-center bg-black/60 border border-white/10 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono transition ${viewMode === 'grid' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-white'}`}
              >
                <Grid3x3 className="w-3 h-3" /> GRID
              </button>
              <button
                onClick={() => setViewMode('earth')}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono transition ${viewMode === 'earth' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
              >
                <Globe2 className="w-3 h-3" /> EARTH
              </button>
            </div>
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

          {/* Earth-mode search + travel */}
          {viewMode === 'earth' && (
            <div className="space-y-2">
              <div className="text-[9px] font-mono text-gray-500 uppercase mt-3 flex items-center gap-1">
                <Search className="w-3 h-3" /> FLY TO LOCATION
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchLocation()}
                  placeholder="San Jose, California..."
                  className="flex-1 bg-black/60 border border-white/10 rounded px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={searchLocation}
                  disabled={searching}
                  className="p-1.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plane className="w-3.5 h-3.5" />}
                </button>
              </div>
              {searchResult && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 space-y-1">
                  <div className="text-[9px] font-mono text-red-400 flex items-center gap-1">
                    <span>✈</span> ARRIVED
                  </div>
                  <div className="text-[10px] font-mono text-white leading-tight">{searchResult.name.split(',').slice(0, 2).join(',')}</div>
                  <div className="text-[8px] font-mono text-gray-500">{searchResult.lat.toFixed(4)}°, {searchResult.lng.toFixed(4)}°</div>
                  <div className="text-[8px] font-mono text-gray-600">
                    Parcel: ({lngLatToParcel(searchResult.lng, searchResult.lat).x}, {lngLatToParcel(searchResult.lng, searchResult.lat).z})
                  </div>
                  <button
                    onClick={() => setSearchResult(null)}
                    className="text-[8px] font-mono text-gray-500 hover:text-white underline"
                  >
                    clear pin
                  </button>
                </div>
              )}
              <div className="text-[8px] font-mono text-gray-600">
                Powered by OpenStreetMap Nominatim · free · no API key
              </div>
            </div>
          )}

          {/* Earth-mode landmarks list */}
          {viewMode === 'earth' && (
            <div className="space-y-2">
              <div className="text-[9px] font-mono text-gray-500 uppercase mt-3 flex items-center gap-1">
                <span>🌟</span> Landmarks · Tier S
              </div>
              <div className="text-[8px] font-mono text-gray-600">
                {FAMOUS_LANDMARKS.length} premium pre-marked spots @ 5000 OGUN each
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {FAMOUS_LANDMARKS.slice(0, 8).map(lm => (
                  <button
                    key={lm.name}
                    onClick={() => {
                      // Pan to landmark + zoom in
                      const canvas = canvasRef.current
                      if (!canvas) return
                      const W = canvas.clientWidth
                      const H = canvas.clientHeight
                      // Center the landmark
                      setPan({ x: -lm.lng * zoom, z: lm.lat * zoom })
                      setHoveredLandmark(lm)
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-[9px] font-mono text-gray-400 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>{lm.emoji} {lm.name}</span>
                    <span className="text-yellow-500">{lm.city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tier breakdown — grid mode only */}
          {viewMode === 'grid' && (
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
          )}

          {/* Zoom controls */}
          <div className="space-y-2 mt-3">
            <div className="text-[9px] font-mono text-gray-500 uppercase">Zoom</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(viewMode === 'earth' ? 1 : 2, z - (viewMode === 'earth' ? 1 : 2)))} className="flex-1 py-1 rounded border border-white/10 text-gray-400 hover:bg-white/5 text-[10px] font-mono"><ZoomOut className="w-3 h-3 inline" /></button>
              <span className="text-[9px] font-mono text-cyan-400 px-2">{zoom}{viewMode === 'earth' ? 'px/°' : 'px'}</span>
              <button onClick={() => setZoom(z => Math.min(viewMode === 'earth' ? 20 : 20, z + (viewMode === 'earth' ? 1 : 2)))} className="flex-1 py-1 rounded border border-white/10 text-gray-400 hover:bg-white/5 text-[10px] font-mono"><ZoomIn className="w-3 h-3 inline" /></button>
            </div>
            <button onClick={() => { setZoom(viewMode === 'earth' ? 3 : 8); setPan({ x: 0, z: 0 }) }} className="w-full py-1 rounded border border-white/10 text-gray-400 hover:bg-white/5 text-[9px] font-mono">RESET VIEW</button>
          </div>

          {/* Hover info */}
          {hoveredLandmark && viewMode === 'earth' && (
            <div className="space-y-1 mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
              <div className="text-xs font-mono text-yellow-400 font-bold flex items-center gap-2">
                <span className="text-base">{hoveredLandmark.emoji}</span> {hoveredLandmark.name}
              </div>
              <div className="text-[9px] font-mono text-gray-400">{hoveredLandmark.city}, {hoveredLandmark.country}</div>
              <div className="text-[9px] font-mono text-gray-600">{hoveredLandmark.lat.toFixed(3)}°, {hoveredLandmark.lng.toFixed(3)}°</div>
              <div className="text-[10px] font-mono text-yellow-400 flex items-center gap-1 pt-1 border-t border-yellow-500/20"><Coins className="w-3 h-3" /> {hoveredLandmark.price} OGUN · TIER S</div>
            </div>
          )}
          {hoveredSq && !hoveredLandmark && (
            <div className="space-y-1 mt-3 p-2 rounded bg-cyan-500/5 border border-cyan-500/20">
              <div className="text-[9px] font-mono text-cyan-400">PARCEL ({hoveredSq.x}, {hoveredSq.z})</div>
              {viewMode === 'earth' && (
                <div className="text-[8px] font-mono text-gray-500">
                  {parcelToLngLat(hoveredSq.x, hoveredSq.z).lat.toFixed(2)}°, {parcelToLngLat(hoveredSq.x, hoveredSq.z).lng.toFixed(2)}°
                </div>
              )}
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
            {viewMode === 'earth' ? (
              <>🌍 Earth Mode: parcels mapped to real-world geography. Tap any continent to claim land in that region. Gold pins are landmark Tier S premium parcels.</>
            ) : (
              <>Click any square to claim it. Owned squares show owner color. Multi-level (above/underground) coming soon.</>
            )}
          </div>
        </div>

        {/* Right: 2D atlas canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            onMouseMove={handleMove}
            onMouseLeave={() => { setHoveredSq(null); setHoveredLandmark(null) }}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            style={{ imageRendering: viewMode === 'grid' ? 'pixelated' : 'auto' }}
          />
          {/* Compass */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
            ← W · → E · ↑ N · ↓ S
          </div>
          {/* Earth mode badge */}
          {viewMode === 'earth' && (
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-cyan-500/20 backdrop-blur border border-cyan-500/30 text-[8px] font-mono text-cyan-400">
              🌍 EARTH MODE · Equirectangular projection · {worldGeo ? `${worldGeo.features.length} countries` : 'loading...'}
            </div>
          )}
        </div>
      </div>

      {/* Purchase modal */}
      {purchaseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setPurchaseModal(null)}>
          <div className="w-full max-w-md bg-[#0a0f1f] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20 bg-black/40">
              <div className="flex items-center gap-2">
                {purchaseModal.landmark ? <span className="text-base">{purchaseModal.landmark.emoji}</span> : <MapPin className="w-4 h-4 text-yellow-400" />}
                <span className="text-xs font-mono font-bold text-yellow-400">
                  {purchaseModal.landmark ? `CLAIM ${purchaseModal.landmark.name.toUpperCase()}` : 'CLAIM PARCEL'}
                </span>
              </div>
              <button onClick={() => setPurchaseModal(null)} className="p-1 hover:bg-white/10 rounded text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {purchaseModal.landmark && (
                <div className="text-center py-2 px-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-[10px] font-mono text-yellow-400 mb-1">🌟 PREMIUM LANDMARK</div>
                  <div className="text-xs font-mono text-white">{purchaseModal.landmark.city}, {purchaseModal.landmark.country}</div>
                </div>
              )}
              <div className="text-center py-3">
                <div className="text-[10px] font-mono text-gray-500 mb-1">PARCEL COORDINATES</div>
                <div className="text-2xl font-mono font-bold text-cyan-400">({purchaseModal.x}, {purchaseModal.z})</div>
                {viewMode === 'earth' && (
                  <div className="text-[9px] font-mono text-gray-500 mt-1">
                    {parcelToLngLat(purchaseModal.x, purchaseModal.z).lat.toFixed(3)}°, {parcelToLngLat(purchaseModal.x, purchaseModal.z).lng.toFixed(3)}°
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded border border-white/5 bg-black/40">
                  <div className="text-[8px] font-mono text-gray-600 uppercase">Tier</div>
                  <div className="text-sm font-mono font-bold" style={{ color: purchaseModal.landmark ? '#facc15' : TIER_COLORS[purchaseModal.tier as keyof typeof TIER_COLORS] }}>
                    {purchaseModal.landmark ? 'TIER S' : purchaseModal.tier.toUpperCase()}
                  </div>
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

// ─── Geometry rendering helper ───────────────────────────────
function drawGeometry(ctx: CanvasRenderingContext2D, geom: Geometry, scale: number, cx: number, cy: number) {
  if (geom.type === 'Polygon') {
    drawRings(ctx, geom.coordinates, scale, cx, cy)
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(poly => drawRings(ctx, poly, scale, cx, cy))
  }
}

function drawRings(ctx: CanvasRenderingContext2D, rings: number[][][], scale: number, cx: number, cy: number) {
  rings.forEach(ring => {
    ring.forEach((coord, i) => {
      const [lng, lat] = coord
      const { x, y } = projectLngLat(lng, lat, scale, cx, cy)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
  })
}
