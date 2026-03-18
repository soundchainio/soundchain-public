'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, Radio, Music, Sparkles, Clock, Eye } from 'lucide-react'

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

/** Paid billboard data from GraphQL */
interface PaidBillboard {
  id: string
  title: string
  description?: string
  imageUrl?: string
  linkUrl?: string
  profileId: string
  expiresAt: string
  impressions: number
}

// Rotating placeholder messages when no paid billboard or AdSense
const BILLBOARD_MESSAGES = [
  { icon: Zap, text: 'Your music deserves the spotlight', cta: 'Promote with OGUN', gradient: 'from-cyan-500/20 via-purple-500/10 to-transparent' },
  { icon: Radio, text: 'Get your track on OGUN Radio', cta: 'Boost your reach', gradient: 'from-orange-500/20 via-red-500/10 to-transparent' },
  { icon: Music, text: '618+ tracks streaming 24/7', cta: 'Upload free — earn OGUN', gradient: 'from-green-500/20 via-emerald-500/10 to-transparent' },
  { icon: Sparkles, text: 'Billboard space available', cta: 'Advertise with OGUN', gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent' },
]

/**
 * AdSlot — Priority-based ad rendering:
 *
 * 1. OGUN-paid billboard (user-purchased, highest revenue share)
 * 2. Google AdSense (automated, Google pays per impression/click)
 * 3. SoundChain promo placeholder (free internal marketing)
 *
 * All external ads open in new tabs — never interrupts audio playback.
 */
export const AdSlot = ({ slot, format = 'auto', className = '' }: AdSlotProps) => {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)
  const [adFailed, setAdFailed] = useState(false)
  const [paidBillboard, setPaidBillboard] = useState<PaidBillboard | null>(null)
  const impressionTracked = useRef(false)

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'

  // Pick a consistent placeholder based on slot name
  const msgIndex = slot.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % BILLBOARD_MESSAGES.length
  const placeholder = BILLBOARD_MESSAGES[msgIndex]
  const Icon = placeholder.icon

  // Fetch paid billboard for this slot
  useEffect(() => {
    const slotMap: Record<string, string> = {
      'feed-top': 'FEED_TOP',
      'ad-slot-1': 'SIDEBAR_1',
      'ad-slot-2': 'SIDEBAR_2',
      'radio-billboard': 'RADIO',
      'explore': 'EXPLORE',
      'users': 'USERS',
    }
    const graphqlSlot = slotMap[slot]
    if (!graphqlSlot) return

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query BillboardForSlot($slot: BillboardSlot!) {
          billboardForSlot(slot: $slot) {
            id title description imageUrl linkUrl profileId expiresAt impressions
          }
        }`,
        variables: { slot: graphqlSlot },
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.data?.billboardForSlot) {
          setPaidBillboard(data.data.billboardForSlot)
        }
      })
      .catch(() => { /* No paid billboard — fall through to AdSense or placeholder */ })
  }, [slot, apiUrl])

  // Track impression for paid billboard
  useEffect(() => {
    if (!paidBillboard || impressionTracked.current) return
    impressionTracked.current = true
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation TrackImpression($id: String!) { trackBillboardImpression(billboardId: $id) }`,
        variables: { id: paidBillboard.id },
      }),
    }).catch(() => {})
  }, [paidBillboard, apiUrl])

  // Push AdSense if no paid billboard
  useEffect(() => {
    if (paidBillboard || !pubId || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
      setTimeout(() => {
        if (adRef.current) {
          const rect = adRef.current.getBoundingClientRect()
          if (rect.height < 10) setAdFailed(true)
        }
      }, 3000)
    } catch {
      setAdFailed(true)
    }
  }, [pubId, paidBillboard])

  // ─── Priority 1: OGUN-paid billboard ───
  if (paidBillboard) {
    const timeLeft = Math.max(0, Math.ceil((new Date(paidBillboard.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
    const handleClick = () => {
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation TrackClick($id: String!) { trackBillboardClick(billboardId: $id) }`,
          variables: { id: paidBillboard.id },
        }),
      }).catch(() => {})
    }

    return (
      <div className={`overflow-hidden ${className}`}>
        <a
          href={paidBillboard.linkUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="block"
        >
          <div className="relative bg-gradient-to-r from-purple-500/10 via-cyan-500/5 to-purple-500/10 border border-purple-500/20 rounded-lg overflow-hidden hover:border-cyan-500/40 transition-all duration-300 group">
            {paidBillboard.imageUrl && (
              <div className="relative w-full h-24 sm:h-32">
                <Image
                  src={paidBillboard.imageUrl}
                  alt={paidBillboard.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold text-white">{paidBillboard.title}</p>
              {paidBillboard.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{paidBillboard.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {paidBillboard.impressions}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLeft}h left</span>
                <span className="ml-auto uppercase tracking-wider text-purple-400/60">promoted</span>
              </div>
            </div>
          </div>
        </a>
      </div>
    )
  }

  // ─── Priority 2: Google AdSense ───
  if (pubId && !adFailed) {
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

  // ─── Priority 3: SoundChain promo placeholder ───
  return (
    <div className={`overflow-hidden ${className}`}>
      <Link href="/dex/announcements" className="block">
        <div className={`relative bg-gradient-to-r ${placeholder.gradient} border border-white/5 rounded-lg p-4 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer group`}>
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-cyan-500/5 to-purple-500/5" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <Icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 font-medium">{placeholder.text}</p>
              <p className="text-xs text-cyan-400/80 mt-0.5">{placeholder.cta}</p>
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
