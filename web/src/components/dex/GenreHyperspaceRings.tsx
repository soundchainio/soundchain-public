import { useRef, useEffect } from 'react'
import { useIsMobile } from 'hooks/useIsMobile'

/**
 * Genre Network — each genre pill becomes a node, connected by pulsating
 * energy lines forming a neural web. Infinity gauntlet energy flows
 * between genre nodes in SoundChain cyan/purple/pink.
 */

interface NodePos {
  x: number
  y: number
}

interface Edge {
  from: number
  to: number
  dist: number
}

// SoundChain palette — pre-computed RGB strings (no per-frame string interpolation)
const PALETTE_RGB = [
  'rgb(6, 182, 212)',    // cyan-500
  'rgb(168, 85, 247)',   // purple-500
  'rgb(236, 72, 153)',   // pink-500
  'rgb(139, 92, 246)',   // violet-500
  'rgb(6, 182, 212)',    // cyan again for wrap
  'rgb(131, 24, 67)',    // pink-900
]
// Pre-computed glow colors (rgba at 0.15 alpha for soft halo)
const PALETTE_GLOW = [
  'rgba(6, 182, 212, 0.15)',
  'rgba(168, 85, 247, 0.15)',
  'rgba(236, 72, 153, 0.15)',
  'rgba(139, 92, 246, 0.15)',
  'rgba(6, 182, 212, 0.15)',
  'rgba(131, 24, 67, 0.15)',
]

export default function GenreHyperspaceRings() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const nodesRef = useRef<NodePos[]>([])
  const edgesRef = useRef<Edge[]>([])
  const dirtyRef = useRef(true)
  const lastScanRef = useRef(0)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  // Cached node halo gradients — rebuilt only on scanNodes
  const haloGradsRef = useRef<CanvasGradient[]>([])
  const isMobile = useIsMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    // Cache context once
    ctxRef.current = canvas.getContext('2d')

    const dpr = window.devicePixelRatio || 1
    let paused = false
    let lastFrameTime = 0
    const MOBILE_FRAME_INTERVAL = 66 // ~15fps on mobile
    const SCAN_INTERVAL = 500
    const MAX_EDGES = isMobile ? 60 : 120
    const PARTICLES_PER_EDGE = isMobile ? 1 : 2

    // Build proximity-based network edges from pill positions
    function scanNodes() {
      const ctx = ctxRef.current
      const parentRect = parent!.getBoundingClientRect()
      const pills = parent!.querySelectorAll('[data-genre-pill]')
      const nodes: NodePos[] = []

      pills.forEach((el) => {
        const rect = el.getBoundingClientRect()
        nodes.push({
          x: rect.left - parentRect.left + rect.width / 2,
          y: rect.top - parentRect.top + rect.height / 2,
        })
      })

      nodesRef.current = nodes

      // Connect pills that are close — proximity threshold based on average spacing
      if (nodes.length < 2) { edgesRef.current = []; haloGradsRef.current = []; return }

      // Calculate distances between all pairs
      const allDists: Edge[] = []
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          allDists.push({ from: i, to: j, dist })
        }
      }

      allDists.sort((a, b) => a.dist - b.dist)

      const connCount = new Map<number, number>()
      const edges: Edge[] = []
      const maxPerNode = isMobile ? 3 : 4

      for (const edge of allDists) {
        if (edges.length >= MAX_EDGES) break
        const fromCount = connCount.get(edge.from) || 0
        const toCount = connCount.get(edge.to) || 0
        if (fromCount >= maxPerNode && toCount >= maxPerNode) continue
        edges.push(edge)
        connCount.set(edge.from, fromCount + 1)
        connCount.set(edge.to, toCount + 1)
      }

      edgesRef.current = edges

      // Pre-build node halo gradients (only changes when nodes move)
      if (ctx) {
        const halos: CanvasGradient[] = []
        const radius = isMobile ? 18 : 24
        for (let ni = 0; ni < nodes.length; ni++) {
          const node = nodes[ni]
          const ci = ni % PALETTE_RGB.length
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius)
          grad.addColorStop(0, PALETTE_RGB[ci])
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          halos.push(grad)
        }
        haloGradsRef.current = halos
      }

      dirtyRef.current = false
      lastScanRef.current = performance.now()
    }

    // Watch for layout changes
    const observer = new ResizeObserver(() => { dirtyRef.current = true })
    observer.observe(parent)

    const handleVisibility = () => {
      paused = document.hidden
      if (!paused) rafRef.current = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    function draw(time: number) {
      if (paused) return
      rafRef.current = requestAnimationFrame(draw)
      if (isMobile && time - lastFrameTime < MOBILE_FRAME_INTERVAL) return
      lastFrameTime = time
      const ctx = ctxRef.current
      if (!ctx) return

      const w = parent!.offsetWidth
      const h = parent!.offsetHeight
      if (w < 1 || h < 1) return

      if (canvas!.width !== w * dpr || canvas!.height !== h * dpr) {
        canvas!.width = w * dpr
        canvas!.height = h * dpr
        canvas!.style.width = `${w}px`
        canvas!.style.height = `${h}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        dirtyRef.current = true
      }

      // Throttled position scan (also rebuilds halo gradient cache)
      if (dirtyRef.current && time - lastScanRef.current > SCAN_INTERVAL) {
        scanNodes()
      }

      // Dark base
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)'
      ctx.fillRect(0, 0, w, h)

      const nodes = nodesRef.current
      const edges = edgesRef.current
      if (nodes.length < 2 || edges.length === 0) return

      // Draw network edges — NO shadowBlur (was the #1 memory killer)
      // Already has double-stroke technique: wide semi-transparent outer + thin core
      for (let ei = 0; ei < edges.length; ei++) {
        const edge = edges[ei]
        const from = nodes[edge.from]
        const to = nodes[edge.to]
        if (!from || !to) continue

        const ci = ei % PALETTE_RGB.length
        const pulse = 0.12 + 0.18 * Math.sin(time * 0.002 + ei * 0.7)

        // Outer glow — wider stroke, low alpha (replaces shadowBlur)
        ctx.globalAlpha = pulse * 0.4
        ctx.strokeStyle = PALETTE_RGB[ci]
        ctx.lineWidth = isMobile ? 3 : 4
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()

        // Core line
        ctx.globalAlpha = pulse
        ctx.lineWidth = isMobile ? 1 : 1.5
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()

        // Particles flowing from→to (no shadowBlur — use glow circle)
        for (let p = 0; p < PARTICLES_PER_EDGE; p++) {
          const offset = p / PARTICLES_PER_EDGE
          const speed = 0.0004 + (ei % 3) * 0.0001
          const t = (time * speed + offset + ei * 0.05) % 1
          const px = from.x + (to.x - from.x) * t
          const py = from.y + (to.y - from.y) * t
          const pAlpha = 0.5 + 0.5 * Math.sin(time * 0.004 + p * 3 + ei)
          const pRadius = isMobile ? 1.8 : 2.5

          // Soft glow halo (replaces expensive shadowBlur)
          if (!isMobile) {
            ctx.globalAlpha = pAlpha * 0.3
            ctx.fillStyle = PALETTE_GLOW[ci]
            ctx.beginPath()
            ctx.arc(px, py, pRadius * 3, 0, Math.PI * 2)
            ctx.fill()
          }

          // Particle core
          ctx.globalAlpha = pAlpha
          ctx.fillStyle = PALETTE_RGB[ci]
          ctx.beginPath()
          ctx.arc(px, py, pRadius, 0, Math.PI * 2)
          ctx.fill()

          // White-hot center
          ctx.globalAlpha = pAlpha * 0.7
          ctx.fillStyle = 'rgb(255, 255, 255)'
          ctx.beginPath()
          ctx.arc(px, py, pRadius * 0.35, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Node glow halos — use cached gradients, animate with globalAlpha
      const halos = haloGradsRef.current
      const haloRadius = isMobile ? 18 : 24
      for (let ni = 0; ni < nodes.length; ni++) {
        const node = nodes[ni]
        const nodePulse = 0.08 + 0.06 * Math.sin(time * 0.0015 + ni * 1.2)
        ctx.globalAlpha = nodePulse
        ctx.fillStyle = halos[ni] || PALETTE_RGB[ni % PALETTE_RGB.length]
        ctx.beginPath()
        ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    // Initial scan after a short delay for pills to render
    setTimeout(() => { dirtyRef.current = true }, 100)
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      ctxRef.current = null
    }
  }, [isMobile])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 rounded-xl pointer-events-none"
      aria-hidden="true"
    />
  )
}
