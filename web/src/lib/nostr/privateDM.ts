/**
 * SoundChain Private DMs via Nostr NIP-17
 *
 * End-to-end encrypted direct messages using:
 * - NIP-44: Versioned encryption (ChaCha20)
 * - NIP-59: Gift wrapping for metadata hiding
 * - NIP-17: Private direct message protocol
 *
 * Compatible with Bitchat and other Nostr clients!
 *
 * @see https://nips.nostr.com/17
 * @see https://nips.nostr.com/44
 * @see https://nips.nostr.com/59
 */

import {
  SimplePool,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  getEventHash,
  nip44,
  type Event,
  type UnsignedEvent,
} from 'nostr-tools'
import { bytesToHex } from '@noble/hashes/utils'
import { NOSTR_RELAYS } from './concertChat'

const pool = new SimplePool()

// Two days in seconds - for timestamp randomization
const TWO_DAYS = 2 * 24 * 60 * 60

// Get current timestamp
const now = () => Math.floor(Date.now() / 1000)

// Get randomized timestamp (within last 2 days) for metadata hiding
const randomNow = () => Math.floor(now() - Math.random() * TWO_DAYS)

// Rumor type - unsigned event with ID
type Rumor = UnsignedEvent & { id: string }

/**
 * Derive NIP-44 conversation key from private key and public key
 * This key is used for encrypting/decrypting messages between two users
 */
function getConversationKey(privateKey: Uint8Array, publicKey: string): Uint8Array {
  return nip44.v2.utils.getConversationKey(bytesToHex(privateKey), publicKey)
}

/**
 * Encrypt data using NIP-44
 */
function encryptNip44(data: object, privateKey: Uint8Array, publicKey: string): string {
  const conversationKey = getConversationKey(privateKey, publicKey)
  return nip44.v2.encrypt(JSON.stringify(data), conversationKey)
}

/**
 * Decrypt NIP-44 encrypted data
 */
function decryptNip44(encrypted: string, privateKey: Uint8Array, senderPubkey: string): object {
  const conversationKey = getConversationKey(privateKey, senderPubkey)
  return JSON.parse(nip44.v2.decrypt(encrypted, conversationKey))
}

/**
 * Create a rumor (unsigned message for deniability)
 * This is the actual message content before sealing
 */
function createRumor(
  event: Partial<UnsignedEvent>,
  privateKey: Uint8Array
): Rumor {
  const rumor = {
    created_at: now(),
    content: '',
    tags: [],
    ...event,
    pubkey: getPublicKey(privateKey),
  } as UnsignedEvent

  return {
    ...rumor,
    id: getEventHash(rumor)
  } as Rumor
}

/**
 * Create a seal (kind 13) - encrypted rumor
 * The seal hides the message content
 */
function createSeal(
  rumor: Rumor,
  senderPrivateKey: Uint8Array,
  recipientPubkey: string
): Event {
  return finalizeEvent({
    kind: 13,
    content: encryptNip44(rumor, senderPrivateKey, recipientPubkey),
    created_at: randomNow(), // Randomized for privacy
    tags: [],
  }, senderPrivateKey)
}

/**
 * Create a gift wrap (kind 1059) - double encrypted for metadata hiding
 * Uses ephemeral key so the real sender is hidden
 */
function createGiftWrap(seal: Event, recipientPubkey: string): Event {
  const wrapKey = generateSecretKey()
  return finalizeEvent({
    kind: 1059,
    content: encryptNip44(seal, wrapKey, recipientPubkey),
    created_at: randomNow(), // Randomized for privacy
    tags: [['p', recipientPubkey]],
  }, wrapKey)
}

/**
 * Unwrap a gift wrapped message
 * Returns the decrypted seal event
 */
function unwrapGiftWrap(wrap: Event, recipientPrivateKey: Uint8Array): Event {
  return decryptNip44(wrap.content, recipientPrivateKey, wrap.pubkey) as Event
}

/**
 * Unseal a sealed message
 * Returns the original rumor (message)
 */
function unsealMessage(seal: Event, recipientPrivateKey: Uint8Array): Rumor {
  return decryptNip44(seal.content, recipientPrivateKey, seal.pubkey) as Rumor
}

export interface PrivateDMInput {
  senderPrivateKey: Uint8Array
  recipientPubkey: string
  message: string
}

export interface DecryptedDM {
  id: string
  content: string
  senderPubkey: string
  recipientPubkey: string
  timestamp: number
  kind: number
}

/**
 * Create and send an encrypted private DM (NIP-17)
 *
 * This creates:
 * 1. A rumor (kind 14 unsigned message)
 * 2. A seal (kind 13 encrypted rumor)
 * 3. Gift wraps (kind 1059) for both recipient and sender
 *
 * @param input - Message input with keys and content
 * @returns Array of gift-wrapped events that were published
 */
export async function sendPrivateDM(input: PrivateDMInput): Promise<Event[]> {
  const { senderPrivateKey, recipientPubkey, message } = input
  const senderPubkey = getPublicKey(senderPrivateKey)

  // 1. Create the rumor (kind 14 = chat message)
  const rumor = createRumor({
    kind: 14,
    content: message,
    tags: [['p', recipientPubkey]],
  }, senderPrivateKey)

  // 2. Create the seal
  const seal = createSeal(rumor, senderPrivateKey, recipientPubkey)

  // 3. Create gift wraps for both recipient and sender (so sender can see their own messages)
  const wraps: Event[] = []

  for (const targetPubkey of [recipientPubkey, senderPubkey]) {
    const wrap = createGiftWrap(seal, targetPubkey)
    wraps.push(wrap)
  }

  // 4. Publish all wraps to relays
  for (const wrap of wraps) {
    await Promise.all(pool.publish(NOSTR_RELAYS, wrap))
  }

  return wraps
}

/**
 * Decrypt a received private DM
 *
 * @param wrap - The gift-wrapped event (kind 1059)
 * @param recipientPrivateKey - Your private key
 * @returns Decrypted message details
 */
export function decryptPrivateDM(
  wrap: Event,
  recipientPrivateKey: Uint8Array
): DecryptedDM {
  // Verify it's a gift wrap
  if (wrap.kind !== 1059) {
    throw new Error('Not a gift-wrapped message')
  }

  // Unwrap to get seal
  const seal = unwrapGiftWrap(wrap, recipientPrivateKey)

  // Verify seal kind
  if (seal.kind !== 13) {
    throw new Error('Invalid seal kind')
  }

  // Unseal to get rumor
  const rumor = unsealMessage(seal, recipientPrivateKey)

  // Verify the pubkey matches (prevent impersonation)
  if (rumor.pubkey !== seal.pubkey) {
    throw new Error('Pubkey mismatch - possible impersonation attempt')
  }

  // Extract recipient from tags
  const pTag = rumor.tags.find(t => t[0] === 'p')
  const recipientPubkey = pTag ? pTag[1] : ''

  return {
    id: rumor.id,
    content: rumor.content,
    senderPubkey: rumor.pubkey,
    recipientPubkey,
    timestamp: rumor.created_at,
    kind: rumor.kind
  }
}

/**
 * Subscribe to incoming private DMs
 *
 * @param recipientPubkey - Your public key
 * @param recipientPrivateKey - Your private key (for decryption)
 * @param onMessage - Callback for new messages
 * @returns Subscription with close() method
 */
export function subscribeToPrivateDMs(
  recipientPubkey: string,
  recipientPrivateKey: Uint8Array,
  onMessage: (dm: DecryptedDM) => void
) {
  const seenIds = new Set<string>()

  const sub = pool.subscribeMany(
    NOSTR_RELAYS,
    [{
      kinds: [1059], // Gift wraps
      '#p': [recipientPubkey],
      since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60 // Last 7 days
    }],
    {
      onevent(event: Event) {
        // Dedupe
        if (seenIds.has(event.id)) return
        seenIds.add(event.id)

        try {
          const dm = decryptPrivateDM(event, recipientPrivateKey)
          onMessage(dm)
        } catch (err) {
          // Silently ignore messages we can't decrypt (not for us)
          console.debug('Could not decrypt DM:', err)
        }
      }
    }
  )

  return {
    close: () => sub.close(),
    pubkey: recipientPubkey,
    relays: NOSTR_RELAYS
  }
}

/**
 * Fetch private DM history with a specific user
 *
 * @param myPrivateKey - Your private key
 * @param otherPubkey - The other user's public key
 * @param limit - Max messages to fetch
 * @returns Array of decrypted messages
 */
export async function fetchDMHistory(
  myPrivateKey: Uint8Array,
  otherPubkey: string,
  limit: number = 50
): Promise<DecryptedDM[]> {
  const myPubkey = getPublicKey(myPrivateKey)
  const messages: DecryptedDM[] = []

  // Fetch gift wraps addressed to us
  const events = await pool.querySync(
    NOSTR_RELAYS,
    {
      kinds: [1059],
      '#p': [myPubkey],
      limit: limit * 2 // Fetch extra since some may not be from this conversation
    }
  )

  for (const event of events) {
    try {
      const dm = decryptPrivateDM(event, myPrivateKey)

      // Filter to only messages from/to the other user
      if (dm.senderPubkey === otherPubkey || dm.recipientPubkey === otherPubkey) {
        messages.push(dm)
      }
    } catch {
      // Skip messages we can't decrypt
    }
  }

  // Sort by timestamp
  messages.sort((a, b) => a.timestamp - b.timestamp)

  return messages.slice(-limit)
}

/**
 * Get recommended DM relays for a user (NIP-17 inbox relays)
 * Falls back to default relays if not specified
 */
export async function getUserDMRelays(pubkey: string): Promise<string[]> {
  try {
    // Try to fetch kind 10050 (DM relay list) for the user
    const events = await pool.querySync(
      NOSTR_RELAYS,
      {
        kinds: [10050],
        authors: [pubkey],
        limit: 1
      }
    )

    if (events.length > 0) {
      const relayTags = events[0].tags.filter(t => t[0] === 'relay')
      if (relayTags.length > 0) {
        return relayTags.map(t => t[1])
      }
    }
  } catch (err) {
    console.debug('Could not fetch DM relays:', err)
  }

  // Fall back to default relays
  return NOSTR_RELAYS
}

// Export pool for advanced usage
export { pool }
