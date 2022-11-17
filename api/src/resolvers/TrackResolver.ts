import { ObjectId } from 'mongodb';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { FavoriteProfileTrackModel } from '../models/FavoriteProfileTrack';
import { ListingItem } from '../models/ListingItem';
import { Track } from '../models/Track';
import { TrackEdition } from '../models/TrackEdition';
import { User } from '../models/User';
import { FavoriteCount } from '../services/TrackService';
import { Context } from '../types/Context';
import { CreateMultipleTracksInput } from '../types/CreateMultipleTracksInput';
import { CreateMultipleTracksPayload } from '../types/CreateMultipleTracksPayload';
import { MAX_EDITION_SIZE } from '../types/CreateTrackEditionInput';
import { DeleteTrackInput } from '../types/DeleteTrackInput';
import { DeleteTrackPayload } from '../types/DeleteTrackPayload';
import { FilterBuyNowItemInput } from '../types/FilterBuyNowItemInput';
import { FilterOwnedBuyNowItemInput } from '../types/FilterOwnedBuyNowItemInput';
import { FilterOwnedTracksInput } from '../types/FilterOwnedTracksInput';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { FilterTrackMarketplace } from '../types/FilterTrackMarketplace';
import { ListingItemConnection } from '../types/ListingItemConnection';
import { PageInput } from '../types/PageInput';
import { Role } from '../types/Role';
import { SortListingItemInput } from '../types/SortListingItemInput';
import { SortTrackInput } from '../types/SortTrackInput';
import { ToggleFavoritePayload } from '../types/ToggleFavoritePayload';
import { TrackConnection } from '../types/TrackConnection';
import { UpdateEditionOwnedTracksInput } from '../types/UpdateEditionOwnedTracksInput';
import { UpdateEditionOwnedTracksPayload } from '../types/UpdateEditionOwnedTracksPayload';
import { UpdateTrackInput } from '../types/UpdateTrackInput';
import { UpdateTrackPayload } from '../types/UpdateTrackPayload';
import { TrackPrice } from '../types/TrackPrice';

@Resolver(Track)
export class TrackResolver {
  @FieldResolver(() => String)
  playbackUrl(@Root() { muxAsset }: Track): string {
    return muxAsset ? `https://stream.mux.com/${muxAsset.playbackId}.m3u8` : '';
  }

  @FieldResolver(() => Number)
  playbackCount(@Ctx() { trackService }: Context, @Root() { _id: trackId, trackEditionId, playbackCount }: Track): Promise<number> {
    if (trackEditionId) {
      return trackService.playbackCount(trackId, trackEditionId);
    }
    return Promise.resolve(playbackCount)
  }

  @FieldResolver(() => String)
  async playbackCountFormatted(
    @Ctx() { trackService }: Context,
    @Root() { _id: trackId, trackEditionId, playbackCount }: Track,
  ): Promise<string> {
    const playbackCountToUse = trackEditionId ? await trackService.playbackCount(trackId, trackEditionId) : playbackCount;

    return playbackCountToUse ? new Intl.NumberFormat('en-US').format(playbackCountToUse) : '';
  }

  @FieldResolver(() => Number)
  favoriteCount(@Ctx() { trackService }: Context, @Root() { _id: trackId, trackEditionId }: Track): Promise<FavoriteCount> {
    return trackService.favoriteCount(trackId, trackEditionId);
  }

  @FieldResolver(() => Number)
  listingCount(@Ctx() { listingCountByTrackEdition }: Context, @Root() { trackEditionId }: Track): Promise<number> {
    if(!trackEditionId) return Promise.resolve(0)
    return listingCountByTrackEdition.load(trackEditionId);
  }

  @FieldResolver(() => TrackPrice)
  price(@Ctx() { trackService, listingItemService }: Context, @Root() { trackEditionId, nftData }: Track): Promise<TrackPrice> {
    if(trackEditionId) {
      return listingItemService.getCheapestListingItem(trackEditionId)
    }
    return trackService.priceToShow(nftData.tokenId, nftData.contract);
  }

  @FieldResolver(() => String)
  saleType(@Ctx() { trackService }: Context, @Root() { nftData }: Track): Promise<string> {
    return trackService.saleType(nftData.tokenId, nftData.contract);
  }

  @FieldResolver(() => Boolean)
  isFavorite(
    @Ctx() { trackService }: Context,
    @Root() { _id: trackId, trackEditionId }: Track,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }
    return trackService.isFavorite(trackId, user.profileId, trackEditionId);
  }

  @FieldResolver(() => Number)
  editionSize(
    @Ctx() { trackEditionService }: Context,
    @Root() { trackEditionId }: Track,
  ): Promise<number> {
    return trackEditionId
      ? trackEditionService.getEditionSize(trackEditionId)
      : Promise.resolve(0);
  }

  @FieldResolver(() => TrackEdition)
  trackEdition(
    @Ctx() { trackEditionService }: Context,
    @Root() { trackEditionId }: Track,
  ): Promise<TrackEdition> {
    return trackEditionId
      ? trackEditionService.findOrFail(trackEditionId)
      : null;
  }

  @FieldResolver(() => ListingItem, { nullable: true })
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Root() { nftData }: Track,
  ): Promise<ListingItem | void> {
    if (typeof nftData.tokenId !== 'number' || !nftData.contract) {
      return;
    }
    return listingItemService.getListingItem(nftData.tokenId, nftData.contract);
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

  @Query(() => TrackConnection)
  @Authorized()
  async ownedTracks(
    @Ctx() { trackService }: Context,
    @Arg('filter') filter?: FilterOwnedTracksInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getOwnedTracks({
        trackEditionId: filter.trackEditionId,
        owner: filter.owner,
      },
      undefined,
      page,
    );
  }

  @Query(() => TrackConnection)
  @Authorized()
  async listableOwnedTracks(
    @Ctx() { trackService }: Context,
    @Arg('filter') filter?: FilterOwnedTracksInput,
  ): Promise<TrackConnection> {
    return trackService.getListableOwnedTracks(filter);
  }

  @Query(() => TrackConnection)
  groupedTracks(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackInput,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getGroupedTracks(filter, sort, page);
  }

  @Mutation(() => CreateMultipleTracksPayload)
  @Authorized()
  async createMultipleTracks(
    @Ctx() { trackService, postService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateMultipleTracksInput,
  ): Promise<CreateMultipleTracksPayload> {
    const [track, ...otherTracks] = await trackService.createMultipleTracks(profileId, {
      batchSize: input.batchSize,
      track: input.track,
    });
    if (input.createPost) {
      await postService.createPost({
        profileId,
        trackId: track._id,
        trackEditionId: track.trackEditionId,
      });
    }
    return {
      firstTrack: track,
      trackEditionIds: [track._id, ...otherTracks.map(track => track._id)],
    };
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

  @Mutation(() => UpdateEditionOwnedTracksPayload)
  @Authorized()
  async updateEditionOwnedTracks(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackEditionIds, trackEditionId, owner, ...changes }: UpdateEditionOwnedTracksInput,
  ): Promise<UpdateEditionOwnedTracksPayload> {
    const tracks = await trackService.updateEditionOwnedTracks(trackEditionIds, trackEditionId, owner, changes);
    return { tracks };
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

  @Mutation(() => Track)
  @Authorized()
  async deleteTrack(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId, roles }: User,
    @Arg('trackId') trackId: string,
  ): Promise<Track> {
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes(Role.TEAM_MEMBER);

    if (isAdmin) {
      const track = await trackService.deleteTrackByAdmin(trackId);
      return track;
    }

    const track = await trackService.deleteTrack(trackId, profileId);
    return track;
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

  @Query(() => ListingItemConnection)
  listingItems(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackMarketplace,
    @Arg('sort', { nullable: true }) sort?: SortListingItemInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ListingItemConnection> {
    return trackService.getListingItems(filter, sort, page);
  }

  @Query(() => ListingItemConnection)
  buyNowListingItems(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterBuyNowItemInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ListingItemConnection> {
    return trackService.getBuyNowlistingItems(filter, page);
  }

  @Query(() => ListingItemConnection)
  ownedBuyNowListingItems(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterOwnedBuyNowItemInput,
  ): Promise<ListingItemConnection> {
    return trackService.getBuyNowlistingItems({
      trackEdition: filter.trackEditionId,
      nftData: {
        owner: filter.owner,
      }
    }, { first: MAX_EDITION_SIZE });
  }
}
