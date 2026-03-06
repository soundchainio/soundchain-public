import { useRef, useEffect } from 'react'
import { useIsMobile } from 'hooks/useIsMobile'

/**
 * Animated fluid-sim background using Canvas 2D metaballs.
 * Renders pulsating blobs in SoundChain's cyan/purple/pink palette.
 * Sits behind genre pills + user pills for readability over cover images.
 */
export default function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    // Render at reduced resolution for performance
    const SCALE = isMobile ? 0.25 : 0.35
    const dpr = window.devicePixelRatio || 1
    let paused = false
    let lastFrameTime = 0
    const MOBILE_FRAME_INTERVAL = 66 // ~15fps on mobile

    // Blob definitions — each moves on a Lissajous path
    interface Blob {
      cx: number // center x ratio (0-1)
      cy: number // center y ratio (0-1)
      rx: number // radius x ratio
      ry: number // radius y ratio
      freqX: number
      freqY: number
      phaseX: number
      phaseY: number
      r: number
      g: number
      b: number
      radiusBase: number // ratio of width
      radiusPulse: number
    }

    const blobs: Blob[] = [
      // Cyan blobs
      { cx: 0.2, cy: 0.3, rx: 0.3, ry: 0.2, freqX: 0.0003, freqY: 0.0004, phaseX: 0, phaseY: 0, r: 6, g: 182, b: 212, radiusBase: 0.25, radiusPulse: 0.06 },
      { cx: 0.7, cy: 0.6, rx: 0.2, ry: 0.3, freqX: 0.0004, freqY: 0.0003, phaseX: 2, phaseY: 1, r: 6, g: 182, b: 212, radiusBase: 0.2, radiusPulse: 0.05 },
      // Purple blobs
      { cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.25, freqX: 0.0002, freqY: 0.0005, phaseX: 1, phaseY: 3, r: 168, g: 85, b: 247, radiusBase: 0.28, radiusPulse: 0.07 },
      { cx: 0.3, cy: 0.7, rx: 0.2, ry: 0.15, freqX: 0.0005, freqY: 0.0002, phaseX: 4, phaseY: 2, r: 139, g: 92, b: 246, radiusBase: 0.18, radiusPulse: 0.04 },
      // Pink blobs
      { cx: 0.8, cy: 0.3, rx: 0.15, ry: 0.2, freqX: 0.0003, freqY: 0.0006, phaseX: 3, phaseY: 0, r: 236, g: 72, b: 153, radiusBase: 0.22, radiusPulse: 0.05 },
      { cx: 0.4, cy: 0.2, rx: 0.2, ry: 0.15, freqX: 0.0006, freqY: 0.0003, phaseX: 5, phaseY: 4, r: 131, g: 24, b: 67, radiusBase: 0.2, radiusPulse: 0.04 },
    ]

    // Skip 2 blobs on mobile for performance
    const activeBlobs = isMobile ? blobs.slice(0, 4) : blobs

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
      const ctx = canvas!.getContext('2d', { alpha: true })
      if (!ctx) return

      const parentW = parent!.offsetWidth
      const parentH = parent!.offsetHeight
      const w = Math.floor(parentW * SCALE)
      const h = Math.floor(parentH * SCALE)

      if (w < 1 || h < 1) return

      // Resize canvas to match parent at reduced resolution
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w
        canvas!.height = h
      }

      // Clear with dark base
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(0, 0, w, h)

      // Draw each blob as a radial gradient
      ctx.globalCompositeOperation = 'lighter'

      for (const blob of activeBlobs) {
        // Animate position on Lissajous curve
        const bx = (blob.cx + blob.rx * Math.sin(time * blob.freqX + blob.phaseX)) * w
        const by = (blob.cy + blob.ry * Math.sin(time * blob.freqY + blob.phaseY)) * h

        // Pulsating radius
        const radius = (blob.radiusBase + blob.radiusPulse * Math.sin(time * 0.001 + blob.phaseX)) * w

        // Color pulse — slight alpha oscillation
        const alpha = 0.12 + 0.08 * Math.sin(time * 0.0015 + blob.phaseY)

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius)
        grad.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha})`)
        grad.addColorStop(0.4, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.5})`)
        grad.addColorStop(1, `rgba(${blob.r}, ${blob.g}, ${blob.b}, 0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(bx, by, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
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
