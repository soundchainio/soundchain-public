import { useEffect } from 'react'
import { useNostrNotifications, useBackgroundSync } from 'hooks/useNostrNotifications'
import { useMe } from 'hooks/useMe'

/**
 * NostrNotificationListener
 *
 * Invisible component that subscribes to Nostr relays for real-time notifications.
 * Works across devices on cellular/wifi - no SMS needed!
 *
 * This component:
 * 1. Subscribes to Nostr relays when user is logged in
 * 2. Registers Background Sync for offline notification checks
 * 3. Shows toast notifications for incoming DMs
 */
export function NostrNotificationListener() {
  const { me } = useMe()

  // Get user's Nostr pubkey from their profile
  // Users can set this in their notification settings
  const userPubkey = me?.nostrPubkey || null

  // Subscribe to Nostr relays for real-time notifications
  const { isConnected, connectionCount, relayCount } = useNostrNotifications({
    userPubkey: userPubkey || undefined,
    enabled: !!userPubkey,
    onNotification: (event, decryptedContent) => {
      console.log('[NostrListener] Notification received:', event.kind)
      // Toast is shown automatically by the hook
    },
  })

  // Register background sync for checking notifications when browser is closed
  const { isRegistered: backgroundSyncRegistered } = useBackgroundSync()

  // Log connection status in development
  useEffect(() => {
    if (userPubkey && isConnected) {
      console.log(`[NostrListener] Connected to ${connectionCount}/${relayCount} relays`)
    }
  }, [userPubkey, isConnected, connectionCount, relayCount])

  useEffect(() => {
    if (backgroundSyncRegistered) {
      console.log('[NostrListener] Background sync registered - notifications will check even when browser is closed')
    }
  }, [backgroundSyncRegistered])

  // This component is invisible - it just manages subscriptions
  return null
}

export default NostrNotificationListener
