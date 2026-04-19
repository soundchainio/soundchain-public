/**
 * PulseInstallBanner — Smart banner prompting users to install Pulse PWA
 *
 * Shows on feed/profile/explore pages when user hasn't dismissed it.
 * Guides them to add Pulse to Home Screen for push notifications + calls.
 * Only shows on iOS Safari (where PWA install is needed for push).
 */

import { useState, useEffect } from 'react'
import { X, Phone, Bell, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export function PulseInstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Only show on iOS Safari (not Chrome, not standalone)
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(/CriOS/.test(ua))
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsIOS(ios)

    // Don't show if already dismissed, in standalone, or not iOS
    if (standalone || !ios) return
    if (localStorage.getItem('pulse-install-dismissed')) return

    // Show after 5 seconds
    const timer = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pulse-install-dismissed', Date.now().toString())
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[90] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-[#0b141a] to-[#111b21] border border-[#00a884]/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,168,132,0.15)]">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00a884] to-[#008f72] flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Get SoundChain Pulse</h3>
            <p className="text-[10px] text-gray-400">Voice calls + DMs + notifications</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#00a884]" /> Voice Calls</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-[#00a884]" /> DMs</span>
          <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-[#00a884]" /> Push Alerts</span>
        </div>

        <Link
          href="/pulse"
          onClick={dismiss}
          className="block w-full py-2.5 rounded-xl bg-[#00a884] text-white text-sm font-bold text-center hover:bg-[#00c49a] transition-colors"
        >
          Open Pulse → Add to Home Screen
        </Link>

        <p className="text-[9px] text-gray-500 text-center mt-2">
          Safari only — tap Share → Add to Home Screen
        </p>
      </div>
    </div>
  )
}
