import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { WallPostedMetadata } from '../models/Activity';
import { Profile } from '../models/Profile';
import { WallPost } from '../models/WallPost';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { WallPostConnection } from '../types/WallPostConnection';
import { ActivityType } from '../types/ActivityType';

@Resolver(WallPost)
export class WallPostResolver {
  @Mutation(() => WallPost)
  @Authorized()
  async createWallPost(
    @Ctx() { wallPostService, activityService, notificationService }: Context,
    @Arg('profileId') profileId: string,
    @Arg('body') body: string,
    @Arg('replyToId', { nullable: true }) replyToId: string,
    @CurrentUser() { profileId: authorProfileId }: User,
  ): Promise<WallPost> {
    const wallPost = await wallPostService.createWallPost(
      profileId,
      authorProfileId.toString(),
      body,
      replyToId,
    );

    // Log activity
    const metadata: WallPostedMetadata = {
      wallPostId: wallPost._id.toString(),
      wallProfileId: profileId,
      body: body.substring(0, 100),
    };
    await activityService.logActivity({
      profileId: authorProfileId.toString(),
      type: ActivityType.WallPosted,
      metadata,
    });

    return wallPost;
  }

  @Mutation(() => Boolean)
  @Authorized()
  async deleteWallPost(
    @Ctx() { wallPostService }: Context,
    @Arg('wallPostId') wallPostId: string,
    @CurrentUser() { profileId }: User,
  ): Promise<boolean> {
    return wallPostService.deleteWallPost(wallPostId, profileId.toString());
  }

  @Mutation(() => WallPost)
  @Authorized()
  async pinWallPost(
    @Ctx() { wallPostService }: Context,
    @Arg('wallPostId') wallPostId: string,
    @CurrentUser() { profileId }: User,
  ): Promise<WallPost> {
    return wallPostService.pinWallPost(wallPostId, profileId.toString());
  }

  @Query(() => WallPostConnection)
  async wallPosts(
    @Ctx() { wallPostService }: Context,
    @Arg('profileId') profileId: string,
    @Arg('page', { nullable: true }) page: PageInput,
  ): Promise<WallPostConnection> {
    const result = await wallPostService.getWallPosts(profileId, page);
    return {
      nodes: result.nodes,
      pageInfo: result.pageInfo,
    };
  }

  @FieldResolver(() => Profile, { nullable: true })
  async author(
    @Ctx() { profileService }: Context,
    @Root() wallPost: WallPost,
  ): Promise<Profile | null> {
    try {
      return await profileService.getProfile(wallPost.authorProfileId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => [WallPost])
  async replies(
    @Ctx() { wallPostService }: Context,
    @Root() wallPost: WallPost,
  ): Promise<WallPost[]> {
    return wallPostService.getReplies(wallPost._id.toString());
  }

  @FieldResolver(() => Number)
  async replyCount(
    @Ctx() { wallPostService }: Context,
    @Root() wallPost: WallPost,
  ): Promise<number> {
    return wallPostService.getReplyCount(wallPost._id.toString());
  }
}
