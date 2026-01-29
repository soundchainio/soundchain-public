import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Activity } from '../models/Activity';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { ActivityConnection } from '../types/ActivityConnection';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';

@Resolver(Activity)
export class ActivityResolver {
  @Query(() => ActivityConnection)
  @Authorized()
  activityFeed(
    @CurrentUser() { profileId }: User,
    @Ctx() { activityService }: Context,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ActivityConnection> {
    return activityService.getActivityFeed(profileId.toString(), page);
  }

  @FieldResolver(() => Profile, { nullable: true })
  async profile(
    @Root() activity: Activity,
    @Ctx() { profileService }: Context,
  ): Promise<Profile | null> {
    try {
      return await profileService.getProfile(activity.profileId);
    } catch {
      return null;
    }
  }
}
