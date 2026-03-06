import { useRef, useEffect, useCallback } from 'react'
import { useIsMobile } from 'hooks/useIsMobile'

interface PillConnectorCanvasProps {
  genreFilter: string | null
  sortedUserIds: string[]
  expandedPillId: string | null
  /** When true, draw connectors regardless of genreFilter (for track pill sections) */
  alwaysActive?: boolean
}

interface PillPosition {
  x: number
  y: number
}

const SCAN_THROTTLE_MS = 500

// Pre-computed colors at full alpha — pulse via ctx.globalAlpha
const GRAD_COLOR_START = 'rgb(6, 182, 212)'   // cyan-500
const GRAD_COLOR_MID   = 'rgb(168, 85, 247)'  // purple-500
const GRAD_COLOR_END   = 'rgb(131, 24, 67)'   // pink-900
const PARTICLE_COLOR   = 'rgb(6, 182, 212)'
// Soft glow circle (replaces expensive shadowBlur)
const PARTICLE_GLOW    = 'rgba(6, 182, 212, 0.15)'

export default function PillConnectorCanvas({ genreFilter, sortedUserIds, expandedPillId, alwaysActive }: PillConnectorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const positionsRef = useRef<PillPosition[]>([])
  const dirtyRef = useRef(true)
  const lastScanRef = useRef(0)
  const observerRef = useRef<ResizeObserver | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  // Cached gradients — rebuilt only when positions change
  const gradientsRef = useRef<CanvasGradient[]>([])
  const isMobile = useIsMobile()

  // Nothing to draw: no genre filter (unless alwaysActive) or fewer than 2 items
  const active = (alwaysActive || !!genreFilter) && sortedUserIds.length >= 2

  const scanPositions = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const pills: PillPosition[] = []

    for (const id of sortedUserIds) {
      const el = parent.querySelector(`[data-pill-id="${id}"]`) as HTMLElement | null
      if (!el) continue
      const rect = el.getBoundingClientRect()
      pills.push({
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top + rect.height / 2,
      })
    }

    positionsRef.current = pills

    // Rebuild gradient cache — one per connection
    const ctx = ctxRef.current
    if (ctx && pills.length >= 2) {
      const grads: CanvasGradient[] = []
      for (let i = 0; i < pills.length - 1; i++) {
        const from = pills[i]
        const to = pills[i + 1]
        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
        grad.addColorStop(0, GRAD_COLOR_START)
        grad.addColorStop(0.5, GRAD_COLOR_MID)
        grad.addColorStop(1, GRAD_COLOR_END)
        grads.push(grad)
      }
      gradientsRef.current = grads
    }

    dirtyRef.current = false
    lastScanRef.current = performance.now()
  }, [sortedUserIds])

  // Mark dirty when expandedPillId changes (layout shift)
  useEffect(() => {
    dirtyRef.current = true
  }, [expandedPillId, genreFilter, sortedUserIds])

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    // Cache context once
    ctxRef.current = canvas.getContext('2d')

    // ResizeObserver to detect layout changes
    observerRef.current = new ResizeObserver(() => {
      dirtyRef.current = true
    })
    observerRef.current.observe(parent)

    const dpr = window.devicePixelRatio || 1
    let paused = false
    let lastFrameTime = 0
    const MOBILE_FRAME_INTERVAL = 66 // ~15fps on mobile

    const handleVisibility = () => {
      paused = document.hidden
      if (!paused) {
        dirtyRef.current = true
        rafRef.current = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    function draw(time: number) {
      if (paused) return
      rafRef.current = requestAnimationFrame(draw)
      if (isMobile && time - lastFrameTime < MOBILE_FRAME_INTERVAL) return
      lastFrameTime = time
      const ctx = ctxRef.current
      if (!ctx) return

      // Resize canvas to match parent
      const w = parent!.offsetWidth
      const h = parent!.offsetHeight
      if (canvas!.width !== w * dpr || canvas!.height !== h * dpr) {
        canvas!.width = w * dpr
        canvas!.height = h * dpr
        canvas!.style.width = `${w}px`
        canvas!.style.height = `${h}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        dirtyRef.current = true
      }

      // Throttled position scan (also rebuilds gradient cache)
      if (dirtyRef.current && time - lastScanRef.current > SCAN_THROTTLE_MS) {
        scanPositions()
      }

      ctx.clearRect(0, 0, w, h)

      const positions = positionsRef.current
      if (positions.length < 2) return

      const connectionCount = positions.length - 1
      const gradients = gradientsRef.current

      // Scale visual density based on number of connections
      const isHeavy = connectionCount > 100
      const isMedium = connectionCount > 50
      const lineWidth = isMobile
        ? (isHeavy ? 0.5 : isMedium ? 0.75 : 1)
        : (isHeavy ? 0.8 : isMedium ? 1.0 : 1.5)
      const particlesPerLine = isMobile
        ? (isHeavy ? 0 : 1)
        : (isHeavy ? 1 : isMedium ? 2 : 3)
      const baseOpacity = isHeavy ? 0.10 : isMedium ? 0.12 : 0.15
      const opacityRange = isHeavy ? 0.15 : isMedium ? 0.20 : 0.25

      // Draw all connections
      ctx.lineWidth = lineWidth
      for (let i = 0; i < connectionCount; i++) {
        const from = positions[i]
        const to = positions[i + 1]
        if (!from || !to) continue

        // Pulsating opacity via globalAlpha (no per-frame gradient creation)
        const pulse = baseOpacity + opacityRange * Math.sin(time * 0.002 + i * 0.5)
        ctx.globalAlpha = pulse
        ctx.strokeStyle = gradients[i] || GRAD_COLOR_START

        ctx.beginPath()
        if (isMobile) {
          ctx.moveTo(from.x, from.y)
          ctx.lineTo(to.x, to.y)
        } else {
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          const cpOffset = Math.sin(time * 0.001 + i) * 15
          ctx.moveTo(from.x, from.y)
          ctx.quadraticCurveTo(midX, midY + cpOffset, to.x, to.y)
        }
        ctx.stroke()
      }

      // Draw all particles (no shadowBlur — use wider glow circle instead)
      if (particlesPerLine > 0) {
        for (let i = 0; i < connectionCount; i++) {
          const from = positions[i]
          const to = positions[i + 1]
          if (!from || !to) continue

          for (let p = 0; p < particlesPerLine; p++) {
            const offset = p / particlesPerLine
            const t = (time * 0.0003 + offset + i * 0.1) % 1
            const pOpacity = 0.4 + 0.4 * Math.sin(time * 0.003 + p)

            let px: number, py: number
            if (isMobile) {
              px = from.x + (to.x - from.x) * t
              py = from.y + (to.y - from.y) * t
            } else {
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2
              const cpOffset = Math.sin(time * 0.001 + i) * 15
              const cpx = midX
              const cpy = midY + cpOffset
              const inv = 1 - t
              px = inv * inv * from.x + 2 * inv * t * cpx + t * t * to.x
              py = inv * inv * from.y + 2 * inv * t * cpy + t * t * to.y
            }

            // Glow halo (replaces shadowBlur — single wider circle, no GPU blur)
            if (!isMobile) {
              ctx.globalAlpha = pOpacity * 0.3
              ctx.fillStyle = PARTICLE_GLOW
              ctx.beginPath()
              ctx.arc(px, py, 6, 0, Math.PI * 2)
              ctx.fill()
            }

            // Core particle
            ctx.globalAlpha = pOpacity
            ctx.fillStyle = PARTICLE_COLOR
            ctx.beginPath()
            ctx.arc(px, py, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      ctx.globalAlpha = 1
    }

    // Initial position scan
    dirtyRef.current = true
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observerRef.current?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      ctxRef.current = null
    }
  }, [active, isMobile, scanPositions, sortedUserIds, genreFilter, expandedPillId])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
      aria-hidden="true"
    />
  )
}
