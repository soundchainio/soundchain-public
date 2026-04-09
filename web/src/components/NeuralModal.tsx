/**
 * NeuralModal — Global floating TRIBE v2 brain scanner
 *
 * Lives alongside FURL terminal as a toggleable floating panel.
 * Hooks into the global AudioEngine's AnalyserNode to visualize
 * neural activation for whatever track is playing site-wide.
 *
 * Toggle via the brain icon in the top nav or bottom player.
 * Works on every page: feed, playlists, wall, shop, wallet, radio.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Brain, X, Minimize2, Maximize2, ChevronDown, ChevronUp, Cpu, Music, Heart, Zap, Sparkles, Activity } from 'lucide-react'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'

// Drum icon fallback (lucide doesn't have Drum in all versions)
const DrumIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    <path d="M5.6 5.6l3.5 3.5" /><path d="M14.9 14.9l3.5 3.5" />
  </svg>
)

interface NeuralModalProps {
  isOpen: boolean
  onClose: () => void
}

const REGION_DETAILS = [
  { label: 'Audio', key: 'auditory' as const, color: 'rgb(255, 100, 50)', icon: '\u{1F3B5}', desc: 'Raw frequency energy — sonic density of the track' },
  { label: 'Motor', key: 'motor' as const, color: 'rgb(50, 255, 150)', icon: '\u{1F941}', desc: 'Rhythmic intensity — BPM and drum pattern drive' },
  { label: 'Cortex', key: 'prefrontal' as const, color: 'rgb(100, 150, 255)', icon: '\u{1F9E0}', desc: 'Cognitive complexity — harmonic depth and structure' },
  { label: 'Emote', key: 'emotional' as const, color: 'rgb(255, 50, 100)', icon: '\u{1F493}', desc: 'Emotional resonance — mood and feeling conveyed' },
  { label: 'Reward', key: 'reward' as const, color: 'rgb(255, 220, 50)', icon: '\u{26A1}', desc: 'Dopamine prediction — how satisfying to the brain' },
]

export function NeuralModal({ isOpen, onClose }: NeuralModalProps) {
  const { currentSong, isPlaying } = useAudioPlayerContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [engagement, setEngagement] = useState(0)
  const [regions, setRegions] = useState({
    auditory: 0, motor: 0, prefrontal: 0, emotional: 0, reward: 0,
  })

  // Grab the shared analyzer from AudioEngine
  useEffect(() => {
    if (!isOpen) return
    const check = () => {
      const existing = (window as any).__soundchainAnalyzer as AnalyserNode | undefined
      if (existing) analyzerRef.current = existing
    }
    check()
    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [isOpen])

  // Render loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = fullscreen ? 320 : 200
    const H = canvas.height = fullscreen ? 220 : 160

    let prevBass = 0, prevMids = 0, prevHighs = 0

    function draw() {
      let bass = 0, mids = 0, highs = 0, energy = 0

      if (analyzerRef.current && isPlaying) {
        const data = new Uint8Array(analyzerRef.current.frequencyBinCount)
        analyzerRef.current.getByteFrequencyData(data)
        const len = data.length
        for (let i = 0; i < len; i++) {
          const val = data[i] / 255
          if (i < len * 0.15) bass += val
          else if (i < len * 0.5) mids += val
          else highs += val
          energy += val
        }
        bass = bass / (len * 0.15)
        mids = mids / (len * 0.35)
        highs = highs / (len * 0.5)
        energy = energy / len
      }

      bass = prevBass * 0.7 + bass * 0.3
      mids = prevMids * 0.7 + mids * 0.3
      highs = prevHighs * 0.7 + highs * 0.3
      prevBass = bass; prevMids = mids; prevHighs = highs

      const emotional = Math.min(1, (bass * 0.5 + mids * 0.3 + energy * 0.2) * 1.5)
      const reward = Math.min(1, energy * 2)
      const engScore = (bass + mids + highs + emotional + reward) / 5

      setRegions({ auditory: mids, motor: bass, prefrontal: highs, emotional, reward })
      setEngagement(Math.round(engScore * 100))

      // Clear
      ctx.clearRect(0, 0, W, H)

      // Brain silhouette
      const cx = W * 0.48, cy = H * 0.42
      const s = fullscreen ? 0.9 : 0.65

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

      // Activation hotspots
      drawGlow(ctx, cx + 35*s, cy + 10*s, mids, [255, 100, 50], 25*s)
      drawGlow(ctx, cx, cy - 35*s, bass, [50, 255, 150], 22*s)
      drawGlow(ctx, cx + 40*s, cy - 25*s, highs, [100, 150, 255], 20*s)
      drawGlow(ctx, cx + 10*s, cy + 15*s, emotional, [255, 50, 100], 18*s)
      drawGlow(ctx, cx + 25*s, cy + 5*s, reward, [255, 220, 50], 17*s)

      // Brain folds
      ctx.strokeStyle = 'rgba(80, 100, 140, 0.15)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        const sx = cx - 25*s + i * 12*s
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

      // EEG wave
      ctx.beginPath()
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + energy * 0.4})`
      ctx.lineWidth = 1.5
      const t = Date.now() / 1000
      for (let x = 0; x < W; x++) {
        const freq = 0.08 + mids * 0.1
        const amp = 4 + bass * 10
        const y = H - 10 + Math.sin(x * freq + t * 3) * amp * Math.sin(x * 0.03 + t)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Label
      ctx.fillStyle = 'rgba(150, 160, 180, 0.4)'
      ctx.font = `${fullscreen ? 10 : 8}px monospace`
      ctx.fillText('TRIBE v2 \u00D7 SoundChain \u00D7 NVIDIA', 5, H - 3)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isOpen, isPlaying, fullscreen])

  if (!isOpen) return null

  const sorted = REGION_DETAILS
    .map(r => ({ label: r.label, val: regions[r.key as keyof typeof regions] }))
    .sort((a, b) => b.val - a.val)
  const top = sorted[0]
  const low = sorted[sorted.length - 1]

  return (
    <div
      className={`${
        fullscreen
          ? 'fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col'
          : 'fixed bottom-20 right-3 z-[100] w-[240px] sm:w-[280px] rounded-xl overflow-hidden border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
      }`}
      style={!fullscreen ? { background: 'linear-gradient(180deg, rgba(10,5,20,0.97) 0%, rgba(5,0,15,0.97) 100%)' } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/20 bg-black/50">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-mono font-bold text-purple-300 tracking-wider">NEURAL</span>
          <span className="text-[10px] font-mono font-bold text-cyan-400">{engagement}%</span>
          {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1 rounded hover:bg-purple-500/20 transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-3 h-3 text-gray-400" /> : <Maximize2 className="w-3 h-3 text-gray-400" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-red-500/20 transition-colors"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Now Playing */}
      {currentSong?.title && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-purple-500/10 bg-purple-500/5">
          {currentSong.art && (
            <img src={currentSong.art} alt="" className="w-6 h-6 rounded object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-white font-medium truncate">{currentSong.title}</div>
            {currentSong.artist && (
              <div className="text-[8px] text-gray-500 truncate">{currentSong.artist}</div>
            )}
          </div>
          <Activity className="w-3 h-3 text-purple-400 animate-pulse flex-shrink-0" />
        </div>
      )}

      {/* Scrollable content */}
      <div className={`overflow-y-auto scrollbar-hide ${fullscreen ? 'flex-1' : 'max-h-[400px]'}`}>
        {/* Brain Canvas */}
        <div className="flex justify-center py-2 px-2">
          <canvas ref={canvasRef} className="rounded-lg" style={{ imageRendering: 'auto', width: fullscreen ? 320 : 200, height: fullscreen ? 220 : 160 }} />
        </div>

        {/* Region Bars — always visible */}
        <div className="px-3 pb-2 space-y-1.5">
          {REGION_DETAILS.map(r => {
            const val = Math.round(regions[r.key as keyof typeof regions] * 100)
            return (
              <div key={r.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px]">{r.icon}</span>
                    <span className="text-[9px] font-mono font-bold text-white">{r.label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: r.color }}>{val}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, val)}%`, backgroundColor: r.color, boxShadow: `0 0 8px ${r.color}` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Expandable details */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className="flex items-center justify-center gap-1 w-full py-1.5 text-[8px] text-gray-500 hover:text-purple-400 transition-colors border-t border-purple-500/10"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Less' : 'Details'}
        </button>

        {expanded && (
          <div className="divide-y divide-purple-500/10">
            {/* Descriptions */}
            {REGION_DETAILS.map(r => {
              const val = Math.round(regions[r.key as keyof typeof regions] * 100)
              return (
                <div key={`detail-${r.key}`} className="px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px]">{r.icon}</span>
                    <span className="text-[9px] font-mono font-bold text-white">{r.label}</span>
                    <span className="text-[9px] font-mono" style={{ color: r.color }}>{val}%</span>
                  </div>
                  <p className="text-[8px] text-gray-500 leading-relaxed">{r.desc}</p>
                  <p className="text-[7px] text-gray-600 mt-0.5">
                    {val >= 70 ? 'High activation' : val >= 40 ? 'Moderate activation' : 'Low activation'}
                    {' \u2014 '}
                    {r.key === 'auditory' && (val >= 70 ? 'dense sonic texture' : val >= 40 ? 'balanced frequencies' : 'sparse or quiet')}
                    {r.key === 'motor' && (val >= 70 ? 'strong beat drive' : val >= 40 ? 'steady rhythm' : 'minimal percussion')}
                    {r.key === 'prefrontal' && (val >= 70 ? 'complex harmonics' : val >= 40 ? 'moderate structure' : 'simple or repetitive')}
                    {r.key === 'emotional' && (val >= 70 ? 'deeply emotive' : val >= 40 ? 'mood-setting' : 'neutral tone')}
                    {r.key === 'reward' && (val >= 70 ? 'highly satisfying' : val >= 40 ? 'engaging' : 'building tension')}
                  </p>
                </div>
              )
            })}

            {/* TRIBE v2 Analysis */}
            <div className="px-3 py-2">
              <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> TRIBE v2 Analysis
              </div>
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-md p-2">
                <p className="text-[8px] text-purple-300 leading-relaxed">
                  Highest: {top.label} ({Math.round(top.val * 100)}%).
                  Lowest: {low.label} ({Math.round(low.val * 100)}%).
                  {' '}
                  {top.label === 'Emote' ? 'Strong emotional resonance \u2014 mood-driven track.'
                    : top.label === 'Motor' ? 'Rhythm-forward \u2014 high groove and beat drive.'
                    : top.label === 'Audio' ? 'Sonically dense \u2014 rich frequency spectrum.'
                    : top.label === 'Reward' ? 'High dopamine \u2014 satisfying sonic payoff.'
                    : 'Complex structure \u2014 high cognitive engagement.'}
                </p>
                <div className="text-[6px] text-gray-600 mt-1 font-mono">TRIBE v2 \u00D7 SoundChain \u00D7 NVIDIA</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function drawGlow(
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
