import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { ExplorePayload } from '../types/ExplorePayload';

@Resolver()
export class ExploreResolver {
  @Query(() => ExplorePayload)
  @Authorized()
  explore(
    @Ctx() { exploreService }: Context,
    @Arg('search', { nullable: true }) search: string,
    @CurrentUser() { profileId }: User,
  ): Promise<ExplorePayload> {
    return exploreService.getExplore(profileId, search);
  }
}
