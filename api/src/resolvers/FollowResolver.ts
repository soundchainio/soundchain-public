import { CurrentUser } from 'decorators/current-user';
import { Follow } from 'models/Follow';
import { Profile } from 'models/Profile';
import User from 'models/User';
import { FollowService } from 'services/FollowService';
import { ProfileService } from 'services/ProfileService';
import { Arg, Authorized, FieldResolver, Mutation, Resolver, Root } from 'type-graphql';
import { FollowProfileInput } from './types/FollowProfileInput';
import { FollowProfilePayload } from './types/FollowProfilePayload';

@Resolver(Follow)
export class FollowResolver {
  @FieldResolver(() => Profile)
  followedProfile(@Root() { followedId }: Follow): Promise<Profile> {
    return ProfileService.getProfile(followedId);
  }

  @Mutation(() => FollowProfilePayload)
  @Authorized()
  async followProfile(
    @Arg('input') { followedId }: FollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<FollowProfilePayload> {
    const follow = await FollowService.createFollow({ followedId, followerId });
    return { follow };
  }
}
