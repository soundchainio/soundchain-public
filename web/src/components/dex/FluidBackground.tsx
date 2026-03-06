import { useRef, useEffect } from 'react'
import { useIsMobile } from 'hooks/useIsMobile'

/**
 * Animated fluid-sim background using Canvas 2D metaballs.
 * Renders pulsating blobs in SoundChain's cyan/purple/pink palette.
 * Sits behind genre pills + user pills for readability over cover images.
 */

// Pre-computed blob color strings (no per-frame interpolation)
const BLOB_COLORS = [
  { rgb: 'rgb(6, 182, 212)',   r: 6, g: 182, b: 212 },   // cyan
  { rgb: 'rgb(6, 182, 212)',   r: 6, g: 182, b: 212 },   // cyan
  { rgb: 'rgb(168, 85, 247)',  r: 168, g: 85, b: 247 },   // purple
  { rgb: 'rgb(139, 92, 246)',  r: 139, g: 92, b: 246 },   // violet
  { rgb: 'rgb(236, 72, 153)',  r: 236, g: 72, b: 153 },   // pink
  { rgb: 'rgb(131, 24, 67)',   r: 131, g: 24, b: 67 },    // pink-900
]

interface BlobDef {
  cx: number; cy: number; rx: number; ry: number
  freqX: number; freqY: number; phaseX: number; phaseY: number
  colorIdx: number; radiusBase: number; radiusPulse: number
}

const BLOBS: BlobDef[] = [
  { cx: 0.2, cy: 0.3, rx: 0.3, ry: 0.2, freqX: 0.0003, freqY: 0.0004, phaseX: 0, phaseY: 0, colorIdx: 0, radiusBase: 0.25, radiusPulse: 0.06 },
  { cx: 0.7, cy: 0.6, rx: 0.2, ry: 0.3, freqX: 0.0004, freqY: 0.0003, phaseX: 2, phaseY: 1, colorIdx: 1, radiusBase: 0.2, radiusPulse: 0.05 },
  { cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.25, freqX: 0.0002, freqY: 0.0005, phaseX: 1, phaseY: 3, colorIdx: 2, radiusBase: 0.28, radiusPulse: 0.07 },
  { cx: 0.3, cy: 0.7, rx: 0.2, ry: 0.15, freqX: 0.0005, freqY: 0.0002, phaseX: 4, phaseY: 2, colorIdx: 3, radiusBase: 0.18, radiusPulse: 0.04 },
  { cx: 0.8, cy: 0.3, rx: 0.15, ry: 0.2, freqX: 0.0003, freqY: 0.0006, phaseX: 3, phaseY: 0, colorIdx: 4, radiusBase: 0.22, radiusPulse: 0.05 },
  { cx: 0.4, cy: 0.2, rx: 0.2, ry: 0.15, freqX: 0.0006, freqY: 0.0003, phaseX: 5, phaseY: 4, colorIdx: 5, radiusBase: 0.2, radiusPulse: 0.04 },
]

export default function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  // Cached gradients per blob — rebuilt when blob moves enough or canvas resizes
  const gradCacheRef = useRef<{ grad: CanvasGradient; bx: number; by: number; radius: number }[]>([])
  const isMobile = useIsMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    // Render at reduced resolution for performance
    const SCALE = isMobile ? 0.25 : 0.35
    let paused = false
    let lastFrameTime = 0
    const MOBILE_FRAME_INTERVAL = 66 // ~15fps on mobile
    // Only rebuild gradient if blob moved > this many pixels (at reduced resolution)
    const GRAD_REBUILD_THRESHOLD = 2

    // Cache context once
    ctxRef.current = canvas.getContext('2d', { alpha: true })

    const activeBlobs = isMobile ? BLOBS.slice(0, 4) : BLOBS

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

      const parentW = parent!.offsetWidth
      const parentH = parent!.offsetHeight
      const w = Math.floor(parentW * SCALE)
      const h = Math.floor(parentH * SCALE)

      if (w < 1 || h < 1) return

      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w
        canvas!.height = h
        // Force gradient rebuild on resize
        gradCacheRef.current = []
      }

      // Clear with dark base
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(0, 0, w, h)

      // Draw each blob as a radial gradient
      ctx.globalCompositeOperation = 'lighter'

      const cache = gradCacheRef.current

      for (let bi = 0; bi < activeBlobs.length; bi++) {
        const blob = activeBlobs[bi]
        const bx = (blob.cx + blob.rx * Math.sin(time * blob.freqX + blob.phaseX)) * w
        const by = (blob.cy + blob.ry * Math.sin(time * blob.freqY + blob.phaseY)) * h
        const radius = (blob.radiusBase + blob.radiusPulse * Math.sin(time * 0.001 + blob.phaseX)) * w

        // Check if we need to rebuild this blob's gradient
        const cached = cache[bi]
        let grad: CanvasGradient
        if (cached &&
            Math.abs(cached.bx - bx) < GRAD_REBUILD_THRESHOLD &&
            Math.abs(cached.by - by) < GRAD_REBUILD_THRESHOLD &&
            Math.abs(cached.radius - radius) < GRAD_REBUILD_THRESHOLD) {
          grad = cached.grad
        } else {
          // Rebuild gradient (blob moved enough)
          const c = BLOB_COLORS[blob.colorIdx]
          grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius)
          grad.addColorStop(0, c.rgb)
          grad.addColorStop(0.4, c.rgb)
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          cache[bi] = { grad, bx, by, radius }
        }

        // Animate opacity only via globalAlpha (gradient stays cached)
        const alpha = 0.12 + 0.08 * Math.sin(time * 0.0015 + blob.phaseY)
        ctx.globalAlpha = alpha
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(
          cache[bi].bx, cache[bi].by,
          cache[bi].radius,
          0, Math.PI * 2
        )
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      ctxRef.current = null
    }
  }, [isMobile])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 rounded-2xl pointer-events-none"
      style={{ width: '100%', height: '100%', imageRendering: 'auto' }}
      aria-hidden="true"
    />
  )
}
