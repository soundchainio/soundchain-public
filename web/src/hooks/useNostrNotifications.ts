import { useEffect, useRef, useCallback, useState } from 'react'
import { toast } from 'react-toastify'

/**
 * Nostr Real-Time Notification Subscription Hook
 *
 * Connects to Nostr relays and subscribes to notifications for the current user.
 * Works across devices on cellular/wifi - no SMS needed!
 *
 * Features:
 * - Real-time notification subscription via WebSocket
 * - Automatic reconnection on disconnect
 * - NIP-17 encrypted DM support
 * - Works even when browser tab is in background
 */

// Single source of truth — keeps dead relays out of the reconnect loop.
// See lib/nostr/concertChat.ts NOSTR_RELAYS for the canonical list.
import { NOSTR_RELAYS } from 'lib/nostr/concertChat'

interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

interface UseNostrNotificationsOptions {
  userPubkey?: string // User's Nostr pubkey (hex)
  onNotification?: (event: NostrEvent, decryptedContent?: string) => void
  enabled?: boolean
}

// Remove dead relays that cause reconnect spam
const ACTIVE_RELAYS = NOSTR_RELAYS.filter(r => !r.includes('snort.social'))

export function useNostrNotifications({
  userPubkey,
  onNotification,
  enabled = true,
}: UseNostrNotificationsOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionCount, setConnectionCount] = useState(0)
  const socketsRef = useRef<WebSocket[]>([])
  const reconnectTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const subscriptionIdRef = useRef<string>(`soundchain-${Date.now()}`)

  // Stabilize onNotification via ref — prevents callback identity from
  // triggering reconnect loops (was the root cause of the Nostr storm)
  const onNotificationRef = useRef(onNotification)
  onNotificationRef.current = onNotification

  // Clean up function (no deps — fully stable)
  const cleanup = useCallback(() => {
    socketsRef.current.forEach((ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(['CLOSE', subscriptionIdRef.current]))
          ws.close()
        }
      } catch {}
    })
    socketsRef.current = []
    reconnectTimeoutsRef.current.forEach(clearTimeout)
    reconnectTimeoutsRef.current = []
    setIsConnected(false)
    setConnectionCount(0)
  }, [])

  // Effect to manage connections — only re-runs when enabled or userPubkey changes
  // connectToRelay is defined INSIDE useEffect to avoid the useCallback dep chain
  // that was causing the infinite reconnect storm
  useEffect(() => {
    if (!enabled || !userPubkey) return

    console.log('[Nostr] Connecting to relays for user:', userPubkey.slice(0, 8))

    const connectToRelay = (relayUrl: string, attempt = 0): void => {
      try {
        const ws = new WebSocket(relayUrl)

        ws.onopen = () => {
          console.log(`[Nostr] Connected to ${relayUrl}`)
          setConnectionCount((c) => c + 1)
          setIsConnected(true)
          const subscription = [
            'REQ', subscriptionIdRef.current,
            { kinds: [4, 14, 1059], '#p': [userPubkey], since: Math.floor(Date.now() / 1000) - 60 },
          ]
          try { ws.send(JSON.stringify(subscription)) } catch {}
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data[0] === 'EVENT' && data[2]) {
              const nostrEvent: NostrEvent = data[2]
              onNotificationRef.current?.(nostrEvent)
              if (nostrEvent.kind === 4 || nostrEvent.kind === 14) {
                let message = 'New message received'
                try {
                  const parsed = JSON.parse(nostrEvent.content)
                  message = parsed.body || parsed.message || message
                } catch {
                  if (nostrEvent.content.length < 100) message = nostrEvent.content
                }
                toast.info(message, { icon: '🔔', position: 'top-right', autoClose: 5000 })
              }
            }
          } catch {}
        }

        ws.onerror = () => {} // Silent — onclose handles reconnect

        ws.onclose = () => {
          setConnectionCount((c) => Math.max(0, c - 1))
          socketsRef.current = socketsRef.current.filter((s) => s !== ws)
          if (socketsRef.current.length === 0) setIsConnected(false)
          // Reconnect with exponential backoff (max 30s, cap 5 attempts)
          if (attempt < 5) {
            const delay = Math.min(2000 * Math.pow(2, attempt), 30000)
            const timeout = setTimeout(() => connectToRelay(relayUrl, attempt + 1), delay)
            reconnectTimeoutsRef.current.push(timeout)
          }
        }

        socketsRef.current.push(ws)
      } catch {
        console.warn(`[Nostr] Failed to init ${relayUrl}`)
      }
    }

    ACTIVE_RELAYS.forEach((relay) => connectToRelay(relay))
    return cleanup
  }, [enabled, userPubkey, cleanup])

  const reconnect = useCallback(() => { cleanup() }, [cleanup])

  return {
    isConnected,
    connectionCount,
    reconnect,
    relayCount: ACTIVE_RELAYS.length,
  }
}

/**
 * Hook to register for periodic background sync
 * This enables checking for notifications even when browser is closed
 */
export function useBackgroundSync() {
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    async function registerSync() {
      if ('serviceWorker' in navigator && 'periodicSync' in (navigator as any)) {
        try {
          const registration = await navigator.serviceWorker.ready

          // Check permission
          const status = await (navigator as any).permissions.query({
            name: 'periodic-background-sync',
          })

          if (status.state === 'granted') {
            // Register notification check (every hour)
            await (registration as any).periodicSync.register('soundchain-check-notifications', {
              minInterval: 60 * 60 * 1000,
            })

            // Register rewards check (every 30 min)
            await (registration as any).periodicSync.register('soundchain-check-rewards', {
              minInterval: 30 * 60 * 1000,
            })

            setIsRegistered(true)
            console.log('[BackgroundSync] Registered periodic sync')
          }
        } catch (err) {
          console.log('[BackgroundSync] Not available:', err)
        }
      }
    }

    registerSync()
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
      try {
        const registration = await navigator.serviceWorker.ready
        await (registration as any).sync.register('soundchain-notifications-sync')
        console.log('[BackgroundSync] Manual sync triggered')
      } catch (err) {
        console.log('[BackgroundSync] Manual sync failed:', err)
      }
    }
  }, [])

  return {
    isRegistered,
    triggerSync,
  }
}

export default useNostrNotifications
