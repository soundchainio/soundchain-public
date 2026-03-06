import { useRef, useEffect } from 'react'
import { useIsMobile } from 'hooks/useIsMobile'

/**
 * SoundChain Matrix Rain — falling code waterfall in cyan/purple/pink
 * instead of classic green. Characters are SC-themed: musical notes,
 * hex fragments, chain symbols, OGUN glyphs.
 *
 * Also doubles as the connector layer: scans [data-track-pill] positions
 * and draws pulsating energy lines between adjacent pills. The rain IS
 * the branches connecting all pills.
 */

// SoundChain palette columns cycle through these
const COLORS = [
  [6, 182, 212],    // cyan-500
  [168, 85, 247],   // purple-500
  [236, 72, 153],   // pink-500
  [139, 92, 246],   // violet-500
  [6, 182, 212],    // cyan again
  [131, 24, 67],    // pink-900
]

// SC-themed glyphs: music notes, hex, chain, OGUN
const GLYPHS = '♪♫♬⟁⟐⎔◆◈⬡⬢⏣⌬SCΩ01ABCDEF⟟⟠⟡∞◎⊕⊗⊚⊛ΞΨΦΠ'

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const isMobile = useIsMobile()
  const pillPosRef = useRef<{ x: number; y: number }[]>([])
  const pillDirtyRef = useRef(true)
  const lastPillScanRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const dpr = window.devicePixelRatio || 1
    let paused = false

    const FONT_SIZE = isMobile ? 10 : 12
    const COL_WIDTH = FONT_SIZE + 2
    const PILL_SCAN_INTERVAL = 500
    const MAX_CONNECTIONS = isMobile ? 40 : 80

    // Column state: each column has a current y-position (drop)
    let columns = 0
    let drops: number[] = []
    let speeds: number[] = []
    let colorIdx: number[] = []
    let brightness: number[] = []

    function initColumns(w: number) {
      columns = Math.floor(w / COL_WIDTH)
      drops = Array.from({ length: columns }, () => Math.random() * -100)
      speeds = Array.from({ length: columns }, () => 0.3 + Math.random() * 0.7)
      colorIdx = Array.from({ length: columns }, (_, i) => i % COLORS.length)
      brightness = Array.from({ length: columns }, () => 0.5 + Math.random() * 0.5)
    }

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
      pillPosRef.current = positions
      pillDirtyRef.current = false
      lastPillScanRef.current = performance.now()
    }

    const handleVisibility = () => {
      paused = document.hidden
      if (!paused) rafRef.current = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const observer = new ResizeObserver(() => {
      const w = parent.offsetWidth
      const h = parent.offsetHeight
      if (w < 1 || h < 1) return
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      initColumns(w)
      pillDirtyRef.current = true
    })
    observer.observe(parent)

    let lastTime = 0
    const FRAME_INTERVAL = isMobile ? 80 : 50 // ms between frames

    function draw(time: number) {
      if (paused) return
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      // Throttle frame rate
      if (time - lastTime < FRAME_INTERVAL) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      lastTime = time

      const w = canvas!.width / dpr
      const h = canvas!.height / dpr

      if (w < 1 || h < 1 || columns === 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Fade previous frame — creates the trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
      ctx.fillRect(0, 0, w, h)

      // --- MATRIX RAIN COLUMNS ---
      ctx.font = `${FONT_SIZE}px "Courier New", monospace`

      for (let i = 0; i < columns; i++) {
        const x = i * COL_WIDTH
        const y = drops[i] * FONT_SIZE

        if (y < -FONT_SIZE || y > h + FONT_SIZE) {
          if (y > h + FONT_SIZE) {
            drops[i] = Math.random() * -40
            speeds[i] = 0.3 + Math.random() * 0.7
            colorIdx[i] = Math.floor(Math.random() * COLORS.length)
            brightness[i] = 0.5 + Math.random() * 0.5
          }
          drops[i] += speeds[i]
          continue
        }

        const color = COLORS[colorIdx[i]]
        const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

        // Head character — bright white-hot
        const headAlpha = brightness[i] * 0.9
        ctx.fillStyle = `rgba(255, 255, 255, ${headAlpha * 0.8})`
        ctx.fillText(char, x, y)

        // Glow behind head
        ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`
        if (!isMobile) ctx.shadowBlur = 8
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${headAlpha})`
        ctx.fillText(char, x, y)
        if (!isMobile) ctx.shadowBlur = 0

        // Trail characters (dimmer, colored)
        const trailLen = isMobile ? 8 : 15
        for (let t = 1; t <= trailLen; t++) {
          const ty = y - t * FONT_SIZE
          if (ty < 0) break
          const trailAlpha = brightness[i] * (1 - t / trailLen) * 0.4
          if (trailAlpha < 0.02) break
          const trailChar = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${trailAlpha})`
          ctx.fillText(trailChar, x, ty)
        }

        drops[i] += speeds[i]
      }

      // --- CONNECTOR BRANCHES BETWEEN PILLS ---
      if (pillDirtyRef.current && time - lastPillScanRef.current > PILL_SCAN_INTERVAL) {
        scanPills()
      }

      const pos = pillPosRef.current
      if (pos.length >= 2) {
        const count = Math.min(pos.length - 1, MAX_CONNECTIONS)
        for (let i = 0; i < count; i++) {
          const from = pos[i]
          const to = pos[i + 1]
          if (!from || !to) continue

          const color = COLORS[i % COLORS.length]
          const pulse = 0.1 + 0.15 * Math.sin(time * 0.002 + i * 0.4)

          // Energy line between pills
          ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${pulse})`
          ctx.lineWidth = isMobile ? 0.5 : 0.8
          ctx.beginPath()
          if (!isMobile) {
            // Subtle wavy bezier on desktop
            const cpOffset = Math.sin(time * 0.001 + i) * 10
            const cpx = (from.x + to.x) / 2
            const cpy = (from.y + to.y) / 2 + cpOffset
            ctx.moveTo(from.x, from.y)
            ctx.quadraticCurveTo(cpx, cpy, to.x, to.y)
          } else {
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
          }
          ctx.stroke()

          // Flowing particles along connection
          const particleCount = isMobile ? 1 : 2
          for (let p = 0; p < particleCount; p++) {
            const t = (time * 0.0004 + i * 0.08 + p * 0.5) % 1
            const px = from.x + (to.x - from.x) * t
            const py = from.y + (to.y - from.y) * t
            const pAlpha = 0.3 + 0.3 * Math.sin(time * 0.003 + i + p)

            ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${pAlpha})`
            ctx.beginPath()
            ctx.arc(px, py, isMobile ? 1 : 1.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    // Init
    const w = parent.offsetWidth
    const h = parent.offsetHeight
    if (w > 0 && h > 0) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      initColumns(w)
    }

    setTimeout(() => { pillDirtyRef.current = true }, 150)
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
      className="absolute inset-0 z-0 rounded-xl pointer-events-none"
      aria-hidden="true"
    />
  )
}
