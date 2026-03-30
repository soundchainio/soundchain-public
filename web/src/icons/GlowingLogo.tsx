import * as React from 'react'
import { Logo } from './Logo'

interface GlowingLogoProps {
  width?: number
  height?: number
  intensity?: 'low' | 'medium' | 'high'
  className?: string
}

/**
 * Animated SoundChain logo with pulsing energy glow effect
 * The logo appears to radiate energy/light outward
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
      {/* Outer energy rings - pulsing outward */}
      <div
        className="absolute animate-ping"
        style={{
          width: width * 1.5,
          height: height * 1.5,
          background: 'radial-gradient(circle, rgba(162,82,254,0.3) 0%, rgba(63,221,138,0.2) 40%, transparent 70%)',
          borderRadius: '50%',
          animationDuration: '3s',
        }}
      />

      {/* Secondary pulse ring */}
      <div
        className="absolute animate-pulse"
        style={{
          width: width * 1.3,
          height: height * 1.3,
          background: 'radial-gradient(circle, rgba(1,192,214,0.4) 0%, rgba(241,65,158,0.2) 50%, transparent 70%)',
          borderRadius: '50%',
          animationDuration: '2s',
        }}
      />

      {/* Rotating glow layer */}
      <div
        className="absolute animate-spin"
        style={{
          width: width * 1.2,
          height: height * 1.2,
          background: 'conic-gradient(from 0deg, rgba(254,85,64,0.5), rgba(162,82,254,0.5), rgba(63,221,138,0.5), rgba(1,192,214,0.5), rgba(254,214,3,0.5), rgba(254,85,64,0.5))',
          borderRadius: '50%',
          filter: `blur(${glowSize.blur}px)`,
          animationDuration: '8s',
          animationTimingFunction: 'linear',
        }}
      />

      {/* Inner glow - breathing effect */}
      <div
        className="absolute animate-breathe"
        style={{
          width: width,
          height: height,
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)',
          borderRadius: '50%',
        }}
      />

      {/* The actual spinning sphere logo */}
      <div className="relative z-10 animate-helix-glow">
        <Logo width={width} height={height} spinSpeed="normal" />
      </div>
    </div>
  )
}

/**
 * Simpler version with slower sphere spin
 * Good for nav/header use - still spins but calmer
 */
export const SubtleGlowLogo = ({
  width = 100,
  height = 100,
  className = ''
}: Omit<GlowingLogoProps, 'intensity'>) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Subtle pulsing glow */}
      <div
        className="absolute animate-pulse"
        style={{
          width: width * 1.2,
          height: height * 1.2,
          background: 'radial-gradient(circle, rgba(162,82,254,0.4) 0%, rgba(63,221,138,0.3) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(10px)',
        }}
      />

      {/* Slowly spinning sphere logo */}
      <div className="relative z-10 animate-helix-glow">
        <Logo width={width} height={height} spinSpeed="slow" />
      </div>
    </div>
  )
}
