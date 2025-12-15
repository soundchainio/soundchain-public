/**
 * SCid (SoundChain ID) Generator
 *
 * Web3 replacement for ISRC (International Standard Recording Code)
 * Used by DSPs to uniquely identify recordings.
 *
 * Format: SC-[CHAIN]-[ARTIST_HASH]-[YEAR][SEQUENCE]
 * Example: SC-POL-7B3A-24-00001
 *
 * Components:
 * - SC: SoundChain prefix (constant)
 * - CHAIN: 3-letter blockchain code (POL, ZET, ETH, etc.)
 * - ARTIST_HASH: 4-char hash derived from artist wallet/profile
 * - YEAR: 2-digit year
 * - SEQUENCE: 5-digit zero-padded sequence number
 *
 * Total length: 21 characters (SC-POL-7B3A-24-00001)
 */

import crypto from 'crypto';

// Supported blockchain codes
export enum ChainCode {
  POLYGON = 'POL',
  ZETACHAIN = 'ZET',
  ETHEREUM = 'ETH',
  BASE = 'BAS',
  SOLANA = 'SOL',
  BINANCE = 'BNB',
  AVALANCHE = 'AVA',
  ARBITRUM = 'ARB',
}

// Chain ID to code mapping
export const CHAIN_ID_MAP: Record<number, ChainCode> = {
  137: ChainCode.POLYGON,      // Polygon Mainnet
  80001: ChainCode.POLYGON,    // Polygon Mumbai (testnet)
  7000: ChainCode.ZETACHAIN,   // ZetaChain Mainnet
  7001: ChainCode.ZETACHAIN,   // ZetaChain Testnet
  1: ChainCode.ETHEREUM,       // Ethereum Mainnet
  8453: ChainCode.BASE,        // Base Mainnet
  101: ChainCode.SOLANA,       // Solana (placeholder)
  56: ChainCode.BINANCE,       // BSC Mainnet
  43114: ChainCode.AVALANCHE,  // Avalanche C-Chain
  42161: ChainCode.ARBITRUM,   // Arbitrum One
};

export interface SCidComponents {
  prefix: 'SC';
  chainCode: ChainCode;
  artistHash: string;
  year: string;
  sequence: string;
}

export interface SCidGeneratorOptions {
  chainId?: number;
  chainCode?: ChainCode;
  artistIdentifier: string; // Wallet address or profile ID
  sequenceNumber: number;
  year?: number;
}

export interface SCidValidationResult {
  valid: boolean;
  components?: SCidComponents;
  error?: string;
}

/**
 * SCid Generator Class
 * Generates and validates SoundChain IDs for tracks
 */
export class SCidGenerator {
  private static readonly PREFIX = 'SC';
  private static readonly SEPARATOR = '-';
  private static readonly ARTIST_HASH_LENGTH = 4;
  private static readonly SEQUENCE_LENGTH = 5;
  private static readonly MAX_SEQUENCE = 99999;

  /**
   * Generate a new SCid
   */
  static generate(options: SCidGeneratorOptions): string {
    const { chainId, chainCode, artistIdentifier, sequenceNumber, year } = options;

    // Determine chain code
    let chain: ChainCode;
    if (chainCode) {
      chain = chainCode;
    } else if (chainId && CHAIN_ID_MAP[chainId]) {
      chain = CHAIN_ID_MAP[chainId];
    } else {
      chain = ChainCode.POLYGON; // Default to Polygon
    }

    // Generate artist hash (4 uppercase hex chars)
    const artistHash = this.generateArtistHash(artistIdentifier);

    // Get year (2 digits)
    const yearStr = this.formatYear(year);

    // Format sequence (5 digits, zero-padded)
    const sequence = this.formatSequence(sequenceNumber);

    // Construct SCid
    return [
      this.PREFIX,
      chain,
      artistHash,
      yearStr + sequence,
    ].join(this.SEPARATOR);
  }

  /**
   * Generate artist hash from wallet address or profile ID
   */
  static generateArtistHash(identifier: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(identifier.toLowerCase())
      .digest('hex');

    return hash.substring(0, this.ARTIST_HASH_LENGTH).toUpperCase();
  }

  /**
   * Format year as 2 digits
   */
  static formatYear(year?: number): string {
    const y = year || new Date().getFullYear();
    return String(y).slice(-2);
  }

  /**
   * Format sequence number with zero-padding
   */
  static formatSequence(sequence: number): string {
    if (sequence < 0 || sequence > this.MAX_SEQUENCE) {
      throw new Error(`Sequence must be between 0 and ${this.MAX_SEQUENCE}`);
    }
    return String(sequence).padStart(this.SEQUENCE_LENGTH, '0');
  }

  /**
   * Parse an SCid into its components
   */
  static parse(scid: string): SCidValidationResult {
    if (!scid || typeof scid !== 'string') {
      return { valid: false, error: 'SCid must be a non-empty string' };
    }

    // Expected format: SC-POL-7B3A-2400001
    const regex = /^(SC)-([A-Z]{3})-([A-F0-9]{4})-(\d{2})(\d{5})$/;
    const match = scid.toUpperCase().match(regex);

    if (!match) {
      return { valid: false, error: 'Invalid SCid format' };
    }

    const [, prefix, chainCode, artistHash, year, sequence] = match;

    // Validate chain code
    if (!Object.values(ChainCode).includes(chainCode as ChainCode)) {
      return { valid: false, error: `Unknown chain code: ${chainCode}` };
    }

    return {
      valid: true,
      components: {
        prefix: prefix as 'SC',
        chainCode: chainCode as ChainCode,
        artistHash,
        year,
        sequence,
      },
    };
  }

  /**
   * Validate an SCid
   */
  static validate(scid: string): boolean {
    return this.parse(scid).valid;
  }

  /**
   * Get the chain code from an SCid
   */
  static getChainCode(scid: string): ChainCode | null {
    const result = this.parse(scid);
    return result.valid ? result.components!.chainCode : null;
  }

  /**
   * Get the artist hash from an SCid
   */
  static getArtistHash(scid: string): string | null {
    const result = this.parse(scid);
    return result.valid ? result.components!.artistHash : null;
  }

  /**
   * Check if two SCids belong to the same artist
   */
  static sameArtist(scid1: string, scid2: string): boolean {
    const hash1 = this.getArtistHash(scid1);
    const hash2 = this.getArtistHash(scid2);
    return hash1 !== null && hash1 === hash2;
  }

  /**
   * Generate a batch of SCids for an artist
   */
  static generateBatch(
    artistIdentifier: string,
    count: number,
    startSequence: number,
    options?: { chainId?: number; chainCode?: ChainCode; year?: number }
  ): string[] {
    const scids: string[] = [];

    for (let i = 0; i < count; i++) {
      scids.push(this.generate({
        artistIdentifier,
        sequenceNumber: startSequence + i,
        ...options,
      }));
    }

    return scids;
  }

  /**
   * Get next sequence number for an artist (to be used with database query)
   * Returns the expected next sequence based on existing SCids
   */
  static getNextSequenceFromScids(scids: string[], artistHash: string): number {
    let maxSequence = 0;

    for (const scid of scids) {
      const result = this.parse(scid);
      if (result.valid && result.components!.artistHash === artistHash) {
        const seq = parseInt(result.components!.sequence, 10);
        if (seq > maxSequence) {
          maxSequence = seq;
        }
      }
    }

    return maxSequence + 1;
  }

  /**
   * Format SCid for display (with visual separators)
   */
  static formatForDisplay(scid: string): string {
    const result = this.parse(scid);
    if (!result.valid) return scid;

    const { chainCode, artistHash, year, sequence } = result.components!;
    return `SC-${chainCode}-${artistHash}-${year}-${sequence}`;
  }

  /**
   * Generate a checksum for an SCid (for verification)
   */
  static generateChecksum(scid: string): string {
    return crypto
      .createHash('md5')
      .update(scid)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();
  }

  /**
   * Create SCid with checksum suffix
   * Format: SC-POL-7B3A-2400001-ABCD
   */
  static generateWithChecksum(options: SCidGeneratorOptions): string {
    const scid = this.generate(options);
    const checksum = this.generateChecksum(scid);
    return `${scid}-${checksum}`;
  }
}

// Export default instance methods for convenience
export const generateSCid = SCidGenerator.generate.bind(SCidGenerator);
export const parseSCid = SCidGenerator.parse.bind(SCidGenerator);
export const validateSCid = SCidGenerator.validate.bind(SCidGenerator);

export default SCidGenerator;
