import * as React from 'react'
import { Logo } from './Logo'

interface GlowingLogoProps {
  width?: number
  height?: number
  intensity?: 'low' | 'medium' | 'high'
  className?: string
}

/**
 * SoundChain logo with a STATIC energy glow.
 *
 * (Frank, Jun 1 2026 — heat fix) This used to stack 5 infinite animations
 * (animate-ping + pulse + spin + breathe + helix-glow), each at 60fps on
 * radial/conic gradients with blur + drop-shadows. Mounted in the top nav,
 * it pegged ~15-25% GPU on EVERY page, idle or not — the single biggest
 * always-on mobile heat source. We keep the same colorful glow look but
 * render it STATIC (no animation, no per-frame blur recompositing). The
 * brand stays vivid; phones stay cool. The sphere no longer spins.
 */
export const GlowingLogo = ({
  width = 100,
  height = 100,
  intensity = 'medium',
  className = ''
}: GlowingLogoProps) => {
  const glowSize = {
    low: { blur: 15, spread: 5 },
    medium: { blur: 25, spread: 10 },
    high: { blur: 40, spread: 15 },
  }[intensity]

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Static layered glow — same colors, no animation. */}
      <div
        className="absolute"
        style={{
          width: width * 1.4,
          height: height * 1.4,
          background: 'radial-gradient(circle, rgba(162,82,254,0.3) 0%, rgba(1,192,214,0.25) 35%, rgba(63,221,138,0.18) 55%, transparent 72%)',
          borderRadius: '50%',
          filter: `blur(${Math.round(glowSize.blur * 0.6)}px)`,
        }}
      />

      {/* The sphere logo — no spin (motion removed for heat). */}
      <div className="relative z-10">
        <Logo width={width} height={height} spin={false} />
      </div>
    </div>
  )
}

/**
 * Nav/header logo — STATIC glow, no spin. Same look, zero per-frame cost.
 * (See GlowingLogo note above for the Jun 1 2026 heat fix.)
 */
export const SubtleGlowLogo = ({
  width = 100,
  height = 100,
  className = ''
}: Omit<GlowingLogoProps, 'intensity'>) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Static subtle glow. */}
      <div
        className="absolute"
        style={{
          width: width * 1.2,
          height: height * 1.2,
          background: 'radial-gradient(circle, rgba(162,82,254,0.4) 0%, rgba(63,221,138,0.3) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(8px)',
        }}
      />

      {/* Sphere logo — no spin. */}
      <div className="relative z-10">
        <Logo width={width} height={height} spin={false} />
      </div>
    </div>
  )
}
