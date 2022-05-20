import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { ExplorePayload } from '../types/ExplorePayload';
import { PageInput } from '../types/PageInput';
import { ProfileConnection } from '../types/ProfileConnection';
import { SortExploreTracks } from '../types/SortExploreTracks';
import { TrackConnection } from '../types/TrackConnection';

@Resolver()
export class ExploreResolver {
  @Query(() => ExplorePayload)
  @Authorized()
  explore(
    @Ctx() { exploreService }: Context,
    @Arg('search', { nullable: true }) search: string,
  ): Promise<ExplorePayload> {
    return exploreService.getExplore(search);
  }

  @Query(() => TrackConnection)
  @Authorized()
  exploreTracks(
    @Ctx() { exploreService }: Context,
    @Arg('search', { nullable: true }) search: string,
    @Arg('page', { nullable: true }) page: PageInput,
    @Arg('sort', { nullable: true }) sort?: SortExploreTracks,
  ): Promise<TrackConnection> {
    return exploreService.getExploreTracks(sort, search, page);
  }

  @Query(() => ProfileConnection)
  @Authorized()
  exploreUsers(
    @Ctx() { exploreService }: Context,
    @Arg('search', { nullable: true }) search: string,
    @Arg('page', { nullable: true }) page: PageInput,
  ): Promise<ProfileConnection> {
    return exploreService.getExploreUsers(search, page);
  }
}
