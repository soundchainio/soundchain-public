import { User } from '@sentry/node';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { TrackEdition } from '../models/TrackEdition';
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
    return ctx.trackEditionService.findOrFail(id);
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
    @CurrentUser() { roles }: User,
    @Arg('trackEditionId') trackEditionId: string,
  ): Promise<Track[]> {
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes(Role.TEAM_MEMBER);

    if (!isAdmin) {
      throw new Error('You are not authorized to delete track editions');
    }

    return trackService.deleteTrackEditionByAdmin(trackEditionId);
  }
}
