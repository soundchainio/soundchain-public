import { useRef, useEffect } from 'react'
import { useIsMobile } from 'hooks/useIsMobile'

/**
 * Cyberpunk mini connector branches between track pills.
 * Scans [data-track-pill] elements, draws thin energy lines
 * between adjacent pills with flowing particles.
 */

const PALETTE = [
  [6, 182, 212],    // cyan-500
  [168, 85, 247],   // purple-500
  [236, 72, 153],   // pink-500
  [139, 92, 246],   // violet-500
]

export default function TrackPillConnectors() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const posRef = useRef<{ x: number; y: number }[]>([])
  const dirtyRef = useRef(true)
  const lastScanRef = useRef(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const dpr = window.devicePixelRatio || 1
    let paused = false
    const SCAN_INTERVAL = 600
    const MAX_CONNECTIONS = isMobile ? 40 : 80

    function scanPills() {
      const parentRect = parent!.getBoundingClientRect()
      const pills = parent!.querySelectorAll('[data-track-pill]')
      const positions: { x: number; y: number }[] = []
      pills.forEach((el) => {
        const rect = el.getBoundingClientRect()
        positions.push({
          x: rect.left - parentRect.left + rect.width / 2,
          y: rect.top - parentRect.top + rect.height / 2,
        })
      })
      posRef.current = positions
      dirtyRef.current = false
      lastScanRef.current = performance.now()
    }

    const observer = new ResizeObserver(() => { dirtyRef.current = true })
    observer.observe(parent)

    const handleVisibility = () => {
      paused = document.hidden
      if (!paused) rafRef.current = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    function draw(time: number) {
      if (paused) return
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      const w = parent!.offsetWidth
      const h = parent!.offsetHeight
      if (w < 1 || h < 1) { rafRef.current = requestAnimationFrame(draw); return }

      if (canvas!.width !== w * dpr || canvas!.height !== h * dpr) {
        canvas!.width = w * dpr
        canvas!.height = h * dpr
        canvas!.style.width = `${w}px`
        canvas!.style.height = `${h}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        dirtyRef.current = true
      }

      if (dirtyRef.current && time - lastScanRef.current > SCAN_INTERVAL) {
        scanPills()
      }

      ctx.clearRect(0, 0, w, h)

      const pos = posRef.current
      if (pos.length < 2) { rafRef.current = requestAnimationFrame(draw); return }

      // Connect adjacent pills (sequential chain)
      const count = Math.min(pos.length - 1, MAX_CONNECTIONS)
      for (let i = 0; i < count; i++) {
        const from = pos[i]
        const to = pos[i + 1]
        if (!from || !to) continue

        const color = PALETTE[i % PALETTE.length]
        const pulse = 0.08 + 0.12 * Math.sin(time * 0.002 + i * 0.4)

        // Thin energy line
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${pulse})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()

        // Single flowing particle per connection
        const t = (time * 0.0004 + i * 0.08) % 1
        const px = from.x + (to.x - from.x) * t
        const py = from.y + (to.y - from.y) * t
        const pAlpha = 0.3 + 0.3 * Math.sin(time * 0.003 + i)

        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${pAlpha})`
        ctx.beginPath()
        ctx.arc(px, py, isMobile ? 1 : 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    setTimeout(() => { dirtyRef.current = true }, 150)
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isMobile])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    />
  )
}
