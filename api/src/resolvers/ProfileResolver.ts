import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { FollowedArtistsConnection } from '../types/FollowedArtistsConnection';
import { FollowProfileInput } from '../types/FollowProfileInput';
import { FollowProfilePayload } from '../types/FollowProfilePayload';
import { PageInput } from '../types/PageInput';
import { Role } from '../types/Role';
import { SubscribeToProfileInput } from '../types/SubscribeToProfileInput';
import { SubscribeToProfilePayload } from '../types/SubscribeToProfilePayload';
import { UnfollowProfileInput } from '../types/UnfollowProfileInput';
import { UnfollowProfilePayload } from '../types/UnfollowProfilePayload';
import { UnsubscribeFromProfileInput } from '../types/UnsubscribeProfileInput';
import { UnsubscribeFromProfilePayload } from '../types/UnsubscribeProfilePayload';
import { UpdateProfileInput } from '../types/UpdateProfileInput';
import { UpdateProfilePayload } from '../types/UpdateProfilePayload';
import { ListenerRewardsResult } from '../types/ListenerRewardsResult';

@Resolver(Profile)
export class ProfileResolver {
  @FieldResolver(() => String)
  userHandle(@Ctx() { profileService }: Context, @Root() profile: Profile): Promise<string> {
    return profileService.getUserHandle(profile._id.toString());
  }

  @FieldResolver(() => Boolean)
  async teamMember(@Ctx() { userService }: Context, @Root() profile: Profile): Promise<boolean> {
    const user = await userService.getUserByProfileId(profile._id.toString());
    return user.roles.includes(Role.TEAM_MEMBER);
  }

  @FieldResolver(() => Boolean)
  isFollowed(
    @Ctx() { followService }: Context,
    @Root() profile: Profile,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }

    return followService.exists({ followerId: user.profileId, followedId: profile._id });
  }

  @FieldResolver(() => Boolean)
  isSubscriber(
    @Ctx() { subscriptionService }: Context,
    @Root() profile: Profile,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }

    return subscriptionService.exists({ subscriberId: user.profileId, profileId: profile._id });
  }

  @FieldResolver(() => Boolean)
  isOnline(@Ctx() { profileService }: Context, @Root() profile: Profile): boolean {
    return profileService.isOnline(profile);
  }

  @Query(() => Profile)
  @Authorized()
  myProfile(@Ctx() { profileService }: Context, @CurrentUser() { profileId }: User): Promise<Profile> {
    return profileService.getProfile(profileId.toString());
  }

  @Query(() => Profile)
  profile(@Ctx() { profileService }: Context, @Arg('id') id: string): Promise<Profile> {
    return profileService.getProfile(id);
  }

  @Query(() => Profile, { nullable: true })
  profileByHandle(@Ctx() { profileService }: Context, @Arg('handle') handle: string): Promise<Profile | null> {
    return profileService.getProfileByHandle(handle);
  }

  @Query(() => FollowedArtistsConnection)
  followedArtists(
    @Ctx() { profileService }: Context,
    @Arg('profileId') profileId: string,
    @Arg('search', { nullable: true }) search: string,
    @Arg('page', { nullable: true }) page: PageInput,
  ): Promise<FollowedArtistsConnection> {
    return profileService.getFollowedArtists(profileId, search, page);
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateProfile(
    @Ctx() { profileService }: Context,
    @Arg('input') input: UpdateProfileInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    const profile = await profileService.updateProfile(profileId.toString(), { ...input });
    return { profile };
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async claimBadgeProfile(
    @Ctx() { profileService }: Context,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    const profile = await profileService.claimBadgeProfile(profileId.toString());
    return { profile: profile };
  }

  @Mutation(() => FollowProfilePayload)
  @Authorized()
  async followProfile(
    @Ctx() { profileService }: Context,
    @Arg('input') { followedId }: FollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<FollowProfilePayload> {
    const followedProfile = await profileService.followProfile(followerId, new mongoose.Types.ObjectId(followedId));
    return { followedProfile };
  }

  @Mutation(() => UnfollowProfilePayload)
  @Authorized()
  async unfollowProfile(
    @Ctx() { profileService }: Context,
    @Arg('input') { followedId }: UnfollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<UnfollowProfilePayload> {
    const unfollowedProfile = await profileService.unfollowProfile(followerId, new mongoose.Types.ObjectId(followedId));
    return { unfollowedProfile };
  }

  @Mutation(() => SubscribeToProfilePayload)
  @Authorized()
  async subscribeToProfile(
    @Ctx() { subscriptionService }: Context,
    @Arg('input') { profileId }: SubscribeToProfileInput,
    @CurrentUser() { profileId: subscriberId }: User,
  ): Promise<SubscribeToProfilePayload> {
    const profile = await subscriptionService.subscribeProfile(subscriberId.toString(), profileId.toString());
    return { profile };
  }

  @Mutation(() => UnsubscribeFromProfilePayload)
  @Authorized()
  async unsubscribeFromProfile(
    @Ctx() { subscriptionService }: Context,
    @Arg('input') { profileId }: UnsubscribeFromProfileInput,
    @CurrentUser() { profileId: subscriberId }: User,
  ): Promise<UnsubscribeFromProfilePayload> {
    const profile = await subscriptionService.unsubscribeProfile(subscriberId.toString(), profileId.toString());
    return { profile };
  }

  @Mutation(() => Profile)
  @Authorized()
  heartbeat(
    @Ctx() { profileService }: Context,
    @CurrentUser() { profileId }: User,
  ): Promise<Profile> {
    return profileService.updateLastSeen(profileId.toString());
  }

  @Query(() => ListenerRewardsResult)
  @Authorized()
  async myListenerRewards(
    @Ctx() { profileService }: Context,
    @CurrentUser() { profileId }: User,
  ): Promise<ListenerRewardsResult> {
    const rewards = await profileService.getListenerRewards(profileId.toString());
    return {
      dailyEarned: rewards.dailyEarned,
      totalEarned: rewards.totalEarned,
      dailyLimit: rewards.dailyLimit,
      tracksStreamedToday: rewards.tracksStreamedToday || 0,
    };
  }
}
