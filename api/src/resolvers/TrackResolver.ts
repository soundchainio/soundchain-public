import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { AddTrackMetadataInput } from '../types/AddTrackMetadataInput';
import { AddTrackMetadataPayload } from '../types/AddTrackMetadataPayload';
import { Context } from '../types/Context';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { PageInput } from '../types/PageInput';
import { SortTrackInput } from '../types/SortTrackInput';
import { TrackConnection } from '../types/TrackConnection';
import { UploadTrackInput } from '../types/UploadTrackInput';
import { UploadTrackPayload } from '../types/UploadTrackPayload';

@Resolver(Track)
export class TrackResolver {
  @FieldResolver(() => String)
  playbackUrl(@Root() { muxAsset }: Track): string {
    return `https://stream.mux.com/${muxAsset.playbackId}.m3u8`;
  }

  @Query(() => Track)
  track(@Ctx() { trackService }: Context, @Arg('id') id: string): Promise<Track> {
    return trackService.getTrack(id);
  }

  @Query(() => TrackConnection)
  tracks(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackInput,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getTracks(filter, sort, page);
  }

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
    @Ctx() { trackService, postService }: Context,
    @Arg('input') { trackId, ...metadata }: AddTrackMetadataInput,
  ): Promise<AddTrackMetadataPayload> {
    const track = await trackService.updateTrack(trackId, metadata);
    await postService.createPost({ profileId: track.profileId, trackId });
    return { track };
  }
}
