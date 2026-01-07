/**
 * SCid Service
 *
 * Handles SCid generation, registration, and OGUN streaming rewards.
 */

import mongoose from 'mongoose';
import { SCid, SCidModel, SCidStatus, SCidTransfer } from '../models/SCid';
import { SCidGenerator, ChainCode, CHAIN_ID_MAP } from '../utils/SCidGenerator';
import { SCidContract, OnChainRegistrationResult } from '../utils/SCidContract';
import { getStreamingRewardsContract } from '../utils/StreamingRewardsContract';
import { Context } from '../types/Context';
import { Service } from './Service';

// OGUN rewards configuration - WIN-WIN model (creators AND listeners earn!)
const OGUN_REWARDS_CONFIG = {
  // NFT mints (on-chain with tokenId) get premium rate
  nftRewardPerStream: 0.5,          // 0.5 OGUN per stream for NFT mints
  // Non-NFT mints (off-chain, no tokenId) get base rate
  baseRewardPerStream: 0.05,        // 0.05 OGUN per stream for non-NFT mints
  bonusMultiplier: 1.5,             // Bonus for verified artists
  maxDailyRewards: 100,             // Max 100 OGUN per track per day (anti-bot farming)
  minStreamDuration: 30,            // Minimum 30 seconds to count as valid stream

  // WIN-WIN SPLITS - Everyone earns!
  creatorSplit: 0.7,                // 70% to creator/collaborators
  listenerSplit: 0.3,               // 30% to listener
  listenerMaxDaily: 50,             // Listeners can earn max 50 OGUN per day
};

export interface RegisterSCidInput {
  trackId: string;
  profileId: string;
  walletAddress?: string;
  chainId?: number;
  chainCode?: ChainCode;
  metadataHash?: string;
}

export interface LogStreamInput {
  scid: string;
  listenerProfileId?: string;
  listenerWallet?: string;
  duration: number; // Stream duration in seconds
  timestamp?: Date;
}

// WIN-WIN Result - both parties earn!
export interface WinWinRewardResult {
  success: boolean;
  totalStreams: number;
  // Creator rewards
  creatorReward: number;
  creatorWallet?: string;
  creatorProfileId?: string;
  // Listener rewards (WIN-WIN!)
  listenerReward: number;
  listenerWallet?: string;
  listenerProfileId?: string;
  // Collaborator rewards (from NFT metadata)
  collaboratorRewards?: Array<{
    wallet: string;
    amount: number;
    role?: string;
  }>;
  // Daily limits
  creatorDailyLimitReached?: boolean;
  listenerDailyLimitReached?: boolean;
  // Track info for notifications
  trackTitle?: string;
  trackId?: string;
}

export interface ClaimStreamingRewardsInput {
  profileId: string;
  walletAddress: string;
  stakeDirectly?: boolean; // If true, stake instead of claim to wallet
}

export interface SCidStats {
  totalScids: number;
  totalStreams: number;
  totalOgunRewarded: number;
  scidsByChain: Record<ChainCode, number>;
  topStreamedTracks: Array<{ scid: string; trackId: string; streamCount: number }>;
}

export class SCidService extends Service {
  constructor(context: Context) {
    super(context);
  }

  /**
   * Get next sequence number for an artist
   */
  async getNextSequence(profileId: string): Promise<number> {
    const artistHash = SCidGenerator.generateArtistHash(profileId);
    const year = SCidGenerator.formatYear();

    // Find the highest sequence for this artist in current year
    const latestScid = await SCidModel.findOne({
      artistHash,
      year,
    }).sort({ sequence: -1 }).lean();

    return latestScid ? latestScid.sequence + 1 : 1;
  }

  /**
   * Register a new SCid for a track
   */
  async register(input: RegisterSCidInput): Promise<SCid> {
    const { trackId, profileId, walletAddress, chainId, chainCode, metadataHash } = input;

    // Check if track already has an SCid
    const existing = await SCidModel.findOne({ trackId }).lean();
    if (existing) {
      throw new Error(`Track ${trackId} already has SCid: ${existing.scid}`);
    }

    // Get next sequence number for artist
    const sequence = await this.getNextSequence(profileId);
    const artistHash = SCidGenerator.generateArtistHash(profileId);
    const year = SCidGenerator.formatYear();

    // Determine chain code
    let chain: ChainCode;
    if (chainCode) {
      chain = chainCode;
    } else if (chainId && CHAIN_ID_MAP[chainId]) {
      chain = CHAIN_ID_MAP[chainId];
    } else {
      chain = ChainCode.POLYGON; // Default
    }

    // Generate SCid
    const scid = SCidGenerator.generate({
      artistIdentifier: profileId,
      sequenceNumber: sequence,
      chainCode: chain,
    });

    // Generate checksum
    const checksum = SCidGenerator.generateChecksum(scid);

    // Create SCid record
    const scidRecord = new SCidModel({
      scid,
      trackId,
      profileId,
      walletAddress,
      chainCode: chain,
      chainId: chainId || 137, // Default to Polygon
      artistHash,
      year,
      sequence,
      status: SCidStatus.PENDING,
      metadataHash,
      checksum,
      streamCount: 0,
      ogunRewardsEarned: 0,
      transferHistory: [],
    });
    await scidRecord.save();

    return scidRecord;
  }

  /**
   * Get SCid by track ID
   */
  async getByTrackId(trackId: string): Promise<SCid | null> {
    return SCidModel.findOne({ trackId }).lean();
  }

  /**
   * Get SCid by code
   */
  async getBySCid(scid: string): Promise<SCid | null> {
    return SCidModel.findOne({ scid: scid.toUpperCase() }).lean();
  }

  /**
   * Get all SCids for a profile (artist)
   */
  async getByProfileId(profileId: string): Promise<SCid[]> {
    return SCidModel.find({ profileId }).sort({ createdAt: -1 }).lean() as unknown as SCid[];
  }

  /**
   * Mark SCid as registered on-chain
   */
  async markRegistered(
    scid: string,
    transactionHash: string,
    blockNumber: number,
    contractAddress: string
  ): Promise<SCid | null> {
    return SCidModel.findOneAndUpdate(
      { scid: scid.toUpperCase() },
      {
        status: SCidStatus.REGISTERED,
        transactionHash,
        blockNumber,
        contractAddress,
        registeredAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  /**
   * Register SCid on-chain via smart contract
   * This is the main method for on-chain registration after off-chain creation
   */
  async registerOnChain(
    scidCode: string,
    ownerWallet: string,
    tokenId: number,
    nftContract: string,
    metadataHash?: string,
    chainId: number = 137
  ): Promise<OnChainRegistrationResult & { scid?: SCid }> {
    // Get the SCid record
    const scidRecord = await this.getBySCid(scidCode);
    if (!scidRecord) {
      return { success: false, error: `SCid not found: ${scidCode}` };
    }

    // Check if already registered
    if (scidRecord.status === SCidStatus.REGISTERED) {
      return {
        success: false,
        error: `SCid already registered on-chain: ${scidRecord.transactionHash}`,
      };
    }

    // Check if contract is configured for this chain
    const scidContract = new SCidContract(chainId);
    if (!scidContract.isConfigured()) {
      console.warn(`[SCidService] SCidRegistry not deployed on chain ${chainId}. Skipping on-chain registration.`);
      return {
        success: false,
        error: `SCidRegistry not deployed on chain ${chainId}`,
      };
    }

    // Initialize with signer
    const privateKey = process.env.SCID_REGISTRY_SIGNER_KEY;
    if (!privateKey) {
      console.warn('[SCidService] SCID_REGISTRY_SIGNER_KEY not set. Skipping on-chain registration.');
      return {
        success: false,
        error: 'On-chain registration signer not configured',
      };
    }

    scidContract.initWithSigner(privateKey);

    // Register on-chain
    const result = await scidContract.register(
      scidCode,
      ownerWallet,
      tokenId,
      nftContract,
      metadataHash || scidRecord.metadataHash || ''
    );

    if (result.success && result.transactionHash && result.blockNumber) {
      // Update database record
      const contractAddress = scidContract.getContractAddress();
      const updatedScid = await this.markRegistered(
        scidCode,
        result.transactionHash,
        result.blockNumber,
        contractAddress || ''
      );

      console.log(`[SCidService] SCid ${scidCode} registered on-chain: ${result.transactionHash}`);

      return {
        ...result,
        scid: updatedScid || undefined,
      };
    }

    return result;
  }

  /**
   * Verify SCid ownership on-chain
   */
  async verifyOnChainOwnership(scidCode: string, claimedOwner: string, chainId: number = 137): Promise<boolean> {
    const scidContract = new SCidContract(chainId);
    if (!scidContract.isConfigured()) return false;
    return scidContract.verifyOwnership(scidCode, claimedOwner);
  }

  /**
   * Check if SCid is registered on-chain
   */
  async isRegisteredOnChain(scidCode: string, chainId: number = 137): Promise<boolean> {
    const scidContract = new SCidContract(chainId);
    if (!scidContract.isConfigured()) return false;
    return scidContract.isRegistered(scidCode);
  }

  /**
   * Log a stream and calculate OGUN rewards - WIN-WIN MODEL!
   *
   * Both CREATORS and LISTENERS earn OGUN tokens!
   *
   * Tiered rewards:
   * - NFT mints (with tokenId): 0.5 OGUN per stream (split 70/30)
   * - Non-NFT mints: 0.05 OGUN per stream (split 70/30)
   * - Creator: 70% of reward
   * - Listener: 30% of reward
   * - Max 100 OGUN per track per day (creator anti-bot)
   * - Max 50 OGUN per listener per day (listener anti-bot)
   */
  async logStream(input: LogStreamInput): Promise<WinWinRewardResult> {
    const { scid, listenerProfileId, listenerWallet, duration, timestamp = new Date() } = input;

    // Validate minimum stream duration (30 seconds)
    if (duration < OGUN_REWARDS_CONFIG.minStreamDuration) {
      return {
        success: false,
        totalStreams: 0,
        creatorReward: 0,
        listenerReward: 0,
      };
    }

    // Find SCid
    const scidRecord = await SCidModel.findOne({ scid: scid.toUpperCase() });
    if (!scidRecord) {
      throw new Error(`SCid not found: ${scid}`);
    }

    // Check daily limit - get rewards earned today for this track
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Reset daily counter if it's a new day
    if (!scidRecord.lastDailyReset || scidRecord.lastDailyReset < todayStart) {
      scidRecord.dailyOgunEarned = 0;
      scidRecord.lastDailyReset = todayStart;
    }

    const todayCreatorRewards = scidRecord.dailyOgunEarned || 0;
    let creatorDailyLimitReached = todayCreatorRewards >= OGUN_REWARDS_CONFIG.maxDailyRewards;

    // Get the track to check if it's an NFT mint and get metadata
    const track = await this.context.trackService.getTrack(scidRecord.trackId);
    const isNFTMint = track?.nftData?.tokenId != null;
    const trackTitle = track?.title || 'Unknown Track';

    // Calculate base OGUN reward based on mint type
    let baseReward = isNFTMint
      ? OGUN_REWARDS_CONFIG.nftRewardPerStream    // 0.5 OGUN for NFT mints
      : OGUN_REWARDS_CONFIG.baseRewardPerStream;  // 0.05 OGUN for non-NFT mints

    // Check if artist is verified (bonus multiplier - 1.5x)
    const creatorProfile = await this.context.profileService.getProfile(scidRecord.profileId);
    if (creatorProfile?.verified) {
      baseReward *= OGUN_REWARDS_CONFIG.bonusMultiplier;
    }

    // Apply duration bonus (longer streams = more rewards, max 2x for 3+ min)
    const durationBonus = Math.min(duration / 180, 2);
    baseReward *= durationBonus;

    // === WIN-WIN SPLIT ===
    // Creator gets 70%, Listener gets 30%
    let creatorReward = baseReward * OGUN_REWARDS_CONFIG.creatorSplit;
    let listenerReward = baseReward * OGUN_REWARDS_CONFIG.listenerSplit;

    // Cap creator reward to daily limit
    if (!creatorDailyLimitReached) {
      const remainingCreatorDaily = OGUN_REWARDS_CONFIG.maxDailyRewards - todayCreatorRewards;
      creatorReward = Math.min(creatorReward, remainingCreatorDaily);
    } else {
      creatorReward = 0;
    }

    // Check listener daily limit (if listener has a profile)
    let listenerDailyLimitReached = false;
    if (listenerProfileId) {
      // Get listener's daily earnings from their own listenerRewardsEarned counter
      const listenerProfile = await this.context.profileService.getProfile(listenerProfileId);
      const listenerDailyEarned = (listenerProfile as any)?.dailyListenerOgunEarned || 0;

      // Reset listener daily if new day
      const listenerLastReset = (listenerProfile as any)?.listenerDailyReset;
      if (!listenerLastReset || new Date(listenerLastReset) < todayStart) {
        // Reset via update - will be done below
      } else if (listenerDailyEarned >= OGUN_REWARDS_CONFIG.listenerMaxDaily) {
        listenerDailyLimitReached = true;
        listenerReward = 0;
      } else {
        const remainingListenerDaily = OGUN_REWARDS_CONFIG.listenerMaxDaily - listenerDailyEarned;
        listenerReward = Math.min(listenerReward, remainingListenerDaily);
      }
    } else if (!listenerWallet) {
      // Anonymous listener with no wallet - can't earn
      listenerReward = 0;
    }

    // Update SCid record with creator rewards
    scidRecord.streamCount += 1;
    if (creatorReward > 0) {
      scidRecord.ogunRewardsEarned += creatorReward;
      scidRecord.dailyOgunEarned = todayCreatorRewards + creatorReward;
    }
    scidRecord.lastStreamAt = timestamp;
    await scidRecord.save();

    // Get creator wallet
    const creatorWallet = scidRecord.walletAddress || creatorProfile?.magicWalletAddress;

    // Create notification for creator if they earned OGUN
    if (creatorReward > 0 && scidRecord.profileId) {
      try {
        await this.context.notificationService.createOgunEarnedNotification({
          profileId: scidRecord.profileId,
          amount: creatorReward,
          trackTitle,
          trackId: scidRecord.trackId,
          isCreator: true,
          listenerName: listenerProfileId
            ? (await this.context.profileService.getProfile(listenerProfileId))?.displayName
            : 'Anonymous',
        });
      } catch (err) {
        console.warn('[SCidService] Failed to create creator notification:', err);
      }
    }

    // Update listener daily earnings if they have a profile
    if (listenerReward > 0 && listenerProfileId) {
      try {
        // Update listener's daily reward counter
        await this.context.profileService.updateListenerDailyRewards(
          listenerProfileId,
          listenerReward
        );
      } catch (err) {
        console.warn('[SCidService] Failed to update listener daily rewards:', err);
      }
    }

    // Get collaborator wallets from NFT metadata (if any)
    let collaboratorRewards: WinWinRewardResult['collaboratorRewards'] = [];
    if (isNFTMint && track?.nftData) {
      // TODO: Parse NFT metadata for collaborator wallets
      // For now, all creator rewards go to the track owner
      // In future: read royaltyReceivers from contract or metadata
    }

    console.log(`[SCidService] WIN-WIN Stream: Creator=${creatorReward.toFixed(4)} OGUN, Listener=${listenerReward.toFixed(4)} OGUN, Track="${trackTitle}"`);

    return {
      success: true,
      totalStreams: scidRecord.streamCount,
      // Creator info
      creatorReward,
      creatorWallet,
      creatorProfileId: scidRecord.profileId,
      creatorDailyLimitReached,
      // Listener info (WIN-WIN!)
      listenerReward,
      listenerWallet,
      listenerProfileId,
      listenerDailyLimitReached,
      // Collaborators
      collaboratorRewards,
      // Track info
      trackTitle,
      trackId: scidRecord.trackId,
    };
  }

  /**
   * Legacy logStream return type for backward compatibility
   */
  async logStreamLegacy(input: LogStreamInput): Promise<{
    success: boolean;
    ogunReward: number;
    totalStreams: number;
    dailyLimitReached?: boolean;
  }> {
    const result = await this.logStream(input);
    return {
      success: result.success,
      ogunReward: result.creatorReward + result.listenerReward,
      totalStreams: result.totalStreams,
      dailyLimitReached: result.creatorDailyLimitReached,
    };
  }

  /**
   * Transfer SCid ownership
   */
  async transfer(
    scid: string,
    fromProfileId: string,
    toProfileId: string,
    transactionHash?: string,
    reason?: string
  ): Promise<SCid | null> {
    const scidRecord = await SCidModel.findOne({ scid: scid.toUpperCase() });
    if (!scidRecord) {
      throw new Error(`SCid not found: ${scid}`);
    }

    if (scidRecord.profileId !== fromProfileId) {
      throw new Error('Only the current owner can transfer an SCid');
    }

    // Create transfer record
    const transfer: SCidTransfer = {
      fromProfileId,
      toProfileId,
      transactionHash,
      transferredAt: new Date(),
      reason,
    };

    // Update SCid
    scidRecord.previousOwnerId = fromProfileId;
    scidRecord.profileId = toProfileId;
    scidRecord.status = SCidStatus.TRANSFERRED;
    scidRecord.transferHistory.push(transfer);
    await scidRecord.save();

    return scidRecord;
  }

  /**
   * Get SCid statistics
   */
  async getStats(): Promise<SCidStats> {
    const [
      totalScids,
      aggregateResult,
      chainCounts,
      topTracks,
    ] = await Promise.all([
      SCidModel.countDocuments(),
      SCidModel.aggregate([
        {
          $group: {
            _id: null,
            totalStreams: { $sum: '$streamCount' },
            totalOgunRewarded: { $sum: '$ogunRewardsEarned' },
          },
        },
      ]),
      SCidModel.aggregate([
        { $group: { _id: '$chainCode', count: { $sum: 1 } } },
      ]),
      SCidModel.find()
        .sort({ streamCount: -1 })
        .limit(10)
        .select('scid trackId streamCount')
        .lean(),
    ]);

    const stats: SCidStats = {
      totalScids,
      totalStreams: aggregateResult[0]?.totalStreams || 0,
      totalOgunRewarded: aggregateResult[0]?.totalOgunRewarded || 0,
      scidsByChain: {} as Record<ChainCode, number>,
      topStreamedTracks: topTracks.map(t => ({
        scid: t.scid,
        trackId: t.trackId,
        streamCount: t.streamCount,
      })),
    };

    // Build chain counts
    for (const { _id, count } of chainCounts) {
      if (_id) {
        stats.scidsByChain[_id as ChainCode] = count;
      }
    }

    return stats;
  }

  /**
   * Search SCids
   */
  async search(query: {
    profileId?: string;
    chainCode?: ChainCode;
    status?: SCidStatus;
    year?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ scids: SCid[]; total: number }> {
    const filter: any = {};

    if (query.profileId) filter.profileId = query.profileId;
    if (query.chainCode) filter.chainCode = query.chainCode;
    if (query.status) filter.status = query.status;
    if (query.year) filter.year = query.year;

    const [scids, total] = await Promise.all([
      SCidModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset || 0)
        .limit(query.limit || 50)
        .lean() as unknown as SCid[],
      SCidModel.countDocuments(filter),
    ]);

    return { scids, total };
  }

  /**
   * Validate SCid format
   */
  validate(scid: string): { valid: boolean; error?: string } {
    const result = SCidGenerator.parse(scid);
    return { valid: result.valid, error: result.error };
  }

  /**
   * Bulk register SCids for existing tracks
   */
  async bulkRegister(
    trackIds: string[],
    profileId: string,
    chainCode: ChainCode = ChainCode.POLYGON
  ): Promise<{ registered: number; skipped: number; errors: string[] }> {
    let registered = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const trackId of trackIds) {
      try {
        const existing = await SCidModel.findOne({ trackId }).lean();
        if (existing) {
          skipped++;
          continue;
        }

        await this.register({
          trackId,
          profileId,
          chainCode,
        });
        registered++;
      } catch (err: any) {
        errors.push(`Track ${trackId}: ${err.message}`);
      }
    }

    return { registered, skipped, errors };
  }

  /**
   * Claim streaming rewards for a user
   *
   * Marks all unclaimed OGUN as claimed and returns the total.
   * When StreamingRewardsDistributor contract is deployed, this will
   * also trigger on-chain distribution.
   *
   * @param input.profileId - User's profile ID
   * @param input.walletAddress - Wallet address to claim to
   * @param input.stakeDirectly - If true, stake rewards instead of claim
   */
  async claimStreamingRewards(input: ClaimStreamingRewardsInput): Promise<{
    success: boolean;
    totalClaimed: number;
    tracksCount: number;
    staked: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const { profileId, walletAddress, stakeDirectly = false } = input;

    try {
      // Get all SCids for this user with unclaimed rewards
      const scids = await SCidModel.find({
        profileId,
        ogunRewardsEarned: { $gt: 0 },
      });

      if (scids.length === 0) {
        return {
          success: false,
          totalClaimed: 0,
          tracksCount: 0,
          staked: false,
          error: 'No streaming rewards to claim',
        };
      }

      // Calculate total unclaimed rewards
      let totalRewards = 0;
      const tracksClaimed: string[] = [];

      for (const scid of scids) {
        // Get unclaimed amount (total earned minus any already claimed)
        const unclaimedAmount = scid.ogunRewardsEarned - (scid.ogunRewardsClaimed || 0);
        if (unclaimedAmount > 0) {
          totalRewards += unclaimedAmount;
          tracksClaimed.push(scid.trackId);

          // Mark as claimed
          scid.ogunRewardsClaimed = scid.ogunRewardsEarned;
          scid.lastClaimedAt = new Date();
          await scid.save();
        }
      }

      if (totalRewards === 0) {
        return {
          success: false,
          totalClaimed: 0,
          tracksCount: 0,
          staked: false,
          error: 'All rewards already claimed',
        };
      }

      // Get the streaming rewards contract
      const rewardsContract = getStreamingRewardsContract();

      if (!rewardsContract.isReady()) {
        console.warn('[SCidService] StreamingRewardsContract not initialized - database-only claim');
        return {
          success: true,
          totalClaimed: totalRewards,
          tracksCount: tracksClaimed.length,
          staked: stakeDirectly,
          error: 'Contract not initialized - rewards tracked but not distributed on-chain yet',
        };
      }

      // Prepare batch data for all unclaimed rewards
      const users: string[] = [];
      const scidStrings: string[] = [];
      const amounts: number[] = [];
      const isNfts: boolean[] = [];

      for (const scid of scids) {
        const unclaimed = scid.ogunRewardsEarned - (scid.ogunRewardsClaimed || 0);
        if (unclaimed > 0) {
          users.push(walletAddress);
          scidStrings.push(scid.scid);
          amounts.push(unclaimed);
          isNfts.push(!!scid.contractAddress); // Has contractAddress = NFT (on-chain)
        }
      }

      console.log(`[SCidService] Distributing ${totalRewards} OGUN to ${walletAddress} for ${users.length} tracks`);

      // Call the contract based on stakeDirectly flag
      let result;
      if (users.length === 1) {
        // Single claim
        if (stakeDirectly) {
          result = await rewardsContract.submitRewardAndStake(
            walletAddress,
            scidStrings[0],
            amounts[0],
            isNfts[0]
          );
        } else {
          result = await rewardsContract.submitReward(
            walletAddress,
            scidStrings[0],
            amounts[0],
            isNfts[0]
          );
        }
      } else {
        // Batch claim (more gas efficient)
        result = await rewardsContract.batchSubmitRewards(
          users,
          scidStrings,
          amounts,
          isNfts
        );
      }

      if (!result.success) {
        // Rollback database changes on contract failure
        for (const scid of scids) {
          const unclaimed = scid.ogunRewardsEarned - (scid.ogunRewardsClaimed || 0);
          if (unclaimed > 0) {
            scid.ogunRewardsClaimed = (scid.ogunRewardsClaimed || 0) - unclaimed;
            scid.lastClaimedAt = undefined;
            await scid.save();
          }
        }

        return {
          success: false,
          totalClaimed: 0,
          tracksCount: 0,
          staked: false,
          error: result.error || 'Contract call failed',
        };
      }

      console.log(`[SCidService] Successfully distributed ${totalRewards} OGUN - tx: ${result.transactionHash}`);

      return {
        success: true,
        totalClaimed: totalRewards,
        tracksCount: tracksClaimed.length,
        staked: stakeDirectly,
        transactionHash: result.transactionHash,
      };
    } catch (err: any) {
      console.error('[SCidService] Claim error:', err);
      return {
        success: false,
        totalClaimed: 0,
        tracksCount: 0,
        staked: false,
        error: err.message || 'Claim failed',
      };
    }
  }

  /**
   * Get total unclaimed streaming rewards for a user
   */
  async getUnclaimedRewards(profileId: string): Promise<{
    totalUnclaimed: number;
    tracksWithRewards: number;
    breakdown: Array<{ scid: string; trackId: string; unclaimed: number }>;
  }> {
    const scids = await SCidModel.find({
      profileId,
      ogunRewardsEarned: { $gt: 0 },
    }).lean();

    let totalUnclaimed = 0;
    const breakdown: Array<{ scid: string; trackId: string; unclaimed: number }> = [];

    for (const scid of scids) {
      const unclaimed = scid.ogunRewardsEarned - (scid.ogunRewardsClaimed || 0);
      if (unclaimed > 0) {
        totalUnclaimed += unclaimed;
        breakdown.push({
          scid: scid.scid,
          trackId: scid.trackId,
          unclaimed,
        });
      }
    }

    return {
      totalUnclaimed,
      tracksWithRewards: breakdown.length,
      breakdown,
    };
  }

  /**
   * Grandfather existing tracks with SCid codes
   *
   * Finds all tracks in the database that don't have SCids and registers them.
   * This is for migrating existing NFTs/tracks to the SCid system.
   *
   * @param options.limit - Max tracks to process per batch (default 100)
   * @param options.dryRun - If true, just counts without registering
   * @param options.chainCode - Default chain for non-NFT tracks
   */
  async grandfatherExistingTracks(options: {
    limit?: number;
    dryRun?: boolean;
    chainCode?: ChainCode;
  } = {}): Promise<{
    totalTracksFound: number;
    tracksWithoutScid: number;
    registered: number;
    skipped: number;
    nftTracks: number;
    nonNftTracks: number;
    errors: string[];
  }> {
    const { limit = 100, dryRun = false, chainCode = ChainCode.POLYGON } = options;

    // Get all existing SCid trackIds
    const existingScids = await SCidModel.find().select('trackId').lean();
    const existingTrackIds = new Set(existingScids.map(s => s.trackId));

    // Find all tracks
    const allTracksResult = await this.context.trackService.getTracks(
      undefined, // no filter
      undefined, // no sort
      { first: 10000 } // Get all tracks
    );
    const allTracks = allTracksResult.nodes || [];

    const totalTracksFound = allTracks.length;
    const tracksWithoutScid = allTracks.filter((t: any) => !existingTrackIds.has(t._id.toString()));

    let registered = 0;
    let skipped = 0;
    let nftTracks = 0;
    let nonNftTracks = 0;
    const errors: string[] = [];

    if (dryRun) {
      // Just count, don't register
      for (const track of tracksWithoutScid) {
        if (track.nftData?.tokenId != null) {
          nftTracks++;
        } else {
          nonNftTracks++;
        }
      }
      return {
        totalTracksFound,
        tracksWithoutScid: tracksWithoutScid.length,
        registered: 0,
        skipped: existingScids.length,
        nftTracks,
        nonNftTracks,
        errors: [],
      };
    }

    // Register SCids for tracks without them
    const tracksToProcess = tracksWithoutScid.slice(0, limit);

    for (const track of tracksToProcess) {
      try {
        const trackId = track._id.toString();
        const profileId = track.profileId?.toString();

        if (!profileId) {
          errors.push(`Track ${trackId}: No profile ID found`);
          continue;
        }

        // Determine chain based on NFT data
        let trackChainCode = chainCode;
        if (track.nftData?.tokenId != null) {
          nftTracks++;
          // If NFT has contract, try to determine chain from contract
          // For now, default to Polygon since most NFTs are there
          trackChainCode = ChainCode.POLYGON;
        } else {
          nonNftTracks++;
        }

        await this.register({
          trackId,
          profileId,
          chainCode: trackChainCode,
          walletAddress: track.nftData?.minter || track.nftData?.owner,
        });
        registered++;
      } catch (err: any) {
        errors.push(`Track ${track._id}: ${err.message}`);
      }
    }

    return {
      totalTracksFound,
      tracksWithoutScid: tracksWithoutScid.length,
      registered,
      skipped: existingScids.length,
      nftTracks,
      nonNftTracks,
      errors,
    };
  }

  /**
   * Get historical streaming statistics
   *
   * Returns aggregate data on playbackCount across all tracks.
   * Use this before running grandfatherOGRewards to preview.
   */
  async getHistoricalStreamStats(): Promise<{
    totalTracks: number;
    tracksWithPlays: number;
    totalPlays: number;
    nftTracksWithPlays: number;
    nftPlays: number;
    nonNftPlays: number;
    estimatedCreatorOgun: number;
    uniqueCreators: number;
    topTracks: Array<{ trackId: string; title: string; plays: number; isNft: boolean }>;
  }> {
    const { trackService } = this.context;

    // Use raw MongoDB for aggregation
    const TrackModel = mongoose.model('Track');

    const [
      totalTracks,
      tracksWithPlays,
      playsAgg,
      nftTracksWithPlaysCount,
      nftPlaysAgg,
      uniqueCreatorsAgg,
      topTracksResult,
    ] = await Promise.all([
      TrackModel.countDocuments({ deleted: { $ne: true } }),
      TrackModel.countDocuments({ playbackCount: { $gt: 0 }, deleted: { $ne: true } }),
      TrackModel.aggregate([
        { $match: { deleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$playbackCount' } } }
      ]),
      TrackModel.countDocuments({
        playbackCount: { $gt: 0 },
        deleted: { $ne: true },
        $or: [
          { 'nftData.tokenId': { $exists: true, $ne: null } },
          { 'nftData.contract': { $exists: true, $ne: null } }
        ]
      }),
      TrackModel.aggregate([
        {
          $match: {
            playbackCount: { $gt: 0 },
            deleted: { $ne: true },
            $or: [
              { 'nftData.tokenId': { $exists: true, $ne: null } },
              { 'nftData.contract': { $exists: true, $ne: null } }
            ]
          }
        },
        { $group: { _id: null, total: { $sum: '$playbackCount' } } }
      ]),
      TrackModel.aggregate([
        { $match: { playbackCount: { $gt: 0 }, deleted: { $ne: true } } },
        { $group: { _id: '$profileId' } },
        { $count: 'count' }
      ]),
      TrackModel.find({ playbackCount: { $gt: 0 }, deleted: { $ne: true } })
        .sort({ playbackCount: -1 })
        .limit(10)
        .select('_id title playbackCount nftData')
        .lean()
    ]);

    const totalPlays = playsAgg[0]?.total || 0;
    const nftPlays = nftPlaysAgg[0]?.total || 0;
    const nonNftPlays = totalPlays - nftPlays;
    const uniqueCreators = uniqueCreatorsAgg[0]?.count || 0;

    // Calculate estimated OGUN (creator's 70% share)
    const nftOgun = nftPlays * 0.35; // 0.5 * 0.7
    const nonNftOgun = nonNftPlays * 0.035; // 0.05 * 0.7
    const estimatedCreatorOgun = nftOgun + nonNftOgun;

    const topTracks = (topTracksResult as any[]).map(t => ({
      trackId: t._id.toString(),
      title: t.title || 'Untitled',
      plays: t.playbackCount || 0,
      isNft: !!(t.nftData?.tokenId || t.nftData?.contract),
    }));

    return {
      totalTracks,
      tracksWithPlays,
      totalPlays,
      nftTracksWithPlays: nftTracksWithPlaysCount,
      nftPlays,
      nonNftPlays,
      estimatedCreatorOgun,
      uniqueCreators,
      topTracks,
    };
  }

  /**
   * Grandfather OG Rewards
   *
   * Credits retroactive OGUN rewards to creators based on historical
   * playbackCount data. This rewards OG users who've been on the platform!
   *
   * Rewards are added as CLAIMABLE BALANCE (ogunRewardsEarned - ogunRewardsClaimed)
   *
   * @param options.dryRun - If true, preview without making changes
   * @param options.limit - Max tracks to process (0 = unlimited)
   * @param options.minPlays - Minimum plays to qualify (default 1)
   */
  async grandfatherOGRewards(options: {
    dryRun?: boolean;
    limit?: number;
    minPlays?: number;
  } = {}): Promise<{
    totalTracksProcessed: number;
    totalPlaysRewarded: number;
    totalOgunCredited: number;
    nftTracksRewarded: number;
    nonNftTracksRewarded: number;
    creatorsRewarded: number;
    topRewarded: Array<{ trackId: string; title: string; plays: number; ogun: number }>;
    errors: string[];
  }> {
    const { dryRun = true, limit = 0, minPlays = 1 } = options;

    // OG reward rates (creator's 70% share)
    const OG_REWARD_CONFIG = {
      nftRewardPerPlay: 0.35,    // 0.5 OGUN * 70%
      baseRewardPerPlay: 0.035,  // 0.05 OGUN * 70%
      maxRewardPerTrack: 10000,  // Cap at 10k OGUN per track
    };

    const TrackModel = mongoose.model('Track');

    const result = {
      totalTracksProcessed: 0,
      totalPlaysRewarded: 0,
      totalOgunCredited: 0,
      nftTracksRewarded: 0,
      nonNftTracksRewarded: 0,
      creatorsRewarded: 0,
      topRewarded: [] as Array<{ trackId: string; title: string; plays: number; ogun: number }>,
      errors: [] as string[],
    };

    const creatorsSet = new Set<string>();
    const trackRewards: Array<{ trackId: string; title: string; plays: number; ogun: number }> = [];

    try {
      // Find all tracks with plays
      let query = TrackModel.find({
        playbackCount: { $gte: minPlays },
        deleted: { $ne: true }
      }).sort({ playbackCount: -1 });

      if (limit > 0) {
        query = query.limit(limit);
      }

      const tracks = await query.lean().exec() as any[];

      console.log(`[GrandfatherOG] Processing ${tracks.length} tracks with ${minPlays}+ plays (dryRun=${dryRun})`);

      for (const track of tracks) {
        try {
          const trackId = track._id.toString();
          const profileId = track.profileId?.toString();
          const playbackCount = track.playbackCount || 0;
          const isNft = !!(track.nftData?.tokenId || track.nftData?.contract);

          if (!profileId) {
            result.errors.push(`Track ${trackId}: No profileId`);
            continue;
          }

          // Calculate reward
          const rewardPerPlay = isNft ? OG_REWARD_CONFIG.nftRewardPerPlay : OG_REWARD_CONFIG.baseRewardPerPlay;
          let ogunToCredit = Math.min(playbackCount * rewardPerPlay, OG_REWARD_CONFIG.maxRewardPerTrack);

          if (!dryRun) {
            // Get or create SCid for this track
            let scid = await SCidModel.findOne({ trackId });

            if (!scid) {
              // Create SCid for this track
              const artistHash = SCidGenerator.generateArtistHash(profileId);
              const existingCount = await SCidModel.countDocuments({ profileId });
              const scidCode = SCidGenerator.generate({
                artistIdentifier: profileId,
                sequenceNumber: existingCount + 1,
                chainCode: ChainCode.POLYGON,
              });

              scid = new SCidModel({
                scid: scidCode,
                trackId,
                profileId,
                chainCode: ChainCode.POLYGON,
                artistHash,
                year: new Date().getFullYear().toString().slice(-2),
                sequence: existingCount + 1,
                status: SCidStatus.PENDING,
                streamCount: playbackCount,
                ogunRewardsEarned: ogunToCredit,
                ogunRewardsClaimed: 0,
              });
              await scid.save();
            } else {
              // Update existing SCid with grandfather rewards
              await SCidModel.updateOne(
                { trackId },
                {
                  $inc: {
                    streamCount: playbackCount,
                    ogunRewardsEarned: ogunToCredit,
                  },
                }
              );
            }
          }

          // Track stats
          result.totalTracksProcessed++;
          result.totalPlaysRewarded += playbackCount;
          result.totalOgunCredited += ogunToCredit;

          if (isNft) {
            result.nftTracksRewarded++;
          } else {
            result.nonNftTracksRewarded++;
          }

          creatorsSet.add(profileId);
          trackRewards.push({
            trackId,
            title: track.title || 'Untitled',
            plays: playbackCount,
            ogun: ogunToCredit,
          });

        } catch (err: any) {
          result.errors.push(`Track ${track._id}: ${err.message}`);
        }
      }

      result.creatorsRewarded = creatorsSet.size;
      result.topRewarded = trackRewards
        .sort((a, b) => b.ogun - a.ogun)
        .slice(0, 20);

      console.log(`[GrandfatherOG] Complete: ${result.totalTracksProcessed} tracks, ${result.totalOgunCredited.toFixed(2)} OGUN credited to ${result.creatorsRewarded} creators`);

      return result;

    } catch (err: any) {
      console.error('[GrandfatherOG] Fatal error:', err);
      result.errors.push(`Fatal: ${err.message}`);
      return result;
    }
  }
}

export default SCidService;
