import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Follow } from '../models/Follow';
import { Profile } from '../models/Profile';
import { Context } from '../types/Context';
import { FollowConnection } from '../types/FollowConnection';
import { PageInput } from '../types/PageInput';

@Resolver(Follow)
export class FollowResolver {
  @FieldResolver(() => Profile)
  followedProfile(@Ctx() { profileService }: Context, @Root() follow: Follow): Promise<Profile> {
    return profileService.getProfile(follow.followedId.toString());
  }

  @FieldResolver(() => Profile)
  followerProfile(@Ctx() { profileService }: Context, @Root() follow: Follow): Promise<Profile> {
    return profileService.getProfile(follow.followerId.toString());
  }

  @Query(() => FollowConnection)
  followers(
    @Ctx() { followService }: Context,
    @Arg('id') id: string,
    @Arg('page', { nullable: true }) page: PageInput,
  ): Promise<FollowConnection> {
    return followService.getFollowers(id, page);
  }

  @Query(() => FollowConnection)
  following(
    @Ctx() { followService }: Context,
    @Arg('id') id: string,
    @Arg('page', { nullable: true }) page: PageInput,
  ): Promise<FollowConnection> {
    return followService.getFolloweds(id, page);
  }
}
