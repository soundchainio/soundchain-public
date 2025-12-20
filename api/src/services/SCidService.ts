/**
 * SCid Service
 *
 * Handles SCid generation, registration, and OGUN streaming rewards.
 */

import mongoose from 'mongoose';
import { SCid, SCidModel, SCidStatus, SCidTransfer } from '../models/SCid';
import { SCidGenerator, ChainCode, CHAIN_ID_MAP } from '../utils/SCidGenerator';
import { SCidContract, OnChainRegistrationResult } from '../utils/SCidContract';
import { Context } from '../types/Context';
import { Service } from './Service';

// OGUN rewards configuration
const OGUN_REWARDS_CONFIG = {
  baseRewardPerStream: 0.001,       // Base OGUN per stream
  bonusMultiplier: 1.5,             // Bonus for verified artists
  maxDailyRewards: 1000,            // Max OGUN per track per day
  minStreamDuration: 30,            // Minimum seconds to count as stream
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
   * Log a stream and calculate OGUN rewards
   */
  async logStream(input: LogStreamInput): Promise<{
    success: boolean;
    ogunReward: number;
    totalStreams: number;
  }> {
    const { scid, duration, timestamp = new Date() } = input;

    // Validate minimum stream duration
    if (duration < OGUN_REWARDS_CONFIG.minStreamDuration) {
      return { success: false, ogunReward: 0, totalStreams: 0 };
    }

    // Find SCid
    const scidRecord = await SCidModel.findOne({ scid: scid.toUpperCase() });
    if (!scidRecord) {
      throw new Error(`SCid not found: ${scid}`);
    }

    // Calculate OGUN reward
    let ogunReward = OGUN_REWARDS_CONFIG.baseRewardPerStream;

    // Check if artist is verified (bonus multiplier)
    const profile = await this.context.profileService.getProfile(scidRecord.profileId);
    if (profile?.verified) {
      ogunReward *= OGUN_REWARDS_CONFIG.bonusMultiplier;
    }

    // Apply duration bonus (longer streams = more rewards)
    const durationBonus = Math.min(duration / 180, 2); // Max 2x for 3+ min
    ogunReward *= durationBonus;

    // Update SCid record
    scidRecord.streamCount += 1;
    scidRecord.ogunRewardsEarned += ogunReward;
    scidRecord.lastStreamAt = timestamp;
    await scidRecord.save();

    return {
      success: true,
      ogunReward,
      totalStreams: scidRecord.streamCount,
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
}

export default SCidService;
