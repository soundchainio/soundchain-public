'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

interface OgunRewardToastProps {
  amount: number
  trackTitle?: string
}

/**
 * Gamified OGUN reward toast with coin-strike animation
 * Shows animated gold coins (using OGUN favicon) falling and collecting
 */
export const OgunRewardToast = ({ amount, trackTitle }: OgunRewardToastProps) => {
  const [coins, setCoins] = useState<number[]>([])
  const [showTotal, setShowTotal] = useState(false)
  const [collected, setCollected] = useState(false)

  useEffect(() => {
    // Spawn coins one by one for animation effect
    const coinCount = Math.min(Math.ceil(amount * 2), 8) // Max 8 coins
    const newCoins: number[] = []

    for (let i = 0; i < coinCount; i++) {
      setTimeout(() => {
        newCoins.push(i)
        setCoins([...newCoins])
      }, i * 120)
    }

    // Show collected state with pulse
    setTimeout(() => {
      setCollected(true)
    }, coinCount * 120 + 100)

    // Show total after coins finish
    setTimeout(() => {
      setShowTotal(true)
    }, coinCount * 120 + 300)
  }, [amount])

  return (
    <div className="flex items-center gap-3 py-1 relative overflow-visible">
      {/* Gold glow background effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500/10 via-amber-400/20 to-yellow-500/10 rounded-xl blur-xl animate-pulse" />

      {/* Animated Coin Container */}
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* Gold ring / collection area */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/40 via-amber-500/30 to-orange-500/40 ${collected ? 'animate-piggy-pulse' : 'animate-pulse'}`} />
        <div className="absolute inset-1 rounded-full border-2 border-yellow-500/50" />

        {/* Falling coins animation - using favicon as gold coin strike */}
        {coins.map((coinIndex) => (
          <div
            key={coinIndex}
            className="absolute animate-coin-drop"
            style={{
              left: `${10 + (coinIndex % 4) * 20}%`,
              animationDelay: `${coinIndex * 0.12}s`,
            }}
          >
            <Image
              src="/favicons/favicon-32x32.png"
              alt="OGUN"
              width={20}
              height={20}
              className="drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]"
            />
          </div>
        ))}

        {/* Central coin icon - the main gold strike */}
        <div className={`relative z-10 ${collected ? 'animate-piggy-pulse' : 'animate-bounce'}`}>
          <div className="animate-coin-shine">
            <Image
              src="/favicons/favicon-32x32.png"
              alt="OGUN"
              width={32}
              height={32}
              className="drop-shadow-[0_0_12px_rgba(234,179,8,0.9)]"
            />
          </div>
        </div>

        {/* Sparkle effects around the coin */}
        <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75" />
        <div className="absolute bottom-1 left-0 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.3s' }} />
      </div>

      {/* Text content */}
      <div className="flex flex-col relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 font-bold text-xl animate-pulse drop-shadow-lg">
            +{amount.toFixed(2)}
          </span>
          <span className="text-amber-300 font-bold tracking-wide">OGUN</span>
        </div>
        {trackTitle && (
          <span className="text-gray-400 text-xs truncate max-w-[150px]">
            {trackTitle}
          </span>
        )}
        {showTotal && (
          <span className="text-cyan-400 text-xs animate-fade-in font-medium">
            Keep streaming to earn more!
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Daily limit reached toast
 */
export const DailyLimitToast = ({ trackTitle }: { trackTitle?: string }) => {
  return (
    <div className="flex items-center gap-3 py-1 relative">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30" />
        <div className="absolute inset-1 rounded-full border-2 border-orange-500/40" />
        <div className="relative grayscale opacity-60">
          <Image
            src="/favicons/favicon-32x32.png"
            alt="OGUN"
            width={28}
            height={28}
          />
        </div>
        {/* X mark overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-0.5 bg-red-500/80 rotate-45 rounded-full" />
          <div className="w-8 h-0.5 bg-red-500/80 -rotate-45 rounded-full absolute" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-orange-400 font-semibold text-sm">
          Daily limit reached
        </span>
        {trackTitle && (
          <span className="text-gray-400 text-xs truncate max-w-[150px]">
            {trackTitle}
          </span>
        )}
        <span className="text-gray-500 text-xs">
          Come back tomorrow for more OGUN!
        </span>
      </div>
    </div>
  )
}

export default OgunRewardToast
