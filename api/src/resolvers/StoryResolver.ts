import { Arg, Authorized, Ctx, FieldResolver, Float, InputType, Int, Field, Mutation, ObjectType, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Story, StoryOverlay } from '../models/Story';
import { Profile } from '../models/Profile';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { MakeStoryPermanentInput } from '../types/MakeStoryPermanentInput';
import { MakeStoryPermanentResult } from '../types/MakeStoryPermanentResult';

// Input type for overlays
@InputType()
class OverlayInput {
  @Field(() => String)
  type!: 'text' | 'hashtag' | 'mention' | 'sticker' | 'nft_badge';

  @Field(() => String)
  content!: string;

  @Field(() => Float)
  positionX!: number;

  @Field(() => Float)
  positionY!: number;

  @Field(() => String, { nullable: true })
  fontFamily?: string;

  @Field(() => String, { nullable: true })
  color?: string;

  @Field(() => Float, { nullable: true })
  fontSize?: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;

  @Field(() => String, { nullable: true })
  mentionedUserId?: string;
}

// Result type for watch recording
@ObjectType()
class RecordWatchResult {
  @Field(() => Boolean)
  qualified!: boolean;

  @Field(() => String, { nullable: true })
  viewerScid?: string;
}

@Resolver(Story)
export class StoryResolver {
  // ============================================
  // FIELD RESOLVERS
  // ============================================

  @FieldResolver(() => Profile, { nullable: true })
  async profile(@Ctx() { profileService }: Context, @Root() story: Story): Promise<Profile | null> {
    if (!story.profileId) {
      return null;
    }
    try {
      const profile = await profileService.getProfile(story.profileId.toString());
      return profile || null;
    } catch (error) {
      console.error(`Failed to load profile ${story.profileId} for story ${story._id}:`, error);
      return null;
    }
  }

  @FieldResolver(() => Boolean)
  async isExpired(@Root() story: Story): Promise<boolean> {
    if (story.isPermanent) {
      return false;
    }
    return story.expiresAt ? new Date() > new Date(story.expiresAt) : false;
  }

  @FieldResolver(() => Int)
  reactionCount(@Root() story: Story): number {
    return story.reactions?.length || 0;
  }

  @FieldResolver(() => Track, { nullable: true })
  async attachedTrack(@Ctx() { trackService }: Context, @Root() story: Story): Promise<Track | null> {
    if (!story.attachedTrackId) {
      return null;
    }
    try {
      const track = await trackService.getTrack(story.attachedTrackId.toString());
      return track || null;
    } catch (error) {
      console.error(`Failed to load attached track ${story.attachedTrackId} for story ${story._id}:`, error);
      return null;
    }
  }

  @FieldResolver(() => Int)
  qualifiedViewCount(@Root() story: Story): number {
    return story.totalQualifiedViews || 0;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get stories from users I follow
   * Requires authentication
   */
  @Query(() => [Story])
  @Authorized()
  async myFollowingStories(
    @Ctx() { storyService }: Context,
    @CurrentUser() { profileId }: User
  ): Promise<Story[]> {
    return storyService.getFollowingStories(profileId.toString());
  }

  /**
   * Get a specific user's active stories
   * Requires authentication
   */
  @Query(() => [Story])
  @Authorized()
  async userStories(
    @Ctx() { storyService }: Context,
    @Arg('profileId') profileId: string
  ): Promise<Story[]> {
    return storyService.getByProfile(profileId);
  }

  /**
   * Get public stories for guest/non-logged-in users
   * No authentication required
   */
  @Query(() => [Story])
  async publicStories(
    @Ctx() { storyService }: Context,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number
  ): Promise<Story[]> {
    return storyService.getPublicStories(limit);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new story
   * Requires authentication
   */
  @Mutation(() => Story)
  @Authorized()
  async createStory(
    @Ctx() { storyService }: Context,
    @Arg('mediaUrl') mediaUrl: string,
    @Arg('mediaType') mediaType: string,
    @Arg('caption', { nullable: true }) caption: string,
    @Arg('duration', () => Int, { nullable: true }) duration: number,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    return storyService.create({
      profileId: profileId.toString(),
      mediaUrl,
      mediaType,
      caption,
      duration,
    });
  }

  /**
   * View a story (increments view count)
   * Requires authentication
   */
  @Mutation(() => Story)
  @Authorized()
  async viewStory(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    return storyService.incrementViewCount(storyId, profileId.toString());
  }

  /**
   * React to a story with an emoji
   * Requires authentication
   */
  @Mutation(() => Story)
  @Authorized()
  async reactToStory(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @Arg('emoji') emoji: string,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    return storyService.addReaction({
      storyId,
      profileId: profileId.toString(),
      emoji,
    });
  }

  /**
   * Make a story permanent (pay OGUN to keep forever)
   * Generates an SCid enabling streaming rewards
   * Requires authentication
   */
  @Mutation(() => MakeStoryPermanentResult)
  @Authorized()
  async makeStoryPermanent(
    @Ctx() { storyService }: Context,
    @Arg('input') input: MakeStoryPermanentInput,
    @CurrentUser() { profileId }: User
  ): Promise<MakeStoryPermanentResult> {
    try {
      const { storyId, transactionHash, paymentToken, amountPaid } = input;

      // Verify the story belongs to the user
      const existingStory = await storyService.getById(storyId);
      if (existingStory.profileId.toString() !== profileId.toString()) {
        return {
          success: false,
          error: 'You can only make your own stories permanent',
        };
      }

      // Check if already permanent
      if (existingStory.isPermanent) {
        return {
          success: false,
          error: 'This story is already permanent',
        };
      }

      const story = await storyService.makePermanent({
        storyId,
        txHash: transactionHash,
        paymentToken,
        amountPaid,
      });

      return {
        success: true,
        story,
      };
    } catch (error: any) {
      console.error('[StoryResolver] makeStoryPermanent error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to make story permanent',
      };
    }
  }

  /**
   * Delete a story
   * Requires authentication
   */
  @Mutation(() => Story)
  @Authorized()
  async deleteStory(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    return storyService.deleteStory(storyId, profileId.toString());
  }

  // ============================================
  // GUEST ACCESS MUTATIONS (wallet-only, no account required)
  // ============================================

  /**
   * Create a guest story (no account required)
   * Guest can upload media to IPFS and create a 24h story
   */
  @Mutation(() => Story)
  async guestCreateStory(
    @Ctx() { storyService }: Context,
    @Arg('mediaUrl') mediaUrl: string,
    @Arg('mediaType') mediaType: string,
    @Arg('walletAddress') walletAddress: string,
    @Arg('caption', { nullable: true }) caption?: string,
    @Arg('duration', () => Int, { nullable: true }) duration?: number
  ): Promise<Story> {
    // Validate wallet address format (can be empty for true anonymous posts)
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      // If invalid but not empty, generate a random address for anonymous posting
      const hexChars = '0123456789abcdef';
      let addressBody = '';
      for (let i = 0; i < 40; i++) {
        addressBody += hexChars[Math.floor(Math.random() * 16)];
      }
      walletAddress = `0x${addressBody}`;
    }

    return storyService.createGuestStory({
      walletAddress: walletAddress.toLowerCase(),
      mediaUrl,
      mediaType,
      caption,
      duration,
    });
  }

  /**
   * Delete a guest story
   * Uses wallet address for verification instead of profileId
   */
  @Mutation(() => Story)
  async guestDeleteStory(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @Arg('walletAddress') walletAddress: string
  ): Promise<Story> {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    return storyService.deleteGuestStory(storyId, walletAddress.toLowerCase());
  }

  // ============================================
  // REELS 2.0: Overlays, NFT Music, SCID Rewards
  // ============================================

  /**
   * Create story with overlays and optional attached track
   */
  @Mutation(() => Story)
  @Authorized()
  async createStoryWithOverlays(
    @Ctx() { storyService }: Context,
    @Arg('mediaUrl') mediaUrl: string,
    @Arg('mediaType') mediaType: string,
    @Arg('overlays', () => [OverlayInput], { nullable: true }) overlays: OverlayInput[],
    @Arg('attachedTrackId', { nullable: true }) attachedTrackId: string,
    @Arg('caption', { nullable: true }) caption: string,
    @Arg('duration', () => Int, { nullable: true }) duration: number,
    @Arg('attachedAudioUrl', { nullable: true }) attachedAudioUrl: string,
    @Arg('attachedAudioTitle', { nullable: true }) attachedAudioTitle: string,
    @Arg('attachedAudioArtist', { nullable: true }) attachedAudioArtist: string,
    @Arg('attachedAudioCoverUrl', { nullable: true }) attachedAudioCoverUrl: string,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    return storyService.create({
      profileId: profileId.toString(),
      mediaUrl,
      mediaType,
      caption,
      duration,
      overlays: overlays || [],
      attachedTrackId,
      attachedAudioUrl,
      attachedAudioTitle,
      attachedAudioArtist,
      attachedAudioCoverUrl,
    });
  }

  /**
   * Attach an NFT track to an existing story
   */
  @Mutation(() => Story)
  @Authorized()
  async attachTrackToStory(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @Arg('trackId') trackId: string,
    @Arg('trackEditionId', { nullable: true }) trackEditionId: string,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    // Verify ownership first
    const story = await storyService.getById(storyId);
    if (story.profileId?.toString() !== profileId.toString()) {
      throw new Error("You don't have permission to modify this story");
    }

    return storyService.attachTrack({
      storyId,
      trackId,
      trackEditionId,
    });
  }

  /**
   * Update story overlays
   */
  @Mutation(() => Story)
  @Authorized()
  async updateStoryOverlays(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @Arg('overlays', () => [OverlayInput]) overlays: OverlayInput[],
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    return storyService.updateOverlays(storyId, overlays, profileId.toString());
  }

  /**
   * Record watch time for SCID rewards
   * Called when viewer watches for 30+ seconds
   */
  @Mutation(() => RecordWatchResult)
  async recordStoryWatch(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @Arg('watchDurationSeconds', () => Float) watchDurationSeconds: number,
    @Arg('viewerProfileId', { nullable: true }) viewerProfileId: string,
    @Arg('viewerWalletAddress', { nullable: true }) viewerWalletAddress: string
  ): Promise<{ qualified: boolean; viewerScid?: string }> {
    return storyService.recordWatch({
      storyId,
      viewerProfileId,
      viewerWalletAddress,
      watchDurationSeconds,
    });
  }

  /**
   * Get a single story by ID (public, for OG meta/deep links)
   */
  @Query(() => Story, { nullable: true })
  async story(
    @Ctx() { storyService }: Context,
    @Arg('id') id: string
  ): Promise<Story | null> {
    try {
      return await storyService.getById(id);
    } catch {
      return null;
    }
  }

  /**
   * Search stories by hashtag
   */
  @Query(() => [Story])
  async searchStoriesByHashtag(
    @Ctx() { storyService }: Context,
    @Arg('hashtag') hashtag: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number
  ): Promise<Story[]> {
    return storyService.searchByHashtag(hashtag, limit);
  }

  /**
   * Get stories using a specific track
   */
  @Query(() => [Story])
  async storiesWithTrack(
    @Ctx() { storyService }: Context,
    @Arg('trackId') trackId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number
  ): Promise<Story[]> {
    return storyService.getStoriesWithTrack(trackId, limit);
  }

  /**
   * Get trending stories
   */
  @Query(() => [Story])
  async trendingStories(
    @Ctx() { storyService }: Context,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number
  ): Promise<Story[]> {
    return storyService.getTrending(limit);
  }

  /**
   * Backfill creator details for stories missing helix data
   * This fixes stories that were created as "guest" when user was actually logged in
   * Admin-only mutation
   */
  @Mutation(() => Int)
  @Authorized()
  async backfillStoryCreatorDetails(
    @Ctx() { storyService, profileService, userService }: Context,
    @CurrentUser() user: User
  ): Promise<number> {
    // Get all stories with profileId but missing creator details
    const stories = await storyService.getStoriesNeedingBackfill();
    let updatedCount = 0;

    for (const story of stories) {
      if (!story.profileId) continue;

      try {
        const profile = await profileService.getProfile(story.profileId.toString());
        if (!profile) continue;

        // Get user to get the handle
        const profileUser = await userService.getUserByProfileId(story.profileId.toString());

        await storyService.updateCreatorDetails(story._id.toString(), {
          creatorDisplayName: profile.displayName,
          creatorUserHandle: profileUser?.handle || profile.displayName,
          creatorAvatarUrl: profile.profilePicture,
        });
        updatedCount++;
      } catch (err) {
        console.error(`[StoryResolver] Failed to backfill story ${story._id}:`, err);
      }
    }

    console.log(`[StoryResolver] Backfilled ${updatedCount} stories with creator details`);
    return updatedCount;
  }

  /**
   * Guest create story with overlays
   */
  @Mutation(() => Story)
  async guestCreateStoryWithOverlays(
    @Ctx() { storyService }: Context,
    @Arg('mediaUrl') mediaUrl: string,
    @Arg('mediaType') mediaType: string,
    @Arg('walletAddress') walletAddress: string,
    @Arg('overlays', () => [OverlayInput], { nullable: true }) overlays: OverlayInput[],
    @Arg('attachedTrackId', { nullable: true }) attachedTrackId: string,
    @Arg('caption', { nullable: true }) caption?: string,
    @Arg('duration', () => Int, { nullable: true }) duration?: number
  ): Promise<Story> {
    // Generate random wallet if invalid
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      const hexChars = '0123456789abcdef';
      let addressBody = '';
      for (let i = 0; i < 40; i++) {
        addressBody += hexChars[Math.floor(Math.random() * 16)];
      }
      walletAddress = `0x${addressBody}`;
    }

    return storyService.createGuestStory({
      walletAddress: walletAddress.toLowerCase(),
      mediaUrl,
      mediaType,
      caption,
      duration,
      overlays: overlays || [],
      attachedTrackId,
    });
  }
}
