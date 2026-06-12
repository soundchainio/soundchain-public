/**
 * BrainWaveVisualizer — SoundChain's own brain-scan visualization
 * (TRIBE-v2-inspired density, never their renderer — our design, our colormap)
 *
 * Dense voxel heat-field across the whole cortex silhouette — every cell
 * carries signal (the fMRI-prediction look), colored on the SC heat ramp
 * (deep violet → blue → cyan → magenta → gold) with a scanner sweep and an
 * idle shimmer so the brain never reads dead. Live FFT drives 5 regions:
 * - Bass → Motor cortex (rhythm/groove)
 * - Mids → Auditory cortex (melody/harmony)
 * - Highs → Prefrontal (musical expectation)
 * - Volume spikes → Amygdala (emotional response)
 * - Overall energy → Reward circuit (dopamine)
 *
 * Placeholder for real GPU-powered neural inference (NVIDIA Inception).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Brain, Zap, Activity, ChevronUp, ChevronDown, Cpu, Music, Drum, Heart, Sparkles } from 'lucide-react'

interface BrainWaveVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  trackTitle?: string
}

export function BrainWaveVisualizer({ audioRef, isPlaying, trackTitle }: BrainWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const [isOpen, setIsOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [engagement, setEngagement] = useState(0)
  const [regions, setRegions] = useState({
    auditory: 0,
    motor: 0,
    prefrontal: 0,
    emotional: 0,
    reward: 0,
  })

  // Read-only — grab the shared analyzer from RadioScene4D (never create our own source)
  useEffect(() => {
    if (!isOpen) return

    const checkAnalyzer = () => {
      const existing = (window as any).__soundchainAnalyzer as AnalyserNode | undefined
      if (existing) {
        analyzerRef.current = existing
      }
    }

    // Check immediately + poll every 500ms until RadioScene4D creates it
    checkAnalyzer()
    const interval = setInterval(checkAnalyzer, 500)
    return () => clearInterval(interval)
  }, [isOpen])

  // Render loop — TRIBE-style dense voxel heat-field, SoundChain's own design.
  // 3× internal resolution so the expanded (scaled-up) card stays crisp.
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = 480
    const H = canvas.height = 390

    let prevBass = 0
    let prevMids = 0
    let prevHighs = 0

    // Brain silhouette as a reusable Path2D (same bezier profile, 3× scale)
    const cx = W * 0.48
    const cy = H * 0.42
    const s = 1.65
    const brainPath = new Path2D()
    brainPath.moveTo(cx - 50*s, cy + 30*s)
    brainPath.bezierCurveTo(cx - 55*s, cy - 10*s, cx - 45*s, cy - 50*s, cx - 10*s, cy - 55*s)
    brainPath.bezierCurveTo(cx + 20*s, cy - 60*s, cx + 50*s, cy - 45*s, cx + 55*s, cy - 20*s)
    brainPath.bezierCurveTo(cx + 58*s, cy, cx + 55*s, cy + 20*s, cx + 45*s, cy + 35*s)
    brainPath.bezierCurveTo(cx + 35*s, cy + 45*s, cx + 15*s, cy + 50*s, cx, cy + 48*s)
    brainPath.bezierCurveTo(cx - 20*s, cy + 46*s, cx - 40*s, cy + 42*s, cx - 50*s, cy + 30*s)
    brainPath.closePath()

    // Voxel grid — cells inside the silhouette only (computed once)
    const CELL = 14
    const voxels: { x: number; y: number }[] = []
    for (let gy = cy - 60*s; gy < cy + 52*s; gy += CELL) {
      for (let gx = cx - 58*s; gx < cx + 60*s; gx += CELL) {
        if (ctx.isPointInPath(brainPath, gx + CELL/2, gy + CELL/2)) voxels.push({ x: gx, y: gy })
      }
    }

    // Functional region centers (anatomy preserved from v1)
    const REGIONS = [
      { x: cx + 35*s, y: cy + 10*s, r: 34*s, k: 'mids' },     // auditory / temporal
      { x: cx,        y: cy - 35*s, r: 30*s, k: 'bass' },     // motor strip
      { x: cx + 40*s, y: cy - 25*s, r: 26*s, k: 'highs' },    // prefrontal
      { x: cx + 10*s, y: cy + 15*s, r: 24*s, k: 'emotional' },// amygdala
      { x: cx + 25*s, y: cy + 5*s,  r: 22*s, k: 'reward' },   // reward circuit
    ] as const

    // SoundChain heat colormap: deep violet → blue → cyan → magenta → gold
    const STOPS: [number, number[]][] = [
      [0.0, [26, 11, 46]], [0.25, [30, 58, 138]], [0.5, [34, 211, 238]],
      [0.75, [255, 45, 136]], [1.0, [251, 191, 36]],
    ]
    const heatColor = (v: number): number[] => {
      const t = Math.max(0, Math.min(1, v))
      for (let i = 1; i < STOPS.length; i++) {
        if (t <= STOPS[i][0]) {
          const [t0, c0] = STOPS[i - 1]; const [t1, c1] = STOPS[i]
          const f = (t - t0) / (t1 - t0)
          return [c0[0] + (c1[0]-c0[0])*f, c0[1] + (c1[1]-c0[1])*f, c0[2] + (c1[2]-c0[2])*f]
        }
      }
      return STOPS[STOPS.length - 1][1]
    }

    let lastDraw = 0
    let frame = 0

    function draw(ts?: number) {
      animFrameRef.current = requestAnimationFrame(draw)
      // ~30fps playing / ~12fps idle — canvas heat-field doesn't need 60
      const interval = isPlaying ? 33 : 83
      if (ts && ts - lastDraw < interval) return
      lastDraw = ts || 0
      frame++
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

      // Throttled React state — v1 called setState EVERY rAF frame (60/s,
      // constant card re-renders). 5Hz is plenty for the meters.
      if (frame % 6 === 0) {
        setRegions({ auditory: mids, motor: bass, prefrontal: highs, emotional, reward })
        setEngagement(Math.round(engScore * 100))
      }

      ctx.clearRect(0, 0, W, H)
      const t = (ts || 0) / 1000
      const vals: Record<string, number> = { bass, mids, highs, emotional, reward }

      // Base plate + clip
      ctx.save()
      ctx.fillStyle = 'rgba(14, 9, 26, 0.92)'
      ctx.fill(brainPath)
      ctx.clip(brainPath)

      // VOXEL HEAT-FIELD — every cell carries signal (TRIBE's dense-coverage
      // look, SoundChain's colormap). Idle shimmer keeps it alive at rest.
      for (let i = 0; i < voxels.length; i++) {
        const vx = voxels[i].x + CELL / 2
        const vy = voxels[i].y + CELL / 2
        let v = 0.07 + 0.05 * Math.sin(t * 1.7 + vx * 0.045 + vy * 0.085)
        for (let rgn = 0; rgn < REGIONS.length; rgn++) {
          const R = REGIONS[rgn]
          const dx = vx - R.x, dy = vy - R.y
          v += vals[R.k] * Math.exp(-(dx*dx + dy*dy) / (R.r * R.r))
        }
        const c = heatColor(v)
        ctx.fillStyle = `rgba(${c[0]|0}, ${c[1]|0}, ${c[2]|0}, ${Math.min(0.85, 0.16 + v * 0.7)})`
        ctx.fillRect(voxels[i].x + 1, voxels[i].y + 1, CELL - 2, CELL - 2)
      }

      // Scanner sweep — a soft vertical band crossing the cortex
      const sweepX = cx - 58*s + ((t * 55) % (118 * s))
      const sweep = ctx.createLinearGradient(sweepX - 22, 0, sweepX + 22, 0)
      sweep.addColorStop(0, 'rgba(34,211,238,0)')
      sweep.addColorStop(0.5, 'rgba(34,211,238,0.16)')
      sweep.addColorStop(1, 'rgba(34,211,238,0)')
      ctx.fillStyle = sweep
      ctx.fillRect(sweepX - 22, 0, 44, H)

      // Sulci folds over the field
      ctx.strokeStyle = 'rgba(190, 205, 235, 0.13)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        const sx = cx - 25*s + i * 10*s
        const sy = cy - 30*s + Math.sin(i * 0.8) * 10*s
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(sx + 4*s, sy + 15*s + Math.cos(i) * 6*s, sx + 2*s, sy + 25*s)
        ctx.stroke()
      }
      ctx.restore()

      // Outline + brain stem
      ctx.strokeStyle = 'rgba(150, 170, 215, 0.4)'
      ctx.lineWidth = 2
      ctx.stroke(brainPath)
      ctx.beginPath()
      ctx.moveTo(cx - 8*s, cy + 48*s)
      ctx.quadraticCurveTo(cx - 12*s, cy + 60*s, cx - 16*s, cy + 72*s)
      ctx.strokeStyle = 'rgba(130, 150, 195, 0.35)'
      ctx.lineWidth = 8
      ctx.stroke()

      // EEG wave at bottom (no in-canvas label — the card footer carries it,
      // the old 8px fillText was colliding with the wave when scaled up)
      ctx.beginPath()
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.4 + energy * 0.4})`
      ctx.lineWidth = 2.5
      for (let x = 0; x < W; x += 2) {
        const freq = 0.028 + mids * 0.035
        const amp = 9 + bass * 24
        const y = H - 22 + Math.sin(x * freq + t * 3) * amp * Math.sin(x * 0.01 + t)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isOpen, isPlaying])

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

  const regionDetails = [
    { label: 'Audio', key: 'auditory' as const, color: 'rgb(255, 100, 50)', icon: '🎵', iconComponent: Music, desc: 'Raw audio frequency energy — how sonically dense the track is', colorClass: 'from-orange-500/20 to-red-500/20 border-orange-500/20' },
    { label: 'Motor', key: 'motor' as const, color: 'rgb(50, 255, 150)', icon: '🥁', iconComponent: Drum, desc: 'Rhythmic intensity — BPM and drum pattern drive', colorClass: 'from-green-500/20 to-emerald-500/20 border-green-500/20' },
    { label: 'Cortex', key: 'prefrontal' as const, color: 'rgb(100, 150, 255)', icon: '🧠', iconComponent: Brain, desc: 'Cognitive complexity — harmonic depth, chord changes, structure', colorClass: 'from-blue-500/20 to-indigo-500/20 border-blue-500/20' },
    { label: 'Emote', key: 'emotional' as const, color: 'rgb(255, 50, 100)', icon: '💓', iconComponent: Heart, desc: 'Emotional resonance — mood, tone, and feeling conveyed', colorClass: 'from-pink-500/20 to-rose-500/20 border-pink-500/20' },
    { label: 'Reward', key: 'reward' as const, color: 'rgb(255, 220, 50)', icon: '⚡', iconComponent: Zap, desc: 'Dopamine prediction — how satisfying the track is to the brain', colorClass: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/20' },
  ]

  return (
    <>
      <div
        className="w-[140px] md:w-[160px] rounded-xl overflow-hidden border border-purple-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.2)] cursor-pointer hover:border-purple-400/50 transition-all"
        style={{ background: 'linear-gradient(180deg, rgba(10,5,20,0.95) 0%, rgba(5,0,15,0.95) 100%)' }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1.5 py-1 border-b border-purple-500/20">
          <div className="flex items-center gap-1">
            <Brain className="w-3 h-3 text-purple-400" />
            <span className="text-[7px] font-mono font-bold text-purple-300 tracking-wider">NEURAL</span>
          </div>
          <span className="text-[8px] font-mono font-bold text-cyan-400">{engagement}%</span>
        </div>

        {/* Brain Canvas */}
        <canvas ref={canvasRef} className="w-full" style={{ imageRendering: 'auto' }} />

        {/* Region Bars — compact */}
        <div className="px-1.5 pb-1 space-y-0.5">
          {regionDetails.map(r => (
            <RegionBar key={r.key} label={r.label} value={regions[r.key]} color={r.color} icon={r.icon} />
          ))}
        </div>

        {/* Expand indicator */}
        <div className="flex items-center justify-center pb-1 text-[7px] text-gray-600">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>

        {/* Footer */}
        <div className="px-1.5 py-1 border-t border-purple-500/10 text-center">
          <span className="text-[6px] text-gray-600 font-mono">TRIBE v2 × SoundChain × NVIDIA</span>
        </div>
      </div>

      {/* Expanded Neural Accordion */}
      {expanded && (
        <div
          className="mt-2 w-[140px] md:w-[160px] rounded-xl overflow-hidden border border-purple-500/20 backdrop-blur-xl transition-all duration-300"
          style={{ background: 'linear-gradient(180deg, rgba(10,5,20,0.95) 0%, rgba(5,0,15,0.95) 100%)' }}
        >
          <div className="divide-y divide-purple-500/10">
            {/* Overall Score */}
            <div className="p-2">
              <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" /> Neural Score
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10">
                  <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="3"
                      strokeDasharray={`${engagement * 0.975} 97.5`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-purple-300 font-mono">{engagement}%</span>
                </div>
                <p className="text-[7px] text-gray-400 leading-relaxed flex-1">
                  {engagement >= 70 ? 'High activation — emotionally engaging track'
                    : engagement >= 40 ? 'Moderate activation — balanced sonic profile'
                    : 'Low activation — ambient or minimal structure'}
                </p>
              </div>
            </div>

            {/* Detailed Region Breakdown */}
            {regionDetails.map(r => {
              const val = Math.round(regions[r.key] * 100)
              const Icon = r.iconComponent
              return (
                <div key={r.key} className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px]">{r.icon}</span>
                      <span className="text-[8px] font-mono font-bold text-white">{r.label}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold" style={{ color: r.color }}>{val}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, val)}%`, backgroundColor: r.color, boxShadow: `0 0 6px ${r.color}` }}
                    />
                  </div>
                  <p className="text-[6px] text-gray-500 leading-relaxed">{r.desc}</p>
                </div>
              )
            })}

            {/* TRIBE v2 Analysis */}
            <div className="p-2">
              <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Analysis
              </div>
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-md p-1.5">
                <p className="text-[7px] text-purple-300 leading-relaxed">
                  {(() => {
                    const sorted = regionDetails
                      .map(r => ({ label: r.label, val: regions[r.key] }))
                      .sort((a, b) => b.val - a.val)
                    const top = sorted[0]
                    const low = sorted[sorted.length - 1]
                    return `Highest: ${top.label} (${Math.round(top.val * 100)}%). Lowest: ${low.label} (${Math.round(low.val * 100)}%). ${
                      top.label === 'Emote' ? 'Strong emotional resonance — mood-driven track.'
                      : top.label === 'Motor' ? 'Rhythm-forward — high groove and beat drive.'
                      : top.label === 'Audio' ? 'Sonically dense — rich frequency spectrum.'
                      : top.label === 'Reward' ? 'High dopamine — satisfying sonic payoff.'
                      : 'Complex structure — high cognitive engagement.'
                    }`
                  })()}
                </p>
                <div className="text-[6px] text-gray-600 mt-1 font-mono">Powered by TRIBE v2 × NVIDIA</div>
              </div>
            </div>

            {/* Track info if available */}
            {trackTitle && (
              <div className="p-2">
                <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5" /> Scanning
                </div>
                <div className="text-[8px] text-cyan-400 font-mono truncate">{trackTitle}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function RegionBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[6px] w-2.5">{icon}</span>
      <span className="text-[6px] text-gray-500 w-9 font-mono">{label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${Math.min(100, value * 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </div>
    </div>
  )
}
