'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Zap, Radio, Music, Sparkles } from 'lucide-react'

interface AdSlotProps {
  slot: string
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  className?: string
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>
  }
}

// Rotating placeholder messages when no AdSense or no ad fills
const BILLBOARD_MESSAGES = [
  { icon: Zap, text: 'Your music deserves the spotlight', cta: 'Promote with OGUN', gradient: 'from-cyan-500/20 via-purple-500/10 to-transparent' },
  { icon: Radio, text: 'Get your track on OGUN Radio', cta: 'Boost your reach', gradient: 'from-orange-500/20 via-red-500/10 to-transparent' },
  { icon: Music, text: '618+ tracks streaming 24/7', cta: 'Upload free — earn OGUN', gradient: 'from-green-500/20 via-emerald-500/10 to-transparent' },
  { icon: Sparkles, text: 'Billboard space available', cta: 'Advertise with OGUN', gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent' },
]

/**
 * AdSlot — Google AdSense ad unit with stylish OGUN billboard placeholder.
 *
 * When AdSense is configured: shows Google ads (open in new tab, never interrupts audio).
 * When no AdSense / ad blocker / no fill: shows rotating SoundChain promo billboard.
 * Users can pay OGUN to promote on these billboards (future feature).
 */
export const AdSlot = ({ slot, format = 'auto', className = '' }: AdSlotProps) => {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)
  const [adFailed, setAdFailed] = useState(false)

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID

  // Pick a consistent message based on slot name (so it doesn't change on re-render)
  const msgIndex = slot.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % BILLBOARD_MESSAGES.length
  const billboard = BILLBOARD_MESSAGES[msgIndex]
  const Icon = billboard.icon

  useEffect(() => {
    if (!pubId || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true

      // Check if ad actually filled after a delay
      setTimeout(() => {
        if (adRef.current) {
          const ins = adRef.current
          const rect = ins.getBoundingClientRect()
          if (rect.height < 10) setAdFailed(true)
        }
      }, 3000)
    } catch {
      setAdFailed(true)
    }
  }, [pubId])

  // Show billboard placeholder when no AdSense configured or ad didn't fill
  if (!pubId || adFailed) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <Link href="/dex/announcements" className="block">
          <div className={`relative bg-gradient-to-r ${billboard.gradient} border border-white/5 rounded-lg p-4 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer group`}>
            {/* Subtle animated border glow on hover */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-cyan-500/5 to-purple-500/5" />

            <div className="relative flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 font-medium">{billboard.text}</p>
                <p className="text-xs text-cyan-400/80 mt-0.5">{billboard.cta}</p>
              </div>
              <div className="flex-shrink-0 text-[10px] text-gray-600 uppercase tracking-wider">
                ad
              </div>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className={`ad-slot overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={pubId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
