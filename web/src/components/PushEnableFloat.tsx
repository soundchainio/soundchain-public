/**
 * PushEnableFloat — Floating button on all pages to enable push notifications
 * Only shows when push is not registered. Works inside PWA (no URL bar needed).
 * One tap → permission prompt → subscribe → phone flashes on trades + DMs.
 */

import React, { useState, useEffect } from 'react'
import { Bell, BellOff, X, Check } from 'lucide-react'

const VAPID_KEY = 'BJyVXuYo6LF6voKAShxlOo6V47M2R3RGCjKK_uQ6PA8T0ryyBE4qpYeKcY1k1UjO7VcEFvvIaSmsJWEcrN5eV3w'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function PushEnableFloat() {
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    // Check if already subscribed
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) { setShow(true); return }
      reg.pushManager.getSubscription().then(sub => {
        if (!sub) setShow(true)
        // Already subscribed — don't show
      })
    }).catch(() => setShow(true))
  }, [])

  if (!show || dismissed || status === 'success') return null

  async function enablePush() {
    setStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('error')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      })

      // Save to server
      const subJson = sub.toJSON()
      const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=').slice(1).join('=')

      await fetch('/api/push/save-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          device: /iPhone|iPad/.test(navigator.userAgent) ? 'iOS' : /Mac/.test(navigator.userAgent) ? 'Mac' : 'Device',
        }),
      })

      setStatus('success')
      // Send test
      await fetch('/api/push/trade-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Push alerts ENABLED! Your phone will flash on every OGUN Trader trade.', type: 'buy' }),
      })

      setTimeout(() => setShow(false), 3000)
    } catch (err) {
      console.error('Push enable failed:', err)
      setStatus('error')
    }
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 animate-in slide-in-from-left-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-900/90 to-purple-900/90 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
        {status === 'loading' ? (
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        ) : status === 'error' ? (
          <BellOff className="w-5 h-5 text-red-400" />
        ) : status === 'success' ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : (
          <Bell className="w-5 h-5 text-cyan-400 animate-pulse" />
        )}

        <button
          onClick={enablePush}
          disabled={status === 'loading'}
          className="text-xs font-bold text-white whitespace-nowrap"
        >
          {status === 'loading' ? 'Enabling...' :
           status === 'error' ? 'Retry — tap Allow when prompted' :
           status === 'success' ? 'Flash alerts ON!' :
           'Enable flash alerts'}
        </button>

        <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-white ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
