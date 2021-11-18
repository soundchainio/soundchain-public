import { ObjectId } from 'mongodb';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { FavoriteProfileTrackModel } from '../models/FavoriteProfileTrack';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateTrackInput as CreateTrackInput } from '../types/CreateTrackInput';
import { CreateTrackPayload } from '../types/CreateTrackPayload';
import { DeleteTrackInput } from '../types/DeleteTrackInput';
import { DeleteTrackPayload } from '../types/DeleteTrackPayload';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { PageInput } from '../types/PageInput';
import { SortTrackInput } from '../types/SortTrackInput';
import { ToggleFavoritePayload } from '../types/ToggleFavoritePayload';
import { TrackConnection } from '../types/TrackConnection';
import { UpdateTrackInput } from '../types/UpdateTrackInput';
import { UpdateTrackPayload } from '../types/UpdateTrackPayload';

@Resolver(Track)
export class TrackResolver {
  @FieldResolver(() => String)
  playbackUrl(@Root() { muxAsset }: Track): string {
    return muxAsset ? `https://stream.mux.com/${muxAsset.playbackId}.m3u8` : '';
  }

  @FieldResolver(() => String)
  playbackCountFormatted(@Root() { playbackCount }: Track): string {
    return playbackCount ? new Intl.NumberFormat('en-US').format(playbackCount) : '';
  }

  @FieldResolver(() => Boolean)
  isFavorite(
    @Ctx() { trackService }: Context,
    @Root() { _id: trackId }: Track,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    return trackService.isFavorite(trackId, user.profileId);
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

  @Mutation(() => CreateTrackPayload)
  @Authorized()
  async createTrack(
    @Ctx() { trackService, postService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateTrackInput,
  ): Promise<CreateTrackPayload> {
    const track = await trackService.createTrack(profileId, input);
    await postService.createPost({ profileId, trackId: track._id });
    return { track };
  }

  @Mutation(() => UpdateTrackPayload)
  @Authorized()
  async updateTrack(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackId, ...changes }: UpdateTrackInput,
  ): Promise<UpdateTrackPayload> {
    const track = await trackService.updateTrack(trackId, changes);
    return { track };
  }

  @Mutation(() => UpdateTrackPayload)
  @Authorized()
  async deleteTrackOnError(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackId }: DeleteTrackInput,
  ): Promise<DeleteTrackPayload> {
    const track = await trackService.deleteTrackOnError(trackId);
    return { track };
  }

  @Mutation(() => ToggleFavoritePayload)
  @Authorized()
  async toggleFavorite(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('trackId') trackId: string,
  ): Promise<ToggleFavoritePayload> {
    const favoriteProfileTrack = await trackService.toggleFavorite(trackId, profileId);
    return { favoriteProfileTrack };
  }

  @Query(() => TrackConnection)
  async favoriteTracks(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('search', { nullable: true }) search?: string,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    const favorites = await FavoriteProfileTrackModel.find({ profileId });
    const ids = favorites.map(item => new ObjectId(item.trackId));
    return trackService.getFavoriteTracks(ids, search, sort, page);
  }
}
