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

export default function PillConnectorCanvas({ genreFilter, sortedUserIds, expandedPillId, alwaysActive }: PillConnectorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const positionsRef = useRef<PillPosition[]>([])
  const dirtyRef = useRef(true)
  const lastScanRef = useRef(0)
  const observerRef = useRef<ResizeObserver | null>(null)
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

    // Scan ALL pills — no cap. Every pill in the genre gets connected.
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
      const ctx = canvas!.getContext('2d')
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

      // Throttled position scan
      if (dirtyRef.current && time - lastScanRef.current > SCAN_THROTTLE_MS) {
        scanPositions()
      }

      ctx.clearRect(0, 0, w, h)

      const positions = positionsRef.current
      if (positions.length < 2) return

      const connectionCount = positions.length - 1

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

      for (let i = 0; i < connectionCount; i++) {
        const from = positions[i]
        const to = positions[i + 1]
        if (!from || !to) continue

        // Pulsating opacity
        const pulse = baseOpacity + opacityRange * Math.sin(time * 0.002 + i * 0.5)

        // Gradient stroke
        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
        grad.addColorStop(0, `rgba(6, 182, 212, ${pulse})`)
        grad.addColorStop(0.5, `rgba(168, 85, 247, ${pulse})`)
        grad.addColorStop(1, `rgba(131, 24, 67, ${pulse})`)

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = lineWidth

        if (isMobile) {
          // Straight lines on mobile
          ctx.moveTo(from.x, from.y)
          ctx.lineTo(to.x, to.y)
        } else {
          // Quadratic Bezier on desktop with animated wave
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          const cpOffset = Math.sin(time * 0.001 + i) * 15
          ctx.moveTo(from.x, from.y)
          ctx.quadraticCurveTo(midX, midY + cpOffset, to.x, to.y)
        }
        ctx.stroke()

        // Particles flowing along the line
        if (particlesPerLine > 0) {
          for (let p = 0; p < particlesPerLine; p++) {
            const offset = p / particlesPerLine
            const t = (time * 0.0003 + offset + i * 0.1) % 1
            const pOpacity = 0.4 + 0.4 * Math.sin(time * 0.003 + p)

            let px: number, py: number
            if (isMobile) {
              px = from.x + (to.x - from.x) * t
              py = from.y + (to.y - from.y) * t
            } else {
              // Quadratic Bezier point
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2
              const cpOffset = Math.sin(time * 0.001 + i) * 15
              const cpx = midX
              const cpy = midY + cpOffset
              const inv = 1 - t
              px = inv * inv * from.x + 2 * inv * t * cpx + t * t * to.x
              py = inv * inv * from.y + 2 * inv * t * cpy + t * t * to.y
            }

            ctx.beginPath()
            ctx.arc(px, py, 2, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(6, 182, 212, ${pOpacity})`
            if (!isMobile) {
              ctx.shadowColor = 'rgba(6, 182, 212, 0.8)'
              ctx.shadowBlur = 8
            }
            ctx.fill()
            if (!isMobile) ctx.shadowBlur = 0
          }
        }
      }
    }

    // Initial position scan
    dirtyRef.current = true
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observerRef.current?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
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
