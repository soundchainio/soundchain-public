/**
 * SoundChain Concert/Venue Chat via Nostr Protocol
 *
 * This module enables location-based chat using Nostr's geohash channels.
 * Messages are interoperable with Bitchat app - same relays, same protocol!
 *
 * Protocol: Nostr NIP-01 + geohash tags
 * Event Kind: 20000 (ephemeral - auto-expires)
 *
 * @see https://github.com/permissionlesstech/bitchat
 * @see https://github.com/nostr-protocol/nips
 */

import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools'
import ngeohash from 'ngeohash'

// Nostr relay pool - same relays Bitchat uses for interoperability
const pool = new SimplePool()

// Public Nostr relays for concert chat
// These are highly available and support ephemeral events
export const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
]

// Geohash precision levels for different use cases
export const GEOHASH_PRECISION = {
  REGION: 3,      // ~156km - Regional chat
  CITY: 4,        // ~39km - City-wide
  DISTRICT: 5,    // ~5km - District/neighborhood
  VENUE: 6,       // ~1.2km - Large venue area
  STAGE: 7,       // ~150m - Concert stage/specific area
  BUILDING: 8,    // ~38m - Building/room level
}

export interface VenueLocation {
  lat: number
  lon: number
  name: string
}

export interface NostrMessage {
  id: string
  content: string
  pubkey: string
  timestamp: number
  geohash: string
  tags: string[][]
}

export interface NostrIdentity {
  privateKey: Uint8Array
  publicKey: string
}

/**
 * Generate or restore Nostr identity from localStorage
 * Identity is stored per-venue geohash for privacy (like Bitchat does)
 */
export function getOrCreateIdentity(geohash?: string): NostrIdentity {
  const storageKey = geohash
    ? `nostr_identity_${geohash.substring(0, 4)}` // Privacy: different identity per region
    : 'nostr_identity_global'

  let privateKey: Uint8Array

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        privateKey = new Uint8Array(JSON.parse(stored))
      } catch {
        privateKey = generateSecretKey()
        localStorage.setItem(storageKey, JSON.stringify(Array.from(privateKey)))
      }
    } else {
      privateKey = generateSecretKey()
      localStorage.setItem(storageKey, JSON.stringify(Array.from(privateKey)))
    }
  } else {
    privateKey = generateSecretKey()
  }

  return {
    privateKey,
    publicKey: getPublicKey(privateKey)
  }
}

/**
 * Generate geohash from coordinates at specified precision
 * Default precision is STAGE (7) for concert venues (~150m)
 */
export function getVenueGeohash(
  venue: VenueLocation,
  precision: number = GEOHASH_PRECISION.STAGE
): string {
  return ngeohash.encode(venue.lat, venue.lon, precision)
}

/**
 * Get all parent geohashes for hierarchical channel support
 * This allows users to see messages at different zoom levels
 */
export function getGeohashHierarchy(geohash: string): string[] {
  const hierarchy: string[] = []
  for (let i = 1; i <= geohash.length; i++) {
    hierarchy.push(geohash.substring(0, i))
  }
  return hierarchy
}

/**
 * Decode geohash back to coordinates
 */
export function decodeGeohash(geohash: string): { lat: number; lon: number } {
  const decoded = ngeohash.decode(geohash)
  return { lat: decoded.latitude, lon: decoded.longitude }
}

/**
 * Subscribe to concert/venue chat channel
 * Uses Nostr kind 20000 (ephemeral events) like Bitchat
 *
 * @param geohash - Location geohash to subscribe to
 * @param onMessage - Callback for incoming messages
 * @param includeParents - Also subscribe to parent geohash channels
 * @returns Subscription object with close() method
 */
export function subscribeToConcertChat(
  geohash: string,
  onMessage: (msg: NostrMessage) => void,
  includeParents: boolean = false
) {
  const geohashes = includeParents
    ? getGeohashHierarchy(geohash)
    : [geohash]

  const seenIds = new Set<string>()

  console.log(`📡 Subscribing to Nostr channels: ${geohashes.join(', ')}`)
  console.log(`📡 Using relays: ${NOSTR_RELAYS.join(', ')}`)

  const sub = pool.subscribeMany(
    NOSTR_RELAYS,
    [{
      kinds: [20000], // Ephemeral events (Bitchat uses this)
      '#g': geohashes,
      since: Math.floor(Date.now() / 1000) - 3600 // Last hour
    }],
    {
      onevent(event: Event) {
        console.log(`📨 Received Nostr event from ${event.pubkey.substring(0, 8)}...`)

        // Dedupe messages
        if (seenIds.has(event.id)) return
        seenIds.add(event.id)

        // Extract geohash from tags
        const gTag = event.tags.find(t => t[0] === 'g')
        const eventGeohash = gTag ? gTag[1] : geohash

        onMessage({
          id: event.id,
          content: event.content,
          pubkey: event.pubkey,
          timestamp: event.created_at,
          geohash: eventGeohash,
          tags: event.tags
        })
      },
      oneose() {
        console.log('📡 Nostr subscription: end of stored events')
      }
    }
  )

  return {
    close: () => sub.close(),
    geohash,
    relays: NOSTR_RELAYS
  }
}

/**
 * Send message to concert/venue chat
 * Compatible with Bitchat - users on both platforms see each other's messages!
 *
 * @param identity - Nostr identity (private/public key pair)
 * @param geohash - Location geohash to post to
 * @param message - Message content
 * @param extraTags - Optional additional tags (e.g., ['t', 'soundchain'])
 */
export async function sendConcertMessage(
  identity: NostrIdentity,
  geohash: string,
  message: string,
  extraTags: string[][] = []
): Promise<Event> {
  const event = finalizeEvent({
    kind: 20000, // Ephemeral event - same as Bitchat
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['g', geohash],
      ['t', 'soundchain'], // SoundChain tag for filtering
      ['t', 'concert'],
      ['client', 'soundchain.io'],
      ...extraTags
    ],
    content: message
  }, identity.privateKey)

  // Publish to all relays with better error handling
  // We only need ONE relay to succeed for the message to propagate
  const publishPromises = pool.publish(NOSTR_RELAYS, event)

  const results = await Promise.allSettled(publishPromises)
  const successCount = results.filter(r => r.status === 'fulfilled').length

  console.log(`📡 Nostr publish: ${successCount}/${NOSTR_RELAYS.length} relays succeeded`)

  if (successCount === 0) {
    // Log which relays failed for debugging
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`Relay ${NOSTR_RELAYS[i]} failed:`, r.reason)
      }
    })
    throw new Error('Failed to publish to any relay')
  }

  return event
}

/**
 * Get approximate location description from geohash
 */
export function getGeohashDescription(geohash: string): string {
  const precision = geohash.length
  const { lat, lon } = decodeGeohash(geohash)

  const precisionDesc = {
    3: 'Region',
    4: 'City',
    5: 'District',
    6: 'Area',
    7: 'Venue',
    8: 'Building'
  }[precision] || 'Location'

  return `${precisionDesc} (${lat.toFixed(2)}, ${lon.toFixed(2)})`
}

/**
 * Check if user is near a geohash location
 * Uses browser geolocation API
 */
export async function isNearLocation(
  targetGeohash: string,
  maxPrecision: number = GEOHASH_PRECISION.VENUE
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userGeohash = ngeohash.encode(
          position.coords.latitude,
          position.coords.longitude,
          maxPrecision
        )
        // Check if user's geohash starts with target (hierarchical match)
        resolve(
          userGeohash.startsWith(targetGeohash.substring(0, maxPrecision)) ||
          targetGeohash.startsWith(userGeohash.substring(0, maxPrecision))
        )
      },
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}

/**
 * Get current user's geohash from browser geolocation
 */
export async function getCurrentGeohash(
  precision: number = GEOHASH_PRECISION.STAGE
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(ngeohash.encode(
          position.coords.latitude,
          position.coords.longitude,
          precision
        ))
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

/**
 * Generate Bitchat deep link for opening same channel in Bitchat app
 * This enables "Open in Bitchat" functionality for offline mesh support
 */
export function getBitchatDeepLink(geohash: string): string {
  // Bitchat uses bitchat:// scheme for deep links
  return `bitchat://channel/${geohash}`
}

/**
 * Generate Bitchat App Store link
 */
export function getBitchatAppStoreLink(): string {
  return 'https://apps.apple.com/us/app/bitchat-mesh/id6748219622'
}

/**
 * Check if Bitchat app is likely installed (best effort)
 * Uses hidden iframe technique to test deep link
 */
export async function checkBitchatInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    // On iOS, we can try to open the app and detect if it fails
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const timeout = setTimeout(() => {
      document.body.removeChild(iframe)
      resolve(false)
    }, 2500)

    // If the app opens, this page will lose focus
    const handleBlur = () => {
      clearTimeout(timeout)
      window.removeEventListener('blur', handleBlur)
      document.body.removeChild(iframe)
      resolve(true)
    }

    window.addEventListener('blur', handleBlur)

    try {
      iframe.contentWindow?.location.replace('bitchat://')
    } catch {
      clearTimeout(timeout)
      window.removeEventListener('blur', handleBlur)
      document.body.removeChild(iframe)
      resolve(false)
    }
  })
}

// Export pool for advanced usage
export { pool }
