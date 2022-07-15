import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { TrackEdition } from '../models/TrackEdition';
import { Context } from '../types/Context';
import { CreateTrackEditionInput } from '../types/CreateTrackEditionInput';
import { CreateTrackEditionPayload } from '../types/CreateTrackEditionPayload';

@Resolver(TrackEdition)
export class TrackEditionResolver {
  @Mutation(() => CreateTrackEditionPayload)
  @Authorized()
  async createTrackEdition(
    @Ctx() { trackEditionService }: Context,
    @Arg('input') input: CreateTrackEditionInput,
  ): Promise<CreateTrackEditionPayload> {
    const trackEdition = await trackEditionService.createTrackEdition(input);
    return { trackEdition };
  }
}
