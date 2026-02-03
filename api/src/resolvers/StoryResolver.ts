import { Arg, Authorized, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Story } from '../models/Story';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';

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
   * Requires authentication
   */
  @Mutation(() => Story)
  @Authorized()
  async makeStoryPermanent(
    @Ctx() { storyService }: Context,
    @Arg('storyId') storyId: string,
    @Arg('txHash') txHash: string,
    @CurrentUser() { profileId }: User
  ): Promise<Story> {
    // Verify the story belongs to the user
    const story = await storyService.getById(storyId);
    if (story.profileId.toString() !== profileId.toString()) {
      throw new Error('You can only make your own stories permanent');
    }

    return storyService.makePermanent({ storyId, txHash });
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
}
