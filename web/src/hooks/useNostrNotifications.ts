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

// Public Nostr relays (fast, reliable)
const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
]

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

  // Clean up function
  const cleanup = useCallback(() => {
    socketsRef.current.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Close subscription
        ws.send(JSON.stringify(['CLOSE', subscriptionIdRef.current]))
        ws.close()
      }
    })
    socketsRef.current = []

    reconnectTimeoutsRef.current.forEach(clearTimeout)
    reconnectTimeoutsRef.current = []

    setIsConnected(false)
    setConnectionCount(0)
  }, [])

  // Connect to a single relay
  const connectToRelay = useCallback((relayUrl: string, attempt = 0) => {
    if (!enabled || !userPubkey) return

    try {
      const ws = new WebSocket(relayUrl)

      ws.onopen = () => {
        console.log(`[Nostr] Connected to ${relayUrl}`)
        setConnectionCount((c) => c + 1)
        setIsConnected(true)

        // Subscribe to notifications for this user
        // Kind 4 = encrypted DM (legacy)
        // Kind 14 = NIP-17 encrypted DM
        // Kind 1059 = Gift wrapped (NIP-59)
        const subscription = [
          'REQ',
          subscriptionIdRef.current,
          {
            kinds: [4, 14, 1059],
            '#p': [userPubkey],
            since: Math.floor(Date.now() / 1000) - 60, // Last minute
          },
        ]

        ws.send(JSON.stringify(subscription))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data[0] === 'EVENT' && data[2]) {
            const nostrEvent: NostrEvent = data[2]
            console.log('[Nostr] Received event:', nostrEvent.kind)

            // Call the notification handler
            if (onNotification) {
              onNotification(nostrEvent)
            }

            // Show toast for new notifications
            if (nostrEvent.kind === 4 || nostrEvent.kind === 14) {
              // Try to parse content (might be encrypted)
              let message = 'New message received'
              try {
                const parsed = JSON.parse(nostrEvent.content)
                message = parsed.body || parsed.message || message
              } catch {
                // Content might be encrypted or plain text
                if (nostrEvent.content.length < 100) {
                  message = nostrEvent.content
                }
              }

              toast.info(message, {
                icon: '🔔',
                position: 'top-right',
                autoClose: 5000,
              })
            }
          }
        } catch (err) {
          // Ignore parse errors
        }
      }

      ws.onerror = (error) => {
        console.warn(`[Nostr] Error on ${relayUrl}:`, error)
      }

      ws.onclose = () => {
        console.log(`[Nostr] Disconnected from ${relayUrl}`)
        setConnectionCount((c) => Math.max(0, c - 1))

        // Remove from active sockets
        socketsRef.current = socketsRef.current.filter((s) => s !== ws)

        if (socketsRef.current.length === 0) {
          setIsConnected(false)
        }

        // Reconnect with exponential backoff (max 30s)
        if (enabled && attempt < 10) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
          const timeout = setTimeout(() => {
            connectToRelay(relayUrl, attempt + 1)
          }, delay)
          reconnectTimeoutsRef.current.push(timeout)
        }
      }

      socketsRef.current.push(ws)
    } catch (err) {
      console.error(`[Nostr] Failed to connect to ${relayUrl}:`, err)
    }
  }, [enabled, userPubkey, onNotification])

  // Connect to all relays
  const connectToAllRelays = useCallback(() => {
    if (!enabled || !userPubkey) return

    console.log('[Nostr] Connecting to relays for user:', userPubkey.slice(0, 8))
    NOSTR_RELAYS.forEach((relay) => connectToRelay(relay))
  }, [enabled, userPubkey, connectToRelay])

  // Effect to manage connections
  useEffect(() => {
    if (enabled && userPubkey) {
      connectToAllRelays()
    }

    return cleanup
  }, [enabled, userPubkey, connectToAllRelays, cleanup])

  // Reconnect function for manual use
  const reconnect = useCallback(() => {
    cleanup()
    setTimeout(connectToAllRelays, 100)
  }, [cleanup, connectToAllRelays])

  return {
    isConnected,
    connectionCount,
    reconnect,
    relayCount: NOSTR_RELAYS.length,
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
