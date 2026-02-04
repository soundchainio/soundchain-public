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
        className="absolute"
        style={{
          width: width,
          height: height,
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)',
          borderRadius: '50%',
          animation: 'breathe 2s ease-in-out infinite',
        }}
      />

      {/* The actual logo */}
      <div className="relative z-10" style={{ filter: `drop-shadow(0 0 ${glowSize.spread}px rgba(162,82,254,0.8)) drop-shadow(0 0 ${glowSize.spread * 2}px rgba(63,221,138,0.6))` }}>
        <Logo width={width} height={height} />
      </div>

      {/* CSS for custom animation */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Simpler version with just glow effect (no spinning)
 * Good for nav/header use where spinning might be distracting
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

      {/* The actual logo with drop shadow glow */}
      <div
        className="relative z-10"
        style={{
          filter: 'drop-shadow(0 0 8px rgba(162,82,254,0.6)) drop-shadow(0 0 15px rgba(63,221,138,0.4))',
          animation: 'logoGlow 2s ease-in-out infinite',
        }}
      >
        <Logo width={width} height={height} />
      </div>

      <style jsx>{`
        @keyframes logoGlow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(162,82,254,0.6)) drop-shadow(0 0 15px rgba(63,221,138,0.4));
          }
          50% {
            filter: drop-shadow(0 0 15px rgba(162,82,254,0.8)) drop-shadow(0 0 25px rgba(63,221,138,0.6)) drop-shadow(0 0 35px rgba(1,192,214,0.4));
          }
        }
      `}</style>
    </div>
  )
}
