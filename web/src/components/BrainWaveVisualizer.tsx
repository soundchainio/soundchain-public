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

  // Render loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = 160
    const H = canvas.height = 130

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

      // Draw brain silhouette (side view) — scaled for mini card
      const cx = W * 0.48
      const cy = H * 0.42
      const s = 0.55  // Scale factor

      // Brain outline
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx - 50*s, cy + 30*s)
      ctx.bezierCurveTo(cx - 55*s, cy - 10*s, cx - 45*s, cy - 50*s, cx - 10*s, cy - 55*s)
      ctx.bezierCurveTo(cx + 20*s, cy - 60*s, cx + 50*s, cy - 45*s, cx + 55*s, cy - 20*s)
      ctx.bezierCurveTo(cx + 58*s, cy, cx + 55*s, cy + 20*s, cx + 45*s, cy + 35*s)
      ctx.bezierCurveTo(cx + 35*s, cy + 45*s, cx + 15*s, cy + 50*s, cx, cy + 48*s)
      ctx.bezierCurveTo(cx - 20*s, cy + 46*s, cx - 40*s, cy + 42*s, cx - 50*s, cy + 30*s)
      ctx.closePath()
      ctx.fillStyle = 'rgba(20, 15, 30, 0.8)'
      ctx.strokeStyle = 'rgba(100, 120, 160, 0.3)'
      ctx.lineWidth = 1
      ctx.fill()
      ctx.stroke()
      ctx.clip()

      // Draw activation regions as glowing hotspots

      // Auditory cortex (temporal lobe — side, middle)
      drawActivation(ctx, cx + 35*s, cy + 10*s, mids, [255, 100, 50], 20)

      // Motor cortex (top center — strip)
      drawActivation(ctx, cx, cy - 35*s, bass, [50, 255, 150], 18)

      // Prefrontal (front — top right of profile)
      drawActivation(ctx, cx + 40*s, cy - 25*s, highs, [100, 150, 255], 16)

      // Emotional / Amygdala (deep center)
      drawActivation(ctx, cx + 10*s, cy + 15*s, emotional, [255, 50, 100], 15)

      // Reward circuit (nucleus accumbens — deep front)
      drawActivation(ctx, cx + 25*s, cy + 5*s, reward, [255, 220, 50], 14)

      // Brain folds (sulci) — subtle lines
      ctx.strokeStyle = 'rgba(80, 100, 140, 0.15)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        const sx = cx - 25*s + i * 10*s
        const sy = cy - 30*s + Math.sin(i * 0.8) * 10*s
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(sx + 4*s, sy + 15*s + Math.cos(i) * 6*s, sx + 2*s, sy + 25*s)
        ctx.stroke()
      }

      ctx.restore()

      // Brain stem
      ctx.beginPath()
      ctx.moveTo(cx - 8*s, cy + 48*s)
      ctx.quadraticCurveTo(cx - 12*s, cy + 60*s, cx - 16*s, cy + 72*s)
      ctx.strokeStyle = 'rgba(100, 120, 160, 0.3)'
      ctx.lineWidth = 5
      ctx.stroke()

      // EEG wave at bottom
      ctx.beginPath()
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.4 + energy * 0.4})`
      ctx.lineWidth = 1
      const t = Date.now() / 1000
      for (let x = 0; x < W; x++) {
        const freq = 0.08 + mids * 0.1
        const amp = 3 + bass * 8
        const y = H - 8 + Math.sin(x * freq + t * 3) * amp * Math.sin(x * 0.03 + t)
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
