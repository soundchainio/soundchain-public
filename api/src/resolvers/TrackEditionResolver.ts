import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { TrackEdition } from '../models/TrackEdition';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateTrackEditionInput } from '../types/CreateTrackEditionInput';
import { CreateTrackEditionPayload } from '../types/CreateTrackEditionPayload';
import { Role } from '../types/Role';

@Resolver(TrackEdition)
export class TrackEditionResolver {
  @Query(() => TrackEdition)
  async trackEdition(
    @Arg('id') id: string,
    @Ctx() ctx: Context,
  ): Promise<TrackEdition> {
    const edition = await ctx.trackEditionService.findOrFail(id);
    // Convert to plain object to avoid mongoose internal symbol access issues
    if (edition && typeof (edition as any).toObject === 'function') {
      return (edition as any).toObject() as TrackEdition;
    }
    return edition;
  }

  @Mutation(() => CreateTrackEditionPayload)
  @Authorized()
  async createTrackEdition(
    @Ctx() { trackEditionService }: Context,
    @Arg('input') input: CreateTrackEditionInput,
  ): Promise<CreateTrackEditionPayload> {
    const trackEdition = await trackEditionService.createTrackEdition(input);
    return { trackEdition };
  }

  @Mutation(() => [Track])
  @Authorized()
  async deleteTrackEdition(
    @Ctx() { trackService }: Context,
    @CurrentUser() { roles, profileId }: User,
    @Arg('trackEditionId') trackEditionId: string,
  ): Promise<Track[]> {
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes(Role.TEAM_MEMBER);

    if (isAdmin) {
      return trackService.deleteTrackEditionByAdmin(trackEditionId);
    }
    return trackService.deleteEditionTrack(profileId.toString(), trackEditionId);
  }
}
