/**
 * SoundChain Nostr Notification Service
 *
 * Sends notifications via Nostr NIP-17 encrypted DMs
 * Users receive notifications in Bitchat app or any NIP-17 compatible client
 *
 * Features:
 * - FREE (no SMS costs!)
 * - Decentralized (no single point of failure)
 * - End-to-end encrypted
 * - Works even when browser is closed (via Bitchat/Nostr clients)
 */

// @ts-ignore - nostr-tools 2.7.0 has inconsistent type exports
import * as nostrTools from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Extract what we need from nostr-tools (type assertions needed due to TS issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nt = nostrTools as any;
const SimplePool = nt.SimplePool;
const finalizeEvent = nt.finalizeEvent;
const generateSecretKey = nt.generateSecretKey;
const getPublicKey = nt.getPublicKey;
const getEventHash = nt.getEventHash;
const nip44 = nt.nip44;
const nip19 = nt.nip19;

// Type definitions (nostr-tools 2.7.0 type exports can be wonky)
interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
  id: string;
  sig: string;
}

interface NostrUnsignedEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
}

/**
 * Convert npub (bech32) to hex pubkey
 * @param pubkey - npub1... or hex format
 * @returns hex pubkey
 */
function normalizeToHex(pubkey: string): string {
  if (!pubkey) return '';

  const trimmed = pubkey.trim();

  // If already hex (64 chars), return as-is
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // If npub format, decode it
  if (trimmed.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'npub') {
        return decoded.data as string;
      }
    } catch (err) {
      console.error('[NostrNotification] Failed to decode npub:', err);
    }
  }

  // Unknown format - return as-is and hope for the best
  return trimmed;
}

// Default Nostr relays - high availability public relays
const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
];

// Singleton pool for connection reuse
const pool = new SimplePool();

// Two days in seconds for timestamp randomization
const TWO_DAYS = 2 * 24 * 60 * 60;

// Get current timestamp
const now = () => Math.floor(Date.now() / 1000);

// Get randomized timestamp for metadata hiding (NIP-17 spec)
const randomNow = () => Math.floor(now() - Math.random() * TWO_DAYS);

// Type for unsigned event with ID
type Rumor = NostrUnsignedEvent & { id: string };

/**
 * SoundChain's Nostr identity (server-side)
 * Private key stored in environment variable
 */
function getSoundChainNostrKey(): Uint8Array {
  const keyHex = process.env.SOUNDCHAIN_NOSTR_PRIVATE_KEY;

  if (!keyHex) {
    // Generate ephemeral key for development (NOT for production!)
    console.warn('[NostrNotification] No SOUNDCHAIN_NOSTR_PRIVATE_KEY set - using ephemeral key');
    return generateSecretKey();
  }

  return hexToBytes(keyHex);
}

/**
 * Derive NIP-44 conversation key
 */
function getConversationKey(privateKey: Uint8Array, publicKey: string): Uint8Array {
  return nip44.v2.utils.getConversationKey(bytesToHex(privateKey), publicKey);
}

/**
 * Encrypt data using NIP-44
 */
function encryptNip44(data: object, privateKey: Uint8Array, publicKey: string): string {
  const conversationKey = getConversationKey(privateKey, publicKey);
  return nip44.v2.encrypt(JSON.stringify(data), conversationKey);
}

/**
 * Create a rumor (unsigned message)
 */
function createRumor(
  event: Partial<NostrUnsignedEvent>,
  privateKey: Uint8Array
): Rumor {
  const rumor = {
    created_at: now(),
    content: '',
    tags: [],
    ...event,
    pubkey: getPublicKey(privateKey),
  } as NostrUnsignedEvent;

  return {
    ...rumor,
    id: getEventHash(rumor as any),
  } as Rumor;
}

/**
 * Create a seal (kind 13) - encrypted rumor
 */
function createSeal(
  rumor: Rumor,
  senderPrivateKey: Uint8Array,
  recipientPubkey: string
): NostrEvent {
  return finalizeEvent(
    {
      kind: 13,
      content: encryptNip44(rumor, senderPrivateKey, recipientPubkey),
      created_at: randomNow(),
      tags: [],
    },
    senderPrivateKey
  ) as unknown as NostrEvent;
}

/**
 * Create a gift wrap (kind 1059) - double encrypted for metadata hiding
 */
function createGiftWrap(seal: NostrEvent, recipientPubkey: string): NostrEvent {
  const wrapKey = generateSecretKey();
  return finalizeEvent(
    {
      kind: 1059,
      content: encryptNip44(seal, wrapKey, recipientPubkey),
      created_at: randomNow(),
      tags: [['p', recipientPubkey]],
    },
    wrapKey
  ) as unknown as NostrEvent;
}

export interface NostrNotificationInput {
  recipientPubkey: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * NostrNotificationService
 *
 * Send push-style notifications via Nostr encrypted DMs (NIP-17)
 * Users receive these in Bitchat app when browser is closed
 */
export class NostrNotificationService {
  private serverKey: Uint8Array;
  private serverPubkey: string;

  constructor() {
    this.serverKey = getSoundChainNostrKey();
    this.serverPubkey = getPublicKey(this.serverKey);
    console.log('[NostrNotification] Server pubkey:', this.serverPubkey);
  }

  /**
   * Send a notification to a user via Nostr DM
   */
  async sendNotification(input: NostrNotificationInput): Promise<boolean> {
    const { recipientPubkey: rawPubkey, title, body, url, icon } = input;

    if (!rawPubkey) {
      console.warn('[NostrNotification] No recipient pubkey provided');
      return false;
    }

    // Normalize pubkey (handles npub bech32 format)
    const recipientPubkey = normalizeToHex(rawPubkey);
    if (!recipientPubkey || recipientPubkey.length !== 64) {
      console.warn('[NostrNotification] Invalid pubkey format:', rawPubkey.slice(0, 20));
      return false;
    }

    try {
      // Format the notification message
      const message = this.formatNotificationMessage(title, body, url);

      // Create NIP-17 encrypted DM
      const rumor = createRumor(
        {
          kind: 14, // Private direct message
          content: message,
          tags: [['p', recipientPubkey]],
        },
        this.serverKey
      );

      // Create seal
      const seal = createSeal(rumor, this.serverKey, recipientPubkey);

      // Create gift wrap for recipient
      const wrap = createGiftWrap(seal, recipientPubkey);

      // Publish to relays
      const publishPromises = pool.publish(NOSTR_RELAYS, wrap);
      const results = await Promise.allSettled(publishPromises);

      const successCount = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length;
      console.log(`[NostrNotification] Published to ${successCount}/${NOSTR_RELAYS.length} relays`);

      return successCount > 0;
    } catch (error) {
      console.error('[NostrNotification] Error sending notification:', error);
      return false;
    }
  }

  /**
   * Format notification message for display in Nostr clients
   */
  private formatNotificationMessage(title: string, body: string, url?: string): string {
    let message = `🔔 ${title}\n\n${body}`;

    if (url) {
      message += `\n\n🔗 ${url}`;
    }

    message += '\n\n— SoundChain';

    return message;
  }

  /**
   * Send follow notification via Nostr
   */
  async notifyNewFollower(
    recipientPubkey: string,
    followerName: string,
    followerHandle: string
  ): Promise<boolean> {
    return this.sendNotification({
      recipientPubkey,
      title: 'New Follower',
      body: `${followerName} (@${followerHandle}) started following you!`,
      url: `https://soundchain.io/users/${followerHandle}`,
    });
  }

  /**
   * Send like notification via Nostr
   */
  async notifyNewLike(
    recipientPubkey: string,
    likerName: string,
    postId: string
  ): Promise<boolean> {
    return this.sendNotification({
      recipientPubkey,
      title: 'New Like',
      body: `${likerName} liked your post!`,
      url: `https://soundchain.io/posts/${postId}`,
    });
  }

  /**
   * Send comment notification via Nostr
   */
  async notifyNewComment(
    recipientPubkey: string,
    commenterName: string,
    postId: string
  ): Promise<boolean> {
    return this.sendNotification({
      recipientPubkey,
      title: 'New Comment',
      body: `${commenterName} commented on your post!`,
      url: `https://soundchain.io/posts/${postId}`,
    });
  }

  /**
   * Send DM notification via Nostr
   */
  async notifyNewDM(
    recipientPubkey: string,
    senderName: string,
    senderHandle: string
  ): Promise<boolean> {
    return this.sendNotification({
      recipientPubkey,
      title: 'New Message',
      body: `${senderName} sent you a message!`,
      url: `https://soundchain.io/messages`,
    });
  }

  /**
   * Send tip notification via Nostr
   */
  async notifyNewTip(
    recipientPubkey: string,
    tipperName: string,
    amount: string
  ): Promise<boolean> {
    return this.sendNotification({
      recipientPubkey,
      title: 'New Tip Received! 💰',
      body: `${tipperName} tipped you ${amount} OGUN!`,
      url: `https://soundchain.io/wallet`,
    });
  }

  /**
   * Send NFT sale notification via Nostr
   */
  async notifyNFTSold(
    recipientPubkey: string,
    buyerName: string,
    trackName: string,
    price: string
  ): Promise<boolean> {
    return this.sendNotification({
      recipientPubkey,
      title: 'NFT Sold! 🎉',
      body: `${buyerName} bought your NFT "${trackName}" for ${price}!`,
      url: `https://soundchain.io/wallet`,
    });
  }

  /**
   * Send OGUN earned notification via Nostr
   */
  async notifyOgunEarned(
    recipientPubkey: string,
    amount: string,
    trackTitle: string,
    isCreator: boolean
  ): Promise<boolean> {
    const title = isCreator ? 'Stream Royalty Earned! 🎵' : 'Listening Reward! 🎧';
    const body = isCreator
      ? `You earned ${amount} OGUN from streams of "${trackTitle}"`
      : `You earned ${amount} OGUN for streaming "${trackTitle}"`;

    return this.sendNotification({
      recipientPubkey,
      title,
      body,
      url: `https://soundchain.io/wallet`,
    });
  }

  /**
   * Get SoundChain's Nostr public key
   * Users can add this to verify notifications are from SoundChain
   */
  getServerPubkey(): string {
    return this.serverPubkey;
  }
}

// Singleton instance
let nostrNotificationService: NostrNotificationService | null = null;

export function getNostrNotificationService(): NostrNotificationService {
  if (!nostrNotificationService) {
    nostrNotificationService = new NostrNotificationService();
  }
  return nostrNotificationService;
}
