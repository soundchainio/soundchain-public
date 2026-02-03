import { Arg, Authorized, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Story } from '../models/Story';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { MakeStoryPermanentInput } from '../types/MakeStoryPermanentInput';
import { MakeStoryPermanentResult } from '../types/MakeStoryPermanentResult';

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
}
