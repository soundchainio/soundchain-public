/**
 * SoundChain Nostr Integration
 *
 * Provides decentralized messaging via Nostr protocol,
 * fully interoperable with Bitchat (Jack Dorsey's mesh chat app).
 *
 * Features:
 * - Location-based concert/venue chat (geohash channels)
 * - End-to-end encrypted private DMs (NIP-17)
 * - Bitchat app interoperability
 *
 * @see https://github.com/permissionlesstech/bitchat
 * @see https://nostr.com
 */

// Concert/Location Chat
export {
  subscribeToConcertChat,
  sendConcertMessage,
  getOrCreateIdentity,
  getVenueGeohash,
  getCurrentGeohash,
  getGeohashHierarchy,
  decodeGeohash,
  getGeohashDescription,
  isNearLocation,
  getBitchatDeepLink,
  getBitchatAppStoreLink,
  checkBitchatInstalled,
  NOSTR_RELAYS,
  GEOHASH_PRECISION,
  type VenueLocation,
  type NostrMessage,
  type NostrIdentity,
} from './concertChat'

// Private DMs (NIP-17)
export {
  sendPrivateDM,
  decryptPrivateDM,
  subscribeToPrivateDMs,
  fetchDMHistory,
  getUserDMRelays,
  type PrivateDMInput,
  type DecryptedDM,
} from './privateDM'
