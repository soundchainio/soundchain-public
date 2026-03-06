import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { PaginateResult } from '../db/pagination/paginate';
import { Activity } from '../models/Activity';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';

@Resolver(() => Activity)
export class ActivityResolver {
  /**
   * Get activity feed - shows activities from people the current user follows
   */
  @Query(() => [Activity])
  @Authorized()
  async activityFeed(
    @CurrentUser() { profileId }: User,
    @Ctx() { activityService }: Context,
    @Arg('page', () => PageInput, { nullable: true }) page?: PageInput,
  ): Promise<PaginateResult<Activity>> {
    return activityService.getActivityFeed(profileId.toString(), page);
  }

  /**
   * Resolve the profile that performed the activity
   */
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
