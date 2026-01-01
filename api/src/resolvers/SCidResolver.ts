/**
 * SCid GraphQL Resolver
 *
 * API endpoints for SCid (SoundChain ID) operations.
 */

import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { SCid, SCidStatus } from '../models/SCid';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { ChainCode } from '../utils/SCidGenerator';
import { SCidGenerator } from '../utils/SCidGenerator';

// Input types
import { Field, InputType, ObjectType, Int } from 'type-graphql';

@InputType()
export class RegisterSCidInput {
  @Field()
  trackId: string;

  @Field(() => ChainCode, { nullable: true })
  chainCode?: ChainCode;

  @Field({ nullable: true })
  metadataHash?: string;
}

@InputType()
export class LogStreamInput {
  @Field()
  scid: string;

  @Field(() => Int)
  duration: number;

  @Field({ nullable: true })
  listenerWallet?: string;
}

@InputType()
export class TransferSCidInput {
  @Field()
  scid: string;

  @Field()
  toProfileId: string;

  @Field({ nullable: true })
  reason?: string;
}

@InputType()
export class SCidSearchInput {
  @Field({ nullable: true })
  profileId?: string;

  @Field(() => ChainCode, { nullable: true })
  chainCode?: ChainCode;

  @Field(() => SCidStatus, { nullable: true })
  status?: SCidStatus;

  @Field({ nullable: true })
  year?: string;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number;
}

// Response types
@ObjectType()
export class RegisterSCidPayload {
  @Field(() => SCid)
  scid: SCid;
}

@ObjectType()
export class LogStreamPayload {
  @Field()
  success: boolean;

  @Field()
  ogunReward: number;

  @Field(() => Int)
  totalStreams: number;

  @Field({ nullable: true })
  dailyLimitReached?: boolean;
}

@ObjectType()
export class GrandfatherPayload {
  @Field(() => Int)
  totalTracksFound: number;

  @Field(() => Int)
  tracksWithoutScid: number;

  @Field(() => Int)
  registered: number;

  @Field(() => Int)
  skipped: number;

  @Field(() => Int)
  nftTracks: number;

  @Field(() => Int)
  nonNftTracks: number;

  @Field(() => [String])
  errors: string[];
}

@ObjectType()
export class SCidValidationResult {
  @Field()
  valid: boolean;

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  chainCode?: string;

  @Field({ nullable: true })
  artistHash?: string;

  @Field({ nullable: true })
  year?: string;

  @Field({ nullable: true })
  sequence?: string;
}

@ObjectType()
export class SCidStatsPayload {
  @Field(() => Int)
  totalScids: number;

  @Field(() => Int)
  totalStreams: number;

  @Field()
  totalOgunRewarded: number;
}

@ObjectType()
export class SCidSearchResult {
  @Field(() => [SCid])
  scids: SCid[];

  @Field(() => Int)
  total: number;
}

@ObjectType()
export class BulkRegisterPayload {
  @Field(() => Int)
  registered: number;

  @Field(() => Int)
  skipped: number;

  @Field(() => [String])
  errors: string[];
}

@Resolver(SCid)
export class SCidResolver {
  /**
   * Get track title for an SCid
   */
  @FieldResolver(() => String, { nullable: true })
  async trackTitle(@Ctx() { trackService }: Context, @Root() scid: SCid): Promise<string | null> {
    try {
      const track = await trackService.findOrFail(scid.trackId);
      return track.title;
    } catch {
      return null;
    }
  }

  /**
   * Get artist display name for an SCid
   */
  @FieldResolver(() => String, { nullable: true })
  async artistName(@Ctx() { profileService }: Context, @Root() scid: SCid): Promise<string | null> {
    try {
      const profile = await profileService.getProfile(scid.profileId);
      return profile?.displayName || null;
    } catch {
      return null;
    }
  }

  /**
   * Get formatted SCid for display
   */
  @FieldResolver(() => String)
  formattedScid(@Root() scid: SCid): string {
    return SCidGenerator.formatForDisplay(scid.scid);
  }

  // ==================== QUERIES ====================

  /**
   * Get SCid by code
   */
  @Query(() => SCid, { nullable: true })
  async scid(
    @Ctx() { scidService }: Context,
    @Arg('scid') scid: string
  ): Promise<SCid | null> {
    return scidService.getBySCid(scid);
  }

  /**
   * Get SCid by track ID
   */
  @Query(() => SCid, { nullable: true })
  async scidByTrack(
    @Ctx() { scidService }: Context,
    @Arg('trackId') trackId: string
  ): Promise<SCid | null> {
    return scidService.getByTrackId(trackId);
  }

  /**
   * Get all SCids for a profile
   */
  @Query(() => [SCid])
  async scidsByProfile(
    @Ctx() { scidService }: Context,
    @Arg('profileId') profileId: string
  ): Promise<SCid[]> {
    return scidService.getByProfileId(profileId);
  }

  /**
   * Get my SCids (authenticated)
   */
  @Query(() => [SCid])
  @Authorized()
  async myScids(
    @Ctx() { scidService }: Context,
    @CurrentUser() { profileId }: User
  ): Promise<SCid[]> {
    return scidService.getByProfileId(profileId.toString());
  }

  /**
   * Validate an SCid format
   */
  @Query(() => SCidValidationResult)
  validateScid(@Arg('scid') scid: string): SCidValidationResult {
    const result = SCidGenerator.parse(scid);

    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    return {
      valid: true,
      chainCode: result.components?.chainCode,
      artistHash: result.components?.artistHash,
      year: result.components?.year,
      sequence: result.components?.sequence,
    };
  }

  /**
   * Get SCid statistics
   */
  @Query(() => SCidStatsPayload)
  async scidStats(@Ctx() { scidService }: Context): Promise<SCidStatsPayload> {
    const stats = await scidService.getStats();
    return {
      totalScids: stats.totalScids,
      totalStreams: stats.totalStreams,
      totalOgunRewarded: stats.totalOgunRewarded,
    };
  }

  /**
   * Search SCids
   */
  @Query(() => SCidSearchResult)
  async searchScids(
    @Ctx() { scidService }: Context,
    @Arg('input') input: SCidSearchInput
  ): Promise<SCidSearchResult> {
    return scidService.search(input);
  }

  /**
   * Generate SCid preview (doesn't save)
   */
  @Query(() => String)
  previewScid(
    @Arg('artistIdentifier') artistIdentifier: string,
    @Arg('sequenceNumber', () => Int) sequenceNumber: number,
    @Arg('chainCode', () => ChainCode, { nullable: true }) chainCode?: ChainCode
  ): string {
    return SCidGenerator.generate({
      artistIdentifier,
      sequenceNumber,
      chainCode,
    });
  }

  // ==================== MUTATIONS ====================

  /**
   * Register a new SCid for a track
   */
  @Mutation(() => RegisterSCidPayload)
  @Authorized()
  async registerScid(
    @Ctx() { scidService, profileService }: Context,
    @Arg('input') input: RegisterSCidInput,
    @CurrentUser() user: User
  ): Promise<RegisterSCidPayload> {
    // Get user's wallet address
    const profile = await profileService.getProfile(user.profileId.toString());
    const walletAddress = profile?.magicWalletAddress;

    const scid = await scidService.register({
      trackId: input.trackId,
      profileId: user.profileId.toString(),
      walletAddress,
      chainCode: input.chainCode,
      metadataHash: input.metadataHash,
    });

    return { scid };
  }

  /**
   * Log a stream and earn OGUN rewards
   */
  @Mutation(() => LogStreamPayload)
  async logStream(
    @Ctx() { scidService }: Context,
    @Arg('input') input: LogStreamInput
  ): Promise<LogStreamPayload> {
    return scidService.logStream({
      scid: input.scid,
      duration: input.duration,
      listenerWallet: input.listenerWallet,
    });
  }

  /**
   * Transfer SCid ownership
   */
  @Mutation(() => SCid)
  @Authorized()
  async transferScid(
    @Ctx() { scidService }: Context,
    @Arg('input') input: TransferSCidInput,
    @CurrentUser() user: User
  ): Promise<SCid> {
    const result = await scidService.transfer(
      input.scid,
      user.profileId.toString(),
      input.toProfileId,
      undefined,
      input.reason
    );

    if (!result) {
      throw new Error('Transfer failed');
    }

    return result;
  }

  /**
   * Mark SCid as registered on-chain (admin or system)
   */
  @Mutation(() => SCid, { nullable: true })
  @Authorized(['ADMIN'])
  async markScidRegistered(
    @Ctx() { scidService }: Context,
    @Arg('scid') scid: string,
    @Arg('transactionHash') transactionHash: string,
    @Arg('blockNumber', () => Int) blockNumber: number,
    @Arg('contractAddress') contractAddress: string
  ): Promise<SCid | null> {
    return scidService.markRegistered(scid, transactionHash, blockNumber, contractAddress);
  }

  /**
   * Bulk register SCids for existing tracks
   */
  @Mutation(() => BulkRegisterPayload)
  @Authorized()
  async bulkRegisterScids(
    @Ctx() { scidService }: Context,
    @Arg('trackIds', () => [String]) trackIds: string[],
    @Arg('chainCode', () => ChainCode, { nullable: true }) chainCode: ChainCode,
    @CurrentUser() user: User
  ): Promise<BulkRegisterPayload> {
    return scidService.bulkRegister(
      trackIds,
      user.profileId.toString(),
      chainCode
    );
  }

  /**
   * Grandfather existing tracks with SCid codes
   *
   * Admin-only mutation to register SCids for all existing tracks.
   * This migrates existing NFTs/tracks to the SCid system for OGUN rewards.
   */
  @Mutation(() => GrandfatherPayload)
  @Authorized(['ADMIN'])
  async grandfatherExistingTracks(
    @Ctx() { scidService }: Context,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 100 }) limit: number,
    @Arg('dryRun', { nullable: true, defaultValue: false }) dryRun: boolean,
    @Arg('chainCode', () => ChainCode, { nullable: true }) chainCode?: ChainCode
  ): Promise<GrandfatherPayload> {
    return scidService.grandfatherExistingTracks({
      limit,
      dryRun,
      chainCode,
    });
  }
}

export default SCidResolver;
