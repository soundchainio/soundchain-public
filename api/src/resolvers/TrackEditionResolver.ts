import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { TrackEdition } from '../models/TrackEdition';
import { TrackEditionWithTrackItem } from '../models/TrackEditionWithTrackItem';
import { Context } from '../types/Context';

@Resolver(TrackEdition)
export class TrackEditionResolver {
  @Query(() => TrackEditionWithTrackItem)
  trackEdition(@Ctx() { trackEditionService }: Context, @Arg('id') id: string): Promise<TrackEditionWithTrackItem> {
    return trackEditionService.getTrackEdition(id);
  }
}
