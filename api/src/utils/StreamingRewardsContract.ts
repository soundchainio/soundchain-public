/**
 * StreamingRewardsContract Utility
 *
 * Interacts with the StreamingRewardsDistributor contract for OGUN payouts.
 * Contract: 0xcf9416c49D525f7a50299c71f33606A158F28546 (Polygon Mainnet)
 */

import { ethers } from 'ethers';

// StreamingRewardsDistributor ABI (minimal interface for distribution)
const STREAMING_REWARDS_ABI = [
  // Distribution functions
  'function submitReward(address user, string scid, uint256 amount, bool isNft) external',
  'function submitRewardAndStake(address user, string scid, uint256 amount, bool isNft) external',
  'function batchSubmitRewards(address[] users, string[] scids, uint256[] amounts, bool[] isNfts) external',
  'function submitRewardWithListenerSplit(address creator, address listener, string scid, uint256 totalAmount, bool isNft) external',

  // View functions
  'function getClaimedByScid(string scid) view returns (uint256)',
  'function getDailyRemaining(string scid) view returns (uint256)',
  'function getAvailableBalance() view returns (uint256)',
  'function claimedByWallet(address wallet) view returns (uint256)',
  'function totalRewardsDistributed() view returns (uint256)',
  'function isAuthorizedDistributor(address distributor) view returns (bool)',

  // Constants
  'function NFT_REWARD_RATE() view returns (uint256)',
  'function BASE_REWARD_RATE() view returns (uint256)',
  'function MAX_DAILY_REWARDS() view returns (uint256)',

  // Events
  'event RewardsClaimed(address indexed user, uint256 amount, bytes32 indexed scidHash)',
  'event RewardsStaked(address indexed user, uint256 amount, bytes32 indexed scidHash)',
];

// Contract address on Polygon Mainnet
const STREAMING_REWARDS_ADDRESS = '0xcf9416c49D525f7a50299c71f33606A158F28546';

// RPC URL
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL ||
  `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

export interface DistributionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export interface ContractStats {
  availableBalance: string;
  totalDistributed: string;
  nftRewardRate: string;
  baseRewardRate: string;
  maxDailyRewards: string;
}

/**
 * StreamingRewardsContract class for distributing OGUN rewards
 */
export class StreamingRewardsContract {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;
  private wallet: ethers.Wallet | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
  }

  /**
   * Initialize contract with signer for write operations
   */
  initWithSigner(privateKey: string): void {
    if (!privateKey) {
      console.error('[StreamingRewardsContract] No private key provided');
      return;
    }

    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(
        STREAMING_REWARDS_ADDRESS,
        STREAMING_REWARDS_ABI,
        this.wallet
      );
      this.isInitialized = true;
      console.log('[StreamingRewardsContract] Initialized with signer:', this.wallet.address);
    } catch (error: any) {
      console.error('[StreamingRewardsContract] Failed to initialize:', error.message);
    }
  }

  /**
   * Get read-only contract instance
   */
  getReadOnlyContract(): ethers.Contract {
    return new ethers.Contract(
      STREAMING_REWARDS_ADDRESS,
      STREAMING_REWARDS_ABI,
      this.provider
    );
  }

  /**
   * Check if contract is initialized for writes
   */
  isReady(): boolean {
    return this.isInitialized && !!this.contract && !!this.wallet;
  }

  /**
   * Submit a single reward distribution
   */
  async submitReward(
    userWallet: string,
    scid: string,
    amount: number, // In OGUN (will be converted to wei)
    isNft: boolean
  ): Promise<DistributionResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Contract not initialized. Call initWithSigner first.',
      };
    }

    try {
      // Convert OGUN amount to wei (18 decimals)
      const amountWei = ethers.utils.parseEther(amount.toString());

      console.log(`[StreamingRewardsContract] Submitting reward: ${amount} OGUN to ${userWallet} for ${scid}`);

      const tx = await this.contract!.submitReward(
        userWallet,
        scid,
        amountWei,
        isNft,
        {
          gasLimit: 200000, // Set reasonable gas limit
        }
      );

      console.log(`[StreamingRewardsContract] Tx submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait(1);

      console.log(`[StreamingRewardsContract] Tx confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      console.error('[StreamingRewardsContract] submitReward failed:', error.message);
      return {
        success: false,
        error: error.reason || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Submit reward and stake directly
   */
  async submitRewardAndStake(
    userWallet: string,
    scid: string,
    amount: number,
    isNft: boolean
  ): Promise<DistributionResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Contract not initialized',
      };
    }

    try {
      const amountWei = ethers.utils.parseEther(amount.toString());

      const tx = await this.contract!.submitRewardAndStake(
        userWallet,
        scid,
        amountWei,
        isNft,
        { gasLimit: 300000 }
      );

      const receipt = await tx.wait(1);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      console.error('[StreamingRewardsContract] submitRewardAndStake failed:', error.message);
      return {
        success: false,
        error: error.reason || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Submit batch rewards (more gas efficient for multiple claims)
   */
  async batchSubmitRewards(
    users: string[],
    scids: string[],
    amounts: number[],
    isNfts: boolean[]
  ): Promise<DistributionResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Contract not initialized',
      };
    }

    if (users.length === 0 || users.length > 100) {
      return {
        success: false,
        error: 'Batch size must be between 1 and 100',
      };
    }

    try {
      const amountsWei = amounts.map(a => ethers.utils.parseEther(a.toString()));

      console.log(`[StreamingRewardsContract] Batch submitting ${users.length} rewards`);

      const tx = await this.contract!.batchSubmitRewards(
        users,
        scids,
        amountsWei,
        isNfts,
        { gasLimit: 50000 + (users.length * 80000) } // Base + per-item gas
      );

      const receipt = await tx.wait(1);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      console.error('[StreamingRewardsContract] batchSubmitRewards failed:', error.message);
      return {
        success: false,
        error: error.reason || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get contract stats
   */
  async getStats(): Promise<ContractStats | null> {
    try {
      const contract = this.getReadOnlyContract();

      const [availableBalance, totalDistributed, nftRate, baseRate, maxDaily] = await Promise.all([
        contract.getAvailableBalance(),
        contract.totalRewardsDistributed(),
        contract.NFT_REWARD_RATE(),
        contract.BASE_REWARD_RATE(),
        contract.MAX_DAILY_REWARDS(),
      ]);

      return {
        availableBalance: ethers.utils.formatEther(availableBalance),
        totalDistributed: ethers.utils.formatEther(totalDistributed),
        nftRewardRate: ethers.utils.formatEther(nftRate),
        baseRewardRate: ethers.utils.formatEther(baseRate),
        maxDailyRewards: ethers.utils.formatEther(maxDaily),
      };
    } catch (error: any) {
      console.error('[StreamingRewardsContract] getStats failed:', error.message);
      return null;
    }
  }

  /**
   * Get available balance in contract
   */
  async getAvailableBalance(): Promise<string> {
    try {
      const contract = this.getReadOnlyContract();
      const balance = await contract.getAvailableBalance();
      return ethers.utils.formatEther(balance);
    } catch (error: any) {
      console.error('[StreamingRewardsContract] getAvailableBalance failed:', error.message);
      return '0';
    }
  }

  /**
   * Get daily remaining for an SCID
   */
  async getDailyRemaining(scid: string): Promise<string> {
    try {
      const contract = this.getReadOnlyContract();
      const remaining = await contract.getDailyRemaining(scid);
      return ethers.utils.formatEther(remaining);
    } catch (error: any) {
      console.error('[StreamingRewardsContract] getDailyRemaining failed:', error.message);
      return '100'; // Default max
    }
  }

  /**
   * Get total rewards claimed by a wallet
   */
  async getWalletRewards(wallet: string): Promise<string> {
    try {
      const contract = this.getReadOnlyContract();
      const rewards = await contract.claimedByWallet(wallet);
      return ethers.utils.formatEther(rewards);
    } catch (error: any) {
      console.error('[StreamingRewardsContract] getWalletRewards failed:', error.message);
      return '0';
    }
  }

  /**
   * Check if an address is authorized distributor
   */
  async isAuthorized(address: string): Promise<boolean> {
    try {
      const contract = this.getReadOnlyContract();
      return await contract.isAuthorizedDistributor(address);
    } catch (error: any) {
      console.error('[StreamingRewardsContract] isAuthorized failed:', error.message);
      return false;
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return STREAMING_REWARDS_ADDRESS;
  }

  /**
   * Get signer address
   */
  getSignerAddress(): string | null {
    return this.wallet?.address || null;
  }
}

// Singleton instance
let streamingRewardsInstance: StreamingRewardsContract | null = null;

/**
 * Get or create StreamingRewardsContract instance
 */
export function getStreamingRewardsContract(): StreamingRewardsContract {
  if (!streamingRewardsInstance) {
    streamingRewardsInstance = new StreamingRewardsContract();

    // Initialize with wallet if available
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (privateKey) {
      streamingRewardsInstance.initWithSigner(privateKey);
    }
  }
  return streamingRewardsInstance;
}

export default StreamingRewardsContract;
