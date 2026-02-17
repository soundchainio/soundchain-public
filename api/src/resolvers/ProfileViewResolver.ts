import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { ProfileViewCountResult } from '../types/ProfileViewCountResult';

@Resolver()
export class ProfileViewResolver {
  @Mutation(() => Boolean)
  @Authorized()
  async logProfileView(
    @Ctx() { profileViewService }: Context,
    @Arg('viewedProfileId') viewedProfileId: string,
    @CurrentUser() { profileId }: User,
  ): Promise<boolean> {
    await profileViewService.logView(profileId.toString(), viewedProfileId);
    return true;
  }

  @Query(() => ProfileViewCountResult)
  async profileViewCount(
    @Ctx() { profileViewService, profileService }: Context,
    @Arg('profileId') profileId: string,
  ): Promise<ProfileViewCountResult> {
    const profile = await profileService.getProfile(profileId);
    const today = await profileViewService.getViewCountToday(profileId);

    return {
      total: (profile as any).profileViewCount || 0,
      today,
    };
  }
}
