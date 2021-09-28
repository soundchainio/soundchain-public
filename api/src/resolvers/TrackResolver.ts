import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { AddTrackMetadataInput } from '../types/AddTrackMetadataInput';
import { AddTrackMetadataPayload } from '../types/AddTrackMetadataPayload';
import { Context } from '../types/Context';
import { UploadTrackInput } from '../types/UploadTrackInput';
import { UploadTrackPayload } from '../types/UploadTrackPayload';

@Resolver(Track)
export class TrackResolver {
  @Mutation(() => UploadTrackPayload)
  @Authorized()
  async uploadTrack(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') { fileType }: UploadTrackInput,
  ): Promise<UploadTrackPayload> {
    const track = await trackService.createTrack({ profileId, fileType });
    return { track };
  }

  @Mutation(() => AddTrackMetadataPayload)
  @Authorized()
  async addTrackMetadata(
    @Ctx() { trackService }: Context,
    // @CurrentUser() { profileId }: User,
    @Arg('input') { trackId, ...metadata }: AddTrackMetadataInput,
  ): Promise<AddTrackMetadataPayload> {
    const track = await trackService.updateTrack(trackId, metadata);
    return { track };
  }
}
