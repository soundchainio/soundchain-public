import { Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { UploadTrackPayload } from '../types/UploadTrackPayload';

@Resolver(Track)
export class TrackResolver {
  @Mutation(() => UploadTrackPayload)
  @Authorized()
  async uploadTrack(@Ctx() { trackService }: Context, @CurrentUser() { profileId }: User): Promise<UploadTrackPayload> {
    const track = await trackService.createTrack(profileId);
    return { track };
  }
}
