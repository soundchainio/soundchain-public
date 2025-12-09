import mongoose from 'mongoose';
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
import { CurrencyType } from '../types/CurrencyType';

@Resolver(Track)
export class TrackResolver {
  @FieldResolver(() => String)
  playbackUrl(@Root() { muxAsset }: Track): string {
    return muxAsset ? `https://stream.mux.com/${muxAsset.playbackId}.m3u8` : '';
  }

  @FieldResolver(() => Number)
  playbackCount(@Ctx() { trackService }: Context, @Root() { _id: trackId, trackEditionId, playbackCount }: Track): Promise<number> {
    if (trackEditionId) {
      return trackService.playbackCount(trackId.toString(), trackEditionId);
    }
    return Promise.resolve(playbackCount);
  }

  @FieldResolver(() => String)
  async playbackCountFormatted(
    @Ctx() { trackService }: Context,
    @Root() { _id: trackId, trackEditionId, playbackCount }: Track,
  ): Promise<string> {
    const playbackCountToUse = trackEditionId ? await trackService.playbackCount(trackId.toString(), trackEditionId) : playbackCount;

    return playbackCountToUse ? new Intl.NumberFormat('en-US').format(playbackCountToUse) : '';
  }

  @FieldResolver(() => Number)
  async favoriteCount(@Ctx() { trackService }: Context, @Root() { _id: trackId, trackEditionId }: Track): Promise<number> {
    const result = await trackService.favoriteCount(trackId.toString(), trackEditionId);
    return result?.count ?? 0; // Safely extract count, default to 0 if undefined
  }

  @FieldResolver(() => Number)
  listingCount(@Ctx() { listingCountByTrackEdition }: Context, @Root() { trackEditionId }: Track): Promise<number> {
    if (!trackEditionId) return Promise.resolve(0);
    return listingCountByTrackEdition.load(trackEditionId);
  }

  @FieldResolver(() => TrackPrice)
  async price(@Ctx() { trackService, listingItemService }: Context, @Root() { trackEditionId, nftData }: Track): Promise<TrackPrice> {
    if (trackEditionId) {
      return listingItemService.getCheapestListingItem(trackEditionId);
    }
    if (!nftData || nftData.tokenId === undefined || !nftData.contract) {
      return { value: 0, currency: CurrencyType.MATIC }; // Return default price if nftData is missing
    }
    return trackService.priceToShow(nftData.tokenId, nftData.contract);
  }

  @FieldResolver(() => String)
  async saleType(@Ctx() { trackService }: Context, @Root() { nftData }: Track): Promise<string> {
    if (!nftData || nftData.tokenId === undefined || !nftData.contract) {
      return ''; // Return empty string if nftData is missing
    }
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
    return trackService.isFavorite(trackId.toString(), user.profileId.toString(), trackEditionId);
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

  @FieldResolver(() => TrackEdition, { nullable: true })
  async trackEdition(
    @Ctx() { trackEditionService }: Context,
    @Root() { trackEditionId }: Track,
  ): Promise<TrackEdition | null> {
    if (!trackEditionId) return null;
    try {
      return await trackEditionService.findOrFail(trackEditionId);
    } catch (error) {
      console.warn(`TrackEdition ${trackEditionId} not found`);
      return null;
    }
  }

  @FieldResolver(() => ListingItem, { nullable: true })
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Root() { nftData }: Track,
  ): Promise<ListingItem | void> {
    // CRITICAL: Check if nftData exists first before accessing properties
    if (!nftData || typeof nftData.tokenId !== 'number' || !nftData.contract) {
      return null;
    }
    const item = await listingItemService.getListingItem(nftData.tokenId, nftData.contract);
    if (!item) return undefined;

    // Transform AuctionItem or BuyNowItem to ListingItem
    const isAuctionItem = 'reservePrice' in item; // Type guard for AuctionItem
    return {
      _id: item._id,
      id: item._id.toString(),
      owner: item.owner,
      nft: item.nft,
      tokenId: item.tokenId,
      contract: item.nft || nftData.contract,
      selectedCurrency: 'selectedCurrency' in item ? item.selectedCurrency : 'MATIC',
      pricePerItem: 'pricePerItem' in item ? item.pricePerItem : item.reservePrice,
      pricePerItemToShow: 'pricePerItemToShow' in item ? item.pricePerItemToShow : item.reservePriceToShow,
      OGUNPricePerItem: 'OGUNPricePerItem' in item ? item.OGUNPricePerItem : '0',
      OGUNPricePerItemToShow: 'OGUNPricePerItemToShow' in item ? item.OGUNPricePerItemToShow : 0,
      acceptsMATIC: 'acceptsMATIC' in item ? item.acceptsMATIC : true,
      acceptsOGUN: 'acceptsOGUN' in item ? item.acceptsOGUN : item.isPaymentOGUN,
      startingTime: item.startingTime,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
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
    const [track, ...otherTracks] = await trackService.createMultipleTracks(profileId.toString(), {
      batchSize: input.batchSize,
      track: input.track,
    });
    if (input.createPost) {
      await postService.createPost({
        profileId: profileId.toString(),
        trackId: track._id.toString(),
        trackEditionId: track.trackEditionId,
      });
    }
    return {
      firstTrack: track,
      trackIds: [track._id.toString(), ...otherTracks.map(track => track._id.toString())],
    };
  }

  @Mutation(() => UpdateTrackPayload)
  @Authorized()
  async updateTrack(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackId, profileId, ...changes }: UpdateTrackInput,
  ): Promise<UpdateTrackPayload> {
    const trackChanges = {
      ...changes,
      ...(profileId && { profileId: new mongoose.Types.ObjectId(profileId) }),
    };
    const track = await trackService.updateTrack(new mongoose.Types.ObjectId(trackId), trackChanges);
    return { track };
  }

  @Mutation(() => UpdateEditionOwnedTracksPayload)
  @Authorized()
  async updateEditionOwnedTracks(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackIds, trackEditionId, owner, ...changes }: UpdateEditionOwnedTracksInput,
  ): Promise<UpdateEditionOwnedTracksPayload> {
    const tracks = await trackService.updateEditionOwnedTracks(trackIds, trackEditionId, owner, changes);
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

    const track = await trackService.deleteTrack(trackId, profileId.toString());
    return track;
  }

  @Mutation(() => ToggleFavoritePayload)
  @Authorized()
  async toggleFavorite(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('trackId') trackId: string,
  ): Promise<ToggleFavoritePayload> {
    const favoriteProfileTrack = await trackService.toggleFavorite(trackId, profileId.toString());
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
    const ids = favorites.map(item => new mongoose.Types.ObjectId(item.trackId.toString()));
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
