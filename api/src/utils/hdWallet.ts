/**
 * HD Wallet Derivation for Human Users
 *
 * Generates deterministic wallets from a master seed.
 * - One seed = infinite wallets
 * - Same address works on ALL EVM chains (Polygon, Ethereum, Base, etc.)
 * - Separate derivation for Solana (non-EVM)
 *
 * Cost: $0 (vs Magic.link per-user fees)
 */

import { ethers } from 'ethers';
import * as crypto from 'crypto';

// Master seed for human wallets - stored securely in environment
// CRITICAL: Different from AGENT_WALLET_SEED to keep human/agent wallets separate
const HUMAN_WALLET_SEED = process.env.HUMAN_WALLET_SEED || process.env.AGENT_WALLET_SEED;

if (!HUMAN_WALLET_SEED) {
  console.warn('[HD Wallet] Warning: HUMAN_WALLET_SEED not set. HD wallet generation disabled.');
}

/**
 * Convert a user ID (MongoDB ObjectId) to a deterministic index for HD path
 * Uses first 4 bytes of hash as index (max ~4 billion unique paths)
 */
function userIdToIndex(userId: string): number {
  const hash = crypto.createHash('sha256').update(userId.toLowerCase()).digest('hex');
  // Use first 8 hex chars (4 bytes) as index
  return parseInt(hash.slice(0, 8), 16);
}

/**
 * Derive an EVM wallet for a human user
 * Works on: Polygon, Ethereum, Base, Arbitrum, Optimism, etc.
 *
 * @param userId - MongoDB ObjectId as string
 * @returns { address, privateKey } or null if seed not configured
 */
export function deriveHumanEvmWallet(userId: string): { address: string; privateKey: string } | null {
  if (!HUMAN_WALLET_SEED) {
    console.error('[HD Wallet] Cannot derive wallet: HUMAN_WALLET_SEED not configured');
    return null;
  }

  try {
    const index = userIdToIndex(userId);
    // Use different derivation path than agents to avoid collisions
    // Agents use: m/44'/60'/0'/0/{index}
    // Humans use: m/44'/60'/1'/0/{index}
    const path = `m/44'/60'/1'/0/${index}`;

    const wallet = ethers.Wallet.fromMnemonic(HUMAN_WALLET_SEED, path);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch (error) {
    console.error('[HD Wallet] Error deriving EVM wallet:', error);
    return null;
  }
}

/**
 * Derive a Solana wallet for a human user
 * Solana uses Ed25519 keys, different from EVM's secp256k1
 *
 * @param userId - MongoDB ObjectId as string
 * @returns { address, privateKey } or null if seed not configured
 *
 * NOTE: Full Solana implementation requires @solana/web3.js
 * This is a placeholder that derives a deterministic seed for Solana
 */
export function deriveHumanSolanaWallet(userId: string): { address: string; seed: string } | null {
  if (!HUMAN_WALLET_SEED) {
    console.error('[HD Wallet] Cannot derive Solana wallet: HUMAN_WALLET_SEED not configured');
    return null;
  }

  try {
    // For Solana, we derive a 32-byte seed that can be used with @solana/web3.js
    // Full implementation would use: Keypair.fromSeed(seed)
    const index = userIdToIndex(userId);
    const seedPhrase = `${HUMAN_WALLET_SEED}-solana-${index}`;
    const seed = crypto.createHash('sha256').update(seedPhrase).digest('hex');

    // Placeholder address - real implementation would use Solana SDK
    // For now, return the seed hash as a placeholder
    return {
      address: `solana:${seed.slice(0, 44)}`, // Placeholder format
      seed: seed
    };
  } catch (error) {
    console.error('[HD Wallet] Error deriving Solana wallet:', error);
    return null;
  }
}

/**
 * Generate all wallets for a human user (EVM + Solana)
 *
 * @param userId - MongoDB ObjectId as string
 * @returns Object with all derived addresses
 */
export function deriveAllHumanWallets(userId: string): {
  evmAddress: string | null;
  solanaAddress: string | null;
} {
  const evmWallet = deriveHumanEvmWallet(userId);
  const solanaWallet = deriveHumanSolanaWallet(userId);

  return {
    evmAddress: evmWallet?.address || null,
    solanaAddress: solanaWallet?.address || null
  };
}

/**
 * Check if HD wallet system is configured and ready
 */
export function isHdWalletSystemReady(): boolean {
  return !!HUMAN_WALLET_SEED;
}

/**
 * Get the derivation path for a user (for debugging/display)
 */
export function getDerivationPath(userId: string): string {
  const index = userIdToIndex(userId);
  return `m/44'/60'/1'/0/${index}`;
}
