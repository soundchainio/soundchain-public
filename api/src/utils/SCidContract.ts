/**
 * SCidContract Utility
 *
 * Interacts with the on-chain SCidRegistry contract for registration and verification.
 */

import { ethers } from 'ethers';

// SCidRegistry ABI (minimal interface for registration)
const SCID_REGISTRY_ABI = [
  // Registration functions
  'function register(string scid, address owner, uint256 tokenId, address nftContract, string metadataHash) payable returns (bytes32)',
  'function registerBatch(string[] scids, address[] owners, uint256[] tokenIds, address[] nftContracts, string[] metadataHashes) payable',

  // View functions
  'function isRegistered(bytes32 scidHash) view returns (bool)',
  'function isRegisteredByString(string scid) view returns (bool)',
  'function getScidByString(string scid) view returns (tuple(string scid, address owner, uint256 tokenId, address nftContract, string metadataHash, uint8 chainCode, bytes4 artistHash, uint16 year, uint32 sequence, uint64 registeredAt, bool active))',
  'function verifyOwnership(bytes32 scidHash, address claimedOwner) view returns (bool)',
  'function getScidHash(string scid) pure returns (bytes32)',
  'function totalRegistrations() view returns (uint256)',
  'function registrationFee() view returns (uint256)',

  // Events
  'event SCidRegistered(bytes32 indexed scidHash, string scid, address indexed owner, uint256 indexed tokenId, address nftContract, string metadataHash)',
];

// Contract addresses per chain
const SCID_REGISTRY_ADDRESSES: Record<number, string> = {
  137: '', // Polygon - to be set after deployment
  80002: '', // Polygon Amoy testnet
  7000: '', // ZetaChain
  8453: '', // Base
  1: '', // Ethereum
  42161: '', // Arbitrum
};

// RPC URLs per chain
const RPC_URLS: Record<number, string> = {
  137: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  80002: 'https://rpc-amoy.polygon.technology',
  7000: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
  8453: 'https://mainnet.base.org',
  1: 'https://eth.llamarpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
};

export interface OnChainRegistrationResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  scidHash?: string;
  error?: string;
}

export interface SCidOnChainRecord {
  scid: string;
  owner: string;
  tokenId: number;
  nftContract: string;
  metadataHash: string;
  chainCode: number;
  artistHash: string;
  year: number;
  sequence: number;
  registeredAt: number;
  active: boolean;
}

/**
 * SCidContract class for interacting with on-chain SCidRegistry
 */
export class SCidContract {
  private chainId: number;
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;
  private wallet: ethers.Wallet | null = null;

  constructor(chainId: number = 137) {
    this.chainId = chainId;
    const rpcUrl = RPC_URLS[chainId];
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`);
    }
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Initialize contract with signer for write operations
   */
  initWithSigner(privateKey: string): void {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    const contractAddress = SCID_REGISTRY_ADDRESSES[this.chainId];
    if (contractAddress) {
      this.contract = new ethers.Contract(contractAddress, SCID_REGISTRY_ABI, this.wallet);
    }
  }

  /**
   * Get read-only contract instance
   */
  getReadOnlyContract(): ethers.Contract | null {
    const contractAddress = SCID_REGISTRY_ADDRESSES[this.chainId];
    if (!contractAddress) return null;
    return new ethers.Contract(contractAddress, SCID_REGISTRY_ABI, this.provider);
  }

  /**
   * Check if contract is deployed and configured
   */
  isConfigured(): boolean {
    return !!SCID_REGISTRY_ADDRESSES[this.chainId];
  }

  /**
   * Register SCid on-chain
   */
  async register(
    scid: string,
    ownerAddress: string,
    tokenId: number,
    nftContract: string,
    metadataHash: string
  ): Promise<OnChainRegistrationResult> {
    if (!this.contract || !this.wallet) {
      return {
        success: false,
        error: 'Contract not initialized with signer. Call initWithSigner first.',
      };
    }

    try {
      // Get registration fee
      const fee = await this.contract.registrationFee();

      // Register on-chain
      const tx = await this.contract.register(
        scid,
        ownerAddress,
        tokenId,
        nftContract,
        metadataHash,
        { value: fee }
      );

      console.log(`[SCidContract] Registration tx submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait(1);

      // Extract scidHash from event
      const event = receipt.events?.find((e: any) => e.event === 'SCidRegistered');
      const scidHash = event?.args?.scidHash;

      console.log(`[SCidContract] Registration confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        scidHash: scidHash,
      };
    } catch (error: any) {
      console.error('[SCidContract] Registration failed:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Register multiple SCids in batch
   */
  async registerBatch(
    scids: string[],
    owners: string[],
    tokenIds: number[],
    nftContracts: string[],
    metadataHashes: string[]
  ): Promise<OnChainRegistrationResult> {
    if (!this.contract || !this.wallet) {
      return {
        success: false,
        error: 'Contract not initialized with signer',
      };
    }

    try {
      // Get registration fee per item
      const feePerItem = await this.contract.registrationFee();
      const totalFee = feePerItem.mul(scids.length);

      const tx = await this.contract.registerBatch(
        scids,
        owners,
        tokenIds,
        nftContracts,
        metadataHashes,
        { value: totalFee }
      );

      const receipt = await tx.wait(1);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('[SCidContract] Batch registration failed:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Check if SCid is registered on-chain
   */
  async isRegistered(scid: string): Promise<boolean> {
    const contract = this.getReadOnlyContract();
    if (!contract) return false;

    try {
      return await contract.isRegisteredByString(scid);
    } catch {
      return false;
    }
  }

  /**
   * Get on-chain SCid record
   */
  async getRecord(scid: string): Promise<SCidOnChainRecord | null> {
    const contract = this.getReadOnlyContract();
    if (!contract) return null;

    try {
      const record = await contract.getScidByString(scid);
      if (!record.active) return null;

      return {
        scid: record.scid,
        owner: record.owner,
        tokenId: record.tokenId.toNumber(),
        nftContract: record.nftContract,
        metadataHash: record.metadataHash,
        chainCode: record.chainCode,
        artistHash: ethers.utils.parseBytes32String(record.artistHash),
        year: record.year,
        sequence: record.sequence,
        registeredAt: record.registeredAt.toNumber(),
        active: record.active,
      };
    } catch {
      return null;
    }
  }

  /**
   * Verify ownership on-chain
   */
  async verifyOwnership(scid: string, claimedOwner: string): Promise<boolean> {
    const contract = this.getReadOnlyContract();
    if (!contract) return false;

    try {
      const scidHash = await contract.getScidHash(scid);
      return await contract.verifyOwnership(scidHash, claimedOwner);
    } catch {
      return false;
    }
  }

  /**
   * Get total registrations on-chain
   */
  async getTotalRegistrations(): Promise<number> {
    const contract = this.getReadOnlyContract();
    if (!contract) return 0;

    try {
      const total = await contract.totalRegistrations();
      return total.toNumber();
    } catch {
      return 0;
    }
  }

  /**
   * Set contract address for a chain (admin utility)
   */
  static setContractAddress(chainId: number, address: string): void {
    SCID_REGISTRY_ADDRESSES[chainId] = address;
  }

  /**
   * Get contract address for current chain
   */
  getContractAddress(): string | undefined {
    return SCID_REGISTRY_ADDRESSES[this.chainId];
  }
}

export default SCidContract;
