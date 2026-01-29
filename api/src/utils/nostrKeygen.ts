/**
 * Nostr Keypair Generation Utility
 *
 * Auto-generates Nostr identity for SoundChain users
 * Enables seamless decentralized notifications without user action
 */

// @ts-ignore - nostr-tools 2.7.0 has inconsistent type exports
import * as nostrTools from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nt = nostrTools as any;
const generateSecretKey = nt.generateSecretKey;
const getPublicKey = nt.getPublicKey;

export interface NostrKeypair {
  privateKey: string; // hex
  publicKey: string;  // hex
}

/**
 * Generate a new Nostr keypair for a user
 * Private key is stored server-side for sending notifications
 * Public key is exposed to clients for receiving
 */
export function generateNostrKeypair(): NostrKeypair {
  const secretKey = generateSecretKey();
  const privateKey = bytesToHex(secretKey);
  const publicKey = getPublicKey(secretKey);

  return {
    privateKey,
    publicKey,
  };
}

/**
 * Check if a string is a valid hex pubkey (64 chars)
 */
export function isValidNostrPubkey(pubkey: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(pubkey);
}
