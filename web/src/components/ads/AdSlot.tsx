'use client'

import { useEffect, useRef } from 'react'

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

/**
 * AdSlot - Reusable Google AdSense ad unit component.
 * Renders an <ins class="adsbygoogle"> element and pushes to window.adsbygoogle on mount.
 * Desktop only (hidden on mobile via parent layout).
 */
export const AdSlot = ({ slot, format = 'auto', className = '' }: AdSlotProps) => {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID

  useEffect(() => {
    if (!pubId || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      // AdSense not loaded yet or ad blocker active
    }
  }, [pubId])

  if (!pubId) return null

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
