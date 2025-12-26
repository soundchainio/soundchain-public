'use client'

import { useMemo } from 'react'

interface MiniWaveformProps {
  progress: number // 0-1 percentage
  duration: number
  className?: string
  barCount?: number
  onClick?: (progress: number) => void
}

/**
 * MiniWaveform - A lightweight animated waveform visualization for the bottom player
 *
 * Features:
 * - CSS-only animated bars (no audio analysis)
 * - Rainbow gradient progress indicator
 * - Click-to-seek support
 * - Smooth animations
 */
export const MiniWaveform = ({
  progress = 0,
  duration = 0,
  className = '',
  barCount = 50,
  onClick,
}: MiniWaveformProps) => {
  // Generate deterministic bar heights based on track duration for consistency
  const barHeights = useMemo(() => {
    const heights: number[] = []
    for (let i = 0; i < barCount; i++) {
      // Create a pseudo-random but deterministic pattern
      const seed = (duration * 1000 + i * 7919) % 100
      const noise = Math.sin(i * 0.5) * 30 + Math.cos(i * 0.3) * 20
      const height = 20 + (seed / 100) * 60 + noise
      heights.push(Math.max(15, Math.min(95, height)))
    }
    return heights
  }, [duration, barCount])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick || duration <= 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickProgress = x / rect.width
    onClick(Math.max(0, Math.min(1, clickProgress)))
  }

  const progressPercentage = Math.max(0, Math.min(100, progress * 100))

  return (
    <div
      className={`relative h-14 flex items-center gap-[1px] cursor-pointer group ${className}`}
      onClick={handleClick}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPercentage)}
    >
      {/* Neon glow backdrop - GPU accelerated */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none opacity-20 blur-md"
        style={{
          width: `${progressPercentage}%`,
          background: 'linear-gradient(90deg, #00FFD1 0%, #00D4FF 30%, #A855F7 60%, #FF00FF 100%)',
          willChange: 'width',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />

      {/* Bars - GPU layer for smooth rendering */}
      <div
        style={{
          display: 'contents',
          contain: 'layout style',
        }}
      >
        {barHeights.map((height, i) => {
          const barPosition = (i / barCount) * 100
          const isPlayed = barPosition <= progressPercentage
          const neonColor = getNeonColor(barPosition)

          return (
            <div
              key={i}
              className="flex-1 min-w-[3px] rounded-full"
              style={{
                height: `${height}%`,
                background: isPlayed ? neonColor : 'rgba(255, 255, 255, 0.15)',
                boxShadow: isPlayed ? `0 0 6px ${neonColor}, 0 0 12px ${neonColor}50` : 'none',
                transform: 'translateZ(0)',
              }}
            />
          )
        })}
      </div>

      {/* Smooth playhead cursor - GPU accelerated */}
      <div
        className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
        style={{
          left: `${progressPercentage}%`,
          background: 'linear-gradient(180deg, #00FFD1 0%, #fff 50%, #FF00FF 100%)',
          boxShadow: '0 0 8px #fff, 0 0 16px #00FFD1, 0 0 24px #FF00FF',
          transition: 'left 1s linear',
          willChange: 'left',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
    </div>
  )
}

// Helper to get neon color based on position (futuristic Web3 style)
function getNeonColor(position: number): string {
  if (position < 20) return '#00FFD1'  // Cyan
  if (position < 40) return '#00D4FF'  // Electric Blue
  if (position < 60) return '#A855F7'  // Purple
  if (position < 80) return '#FF00FF'  // Magenta
  return '#FF006E'                      // Hot Pink
}

// Helper to get gradient color based on position
function getGradientColor(position: number, alpha: number = 1): string {
  // Rainbow gradient: teal -> blue -> purple -> pink -> yellow
  const colors = [
    { pos: 0, r: 38, g: 209, b: 168 },    // #26D1A8 - Teal
    { pos: 25, r: 98, g: 170, b: 255 },   // #62AAFF - Blue
    { pos: 50, r: 172, g: 78, b: 253 },   // #AC4EFD - Purple
    { pos: 75, r: 241, g: 65, b: 158 },   // #F1419E - Pink
    { pos: 100, r: 254, g: 213, b: 3 },   // #FED503 - Yellow
  ]

  // Find the two colors to interpolate between
  let lower = colors[0]
  let upper = colors[colors.length - 1]

  for (let i = 0; i < colors.length - 1; i++) {
    if (position >= colors[i].pos && position <= colors[i + 1].pos) {
      lower = colors[i]
      upper = colors[i + 1]
      break
    }
  }

  // Interpolate
  const range = upper.pos - lower.pos
  const t = range > 0 ? (position - lower.pos) / range : 0

  const r = Math.round(lower.r + (upper.r - lower.r) * t)
  const g = Math.round(lower.g + (upper.g - lower.g) * t)
  const b = Math.round(lower.b + (upper.b - lower.b) * t)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default MiniWaveform
