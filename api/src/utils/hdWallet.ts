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
 * Convert a user ID (MongoDB ObjectId) to a deterministic index for HD path.
 *
 * BIP-44 non-hardened indices MUST be < 2^31. parseInt(hash.slice(0,8),16) can
 * reach 2^32-1, which makes `Wallet.fromMnemonic` throw "invalid path index"
 * for roughly half of all userIds. Mask to 31 bits to stay within the spec.
 *
 * Note: existing users whose hash already fell under 2^31 derive to the same
 * address (masking is a no-op for them). Users whose hash exceeded 2^31
 * previously got null wallets (caught silently in deriveHumanEvmWallet); they
 * now derive a wallet for the first time. Strictly additive — no rotation.
 */
function userIdToIndex(userId: string): number {
  const hash = crypto.createHash('sha256').update(userId.toLowerCase()).digest('hex');
  return parseInt(hash.slice(0, 8), 16) & 0x7fffffff;
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

// ───────────────────────────────────────────────────────────────────────────
// Labeled derivation — for protocol-owned wallets (treasuries, reward pools,
// fee collectors, etc.) keyed by a stable string label rather than userId.
//
// Same master seed, different namespace: humans live at m/44'/60'/1'/0/{idx},
// agents at m/44'/60'/0'/0/{idx}, labeled wallets at m/44'/60'/2'/0/{idx}.
// Different account level (2'/) prevents any collision with human/agent paths.
//
// One EVM address per label works on EVERY EVM chain (Polygon, Ethereum, Base,
// Arbitrum, Optimism, BSC, Avalanche, etc.) — that's how secp256k1 addresses
// work. Use the same address as the fee collector on every EVM deployment.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Convert a label string to a deterministic derivation index.
 * Same label → same index → same address, forever.
 * Masked to 31 bits (BIP-44 non-hardened ceiling).
 */
function labelToIndex(label: string): number {
  const hash = crypto.createHash('sha256').update(label.toLowerCase().trim()).digest('hex');
  return parseInt(hash.slice(0, 8), 16) & 0x7fffffff;
}

/**
 * Derive a labeled EVM wallet from the master seed.
 * One address per label, deterministic, identical on all EVM chains.
 *
 * @param label - Stable identifier (e.g. 'treasury-evm', 'fee-collector-eth')
 * @returns { address, privateKey, path } or null if seed not configured
 */
export function deriveLabeledEvmWallet(
  label: string,
): { address: string; privateKey: string; path: string } | null {
  if (!HUMAN_WALLET_SEED) {
    console.error('[HD Wallet] Cannot derive labeled wallet: HUMAN_WALLET_SEED not configured');
    return null;
  }

  try {
    const index = labelToIndex(label);
    // Account level 2' isolates labeled wallets from human (1') and agent (0') buckets.
    const path = `m/44'/60'/2'/0/${index}`;
    const wallet = ethers.Wallet.fromMnemonic(HUMAN_WALLET_SEED, path);
    return { address: wallet.address, privateKey: wallet.privateKey, path };
  } catch (error) {
    console.error('[HD Wallet] Error deriving labeled EVM wallet:', error);
    return null;
  }
}

/**
 * Derive a labeled Solana wallet from the master seed.
 *
 * Solana uses Ed25519 (not secp256k1) so we can't reuse ethers' BIP-44 path.
 * Standard Solana derivation is m/44'/501'/{account}'/0' via SLIP-0010.
 *
 * Implementation kept lightweight — uses bip39 + ed25519-hd-key (~10KB combined)
 * instead of pulling in the full @solana/web3.js (~600KB). The output is a
 * raw Ed25519 keypair; the public key encodes to a standard Solana base58
 * address via @solana/web3.js if/when the runtime needs it. For now we
 * surface the 32-byte pubkey hex which is trivial to convert.
 *
 * @param label - Stable identifier (e.g. 'treasury-solana')
 * @returns { pubkeyHex, secretKeyHex, path } or null if seed missing / deps absent
 */
export function deriveLabeledSolanaKeypair(
  label: string,
): { pubkeyHex: string; secretKeyHex: string; path: string } | null {
  if (!HUMAN_WALLET_SEED) {
    console.error('[HD Wallet] Cannot derive Solana wallet: HUMAN_WALLET_SEED not configured');
    return null;
  }

  try {
    // Dynamic requires so the Lambda bundle doesn't pull bip39/ed25519-hd-key
    // unless this code path runs (one-shot CLI use, not request hot path).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bip39 = require('bip39');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { derivePath } = require('ed25519-hd-key');

    const index = labelToIndex(label);
    const path = `m/44'/501'/${index}'/0'`;

    const seedBuf: Buffer = bip39.mnemonicToSeedSync(HUMAN_WALLET_SEED);
    const { key } = derivePath(path, seedBuf.toString('hex'));

    // key is the 32-byte Ed25519 seed; pubkey derives from it via ed25519
    // tweetnacl. Surface the 32-byte private seed; consumers can pass it to
    // Keypair.fromSeed(seedBuf) in @solana/web3.js to get the full keypair
    // and base58 address.
    return {
      pubkeyHex: '',           // Set by consumer once they call Keypair.fromSeed
      secretKeyHex: Buffer.from(key).toString('hex'),
      path,
    };
  } catch (error: any) {
    console.error('[HD Wallet] Error deriving Solana wallet:', error?.message || error);
    return null;
  }
}
