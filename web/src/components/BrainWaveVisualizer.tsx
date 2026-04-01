/**
 * BrainWaveVisualizer — TRIBE v2 inspired neural response visualization
 *
 * Renders a stylized brain with audio-reactive activation regions.
 * Uses live FFT data from the radio to simulate cortical activation:
 * - Bass → Motor cortex (rhythm/groove)
 * - Mids → Auditory cortex (melody/harmony)
 * - Highs → Prefrontal (musical expectation)
 * - Volume spikes → Amygdala (emotional response)
 * - Overall energy → Reward circuit (dopamine)
 *
 * Inspired by Meta's TRIBE v2 brain scanner — placeholder for
 * real GPU-powered neural inference when NVIDIA Inception provides compute.
 */

import React, { useEffect, useRef, useState } from 'react'
import { X, Brain, Zap, Activity } from 'lucide-react'

interface BrainWaveVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  trackTitle?: string
}

export function BrainWaveVisualizer({ audioRef, isPlaying, trackTitle }: BrainWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  const [engagement, setEngagement] = useState(0)
  const [regions, setRegions] = useState({
    auditory: 0,
    motor: 0,
    prefrontal: 0,
    emotional: 0,
    reward: 0,
  })

  // Setup audio analyzer
  useEffect(() => {
    if (!isOpen || !audioRef.current) return

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioCtx.createMediaElementSource(audioRef.current)
      const analyzer = audioCtx.createAnalyser()
      analyzer.fftSize = 256
      source.connect(analyzer)
      analyzer.connect(audioCtx.destination)
      analyzerRef.current = analyzer

      return () => {
        source.disconnect()
        analyzer.disconnect()
      }
    } catch {
      // Audio context already connected — use existing
    }
  }, [isOpen, audioRef])

  // Render loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = 280
    const H = canvas.height = 220

    let prevBass = 0
    let prevMids = 0
    let prevHighs = 0

    function draw() {
      let bass = 0, mids = 0, highs = 0, energy = 0

      if (analyzerRef.current && isPlaying) {
        const data = new Uint8Array(analyzerRef.current.frequencyBinCount)
        analyzerRef.current.getByteFrequencyData(data)

        // Split FFT into brain regions
        const len = data.length
        for (let i = 0; i < len; i++) {
          const val = data[i] / 255
          if (i < len * 0.15) bass += val        // Low freq → Motor cortex
          else if (i < len * 0.5) mids += val    // Mid freq → Auditory cortex
          else highs += val                       // High freq → Prefrontal
          energy += val
        }
        bass = bass / (len * 0.15)
        mids = mids / (len * 0.35)
        highs = highs / (len * 0.5)
        energy = energy / len
      }

      // Smooth transitions
      bass = prevBass * 0.7 + bass * 0.3
      mids = prevMids * 0.7 + mids * 0.3
      highs = prevHighs * 0.7 + highs * 0.3
      prevBass = bass; prevMids = mids; prevHighs = highs

      const emotional = Math.min(1, (bass * 0.5 + mids * 0.3 + energy * 0.2) * 1.5)
      const reward = Math.min(1, energy * 2)
      const engScore = (bass + mids + highs + emotional + reward) / 5

      // Update state every few frames
      setRegions({ auditory: mids, motor: bass, prefrontal: highs, emotional, reward })
      setEngagement(Math.round(engScore * 100))

      // Clear
      ctx.clearRect(0, 0, W, H)

      // Draw brain silhouette (side view)
      const cx = W * 0.45
      const cy = H * 0.45

      // Brain outline
      ctx.save()
      ctx.beginPath()
      // Simplified brain shape — side profile
      ctx.moveTo(cx - 50, cy + 30)
      ctx.bezierCurveTo(cx - 55, cy - 10, cx - 45, cy - 50, cx - 10, cy - 55)
      ctx.bezierCurveTo(cx + 20, cy - 60, cx + 50, cy - 45, cx + 55, cy - 20)
      ctx.bezierCurveTo(cx + 58, cy, cx + 55, cy + 20, cx + 45, cy + 35)
      ctx.bezierCurveTo(cx + 35, cy + 45, cx + 15, cy + 50, cx, cy + 48)
      ctx.bezierCurveTo(cx - 20, cy + 46, cx - 40, cy + 42, cx - 50, cy + 30)
      ctx.closePath()
      ctx.fillStyle = 'rgba(20, 15, 30, 0.8)'
      ctx.strokeStyle = 'rgba(100, 120, 160, 0.3)'
      ctx.lineWidth = 1
      ctx.fill()
      ctx.stroke()
      ctx.clip()

      // Draw activation regions as glowing hotspots

      // Auditory cortex (temporal lobe — side, middle)
      drawActivation(ctx, cx + 35, cy + 10, mids, [255, 100, 50], 35)

      // Motor cortex (top center — strip)
      drawActivation(ctx, cx, cy - 35, bass, [50, 255, 150], 30)

      // Prefrontal (front — top right of profile)
      drawActivation(ctx, cx + 40, cy - 25, highs, [100, 150, 255], 28)

      // Emotional / Amygdala (deep center)
      drawActivation(ctx, cx + 10, cy + 15, emotional, [255, 50, 100], 25)

      // Reward circuit (nucleus accumbens — deep front)
      drawActivation(ctx, cx + 25, cy + 5, reward, [255, 220, 50], 22)

      // Brain folds (sulci) — subtle lines
      ctx.strokeStyle = 'rgba(80, 100, 140, 0.15)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        const sx = cx - 40 + i * 12
        const sy = cy - 40 + Math.sin(i * 0.8) * 15
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(sx + 6, sy + 20 + Math.cos(i) * 10, sx + 3, sy + 35)
        ctx.stroke()
      }

      ctx.restore()

      // Brain stem
      ctx.beginPath()
      ctx.moveTo(cx - 10, cy + 48)
      ctx.quadraticCurveTo(cx - 15, cy + 65, cx - 20, cy + 80)
      ctx.strokeStyle = 'rgba(100, 120, 160, 0.3)'
      ctx.lineWidth = 8
      ctx.stroke()

      // EEG wave at bottom
      ctx.beginPath()
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.4 + energy * 0.4})`
      ctx.lineWidth = 1.5
      const t = Date.now() / 1000
      for (let x = 0; x < W; x++) {
        const freq = 0.05 + mids * 0.1
        const amp = 5 + bass * 15
        const y = H - 15 + Math.sin(x * freq + t * 3) * amp * Math.sin(x * 0.02 + t)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // "TRIBE v2" label
      ctx.fillStyle = 'rgba(150, 160, 180, 0.4)'
      ctx.font = '8px monospace'
      ctx.fillText('TRIBE v2 × SoundChain', 5, H - 3)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isOpen, isPlaying])

  function drawActivation(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    intensity: number,
    color: number[],
    radius: number
  ) {
    if (intensity < 0.05) return
    const r = radius * (0.5 + intensity * 0.5)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity * 0.8})`)
    gradient.addColorStop(0.4, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity * 0.4})`)
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/40 rounded-full border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/10 transition-all group"
        title="Neural Response Visualizer (TRIBE v2)"
      >
        <Brain className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
        <span className="text-[10px] font-mono text-purple-400 group-hover:text-purple-300">NEURAL</span>
      </button>
    )
  }

  return (
    <div className="fixed top-16 right-2 md:right-4 z-[60] w-[260px] md:w-[280px] rounded-xl overflow-hidden border border-purple-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.2)]"
      style={{ background: 'linear-gradient(180deg, rgba(10,5,20,0.95) 0%, rgba(5,0,15,0.95) 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-mono font-bold text-purple-300 tracking-wider">NEURAL RESPONSE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-cyan-400">{engagement}%</span>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Brain Canvas */}
      <canvas ref={canvasRef} className="w-full" style={{ imageRendering: 'auto' }} />

      {/* Region Bars */}
      <div className="px-3 pb-2 space-y-1">
        <RegionBar label="Auditory" value={regions.auditory} color="rgb(255, 100, 50)" icon="🎵" />
        <RegionBar label="Motor" value={regions.motor} color="rgb(50, 255, 150)" icon="🥁" />
        <RegionBar label="Prefrontal" value={regions.prefrontal} color="rgb(100, 150, 255)" icon="🧠" />
        <RegionBar label="Emotional" value={regions.emotional} color="rgb(255, 50, 100)" icon="💓" />
        <RegionBar label="Reward" value={regions.reward} color="rgb(255, 220, 50)" icon="⚡" />
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-purple-500/10 flex items-center justify-between">
        <span className="text-[7px] text-gray-600 font-mono">Meta TRIBE v2 × SoundChain</span>
        <span className="text-[7px] text-purple-500/50 font-mono">NVIDIA GPU Required for Full Model</span>
      </div>
    </div>
  )
}

function RegionBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] w-3">{icon}</span>
      <span className="text-[8px] text-gray-400 w-16 font-mono">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${Math.min(100, value * 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
      <span className="text-[8px] text-gray-500 w-7 text-right font-mono">{Math.round(value * 100)}%</span>
    </div>
  )
}
