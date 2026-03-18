import { useEffect, useRef } from 'react'

/**
 * Google AdSense ad unit component.
 *
 * Uses auto-sized responsive ads by default.
 * Only renders if NEXT_PUBLIC_ADSENSE_PUB_ID is set.
 *
 * Usage:
 *   <AdUnit slot="1234567890" />                    — auto responsive
 *   <AdUnit slot="1234567890" format="in-feed" />   — in-feed style
 *   <AdUnit slot="1234567890" style={{ height: 90 }} /> — fixed height
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdUnitProps {
  slot: string
  format?: 'auto' | 'fluid' | 'in-feed' | 'in-article'
  layout?: string
  className?: string
  style?: React.CSSProperties
}

export default function AdUnit({ slot, format = 'auto', layout, className = '', style }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID

  useEffect(() => {
    if (!pubId || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      // AdSense not loaded or ad blocker active — fail silently
    }
  }, [pubId])

  if (!pubId) return null

  return (
    <div className={`ad-unit ${className}`} style={{ textAlign: 'center', overflow: 'hidden', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={pubId}
        data-ad-slot={slot}
        data-ad-format={format === 'in-feed' ? 'fluid' : format}
        data-full-width-responsive="true"
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(format === 'in-feed' ? { 'data-ad-layout-key': '-6t+ed+2i-1n-4w' } : {})}
      />
    </div>
  )
}
