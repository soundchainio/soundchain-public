import mongoose from 'mongoose';
import { Asset } from '@mux/mux-node';
import { DocumentType } from '@typegoose/typegoose';
import dot from 'dot-object';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { FavoriteProfileTrack, FavoriteProfileTrackModel } from '../models/FavoriteProfileTrack';
import { FeedItemModel } from '../models/FeedItem';
import { NotificationModel } from '../models/Notification';
import { PendingTrackModel } from '../models/PendingTrack';
import { PostModel } from '../models/Post';
import { Track, TrackModel } from '../models/Track';
import { TrackEditionModel } from '../models/TrackEdition';
import { TrackWithListingItem } from '../models/TrackWithListingItem';
import { Context } from '../types/Context';
import { MAX_EDITION_SIZE } from '../types/CreateTrackEditionInput';
import { CurrencyType } from '../types/CurrencyType';
import { FilterBuyNowItemInput } from '../types/FilterBuyNowItemInput';
import { FilterOwnedTracksInput } from '../types/FilterOwnedTracksInput';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { FilterTrackMarketplace } from '../types/FilterTrackMarketplace';
import { NFTData } from '../types/NFTData';
import { PageInput } from '../types/PageInput';
import { PendingRequest } from '../types/PendingRequest';
import { SortListingItemInput } from '../types/SortListingItemInput';
import { SortOrder } from '../types/SortOrder';
import { SortTrackInput } from '../types/SortTrackInput';
import { TrackPrice } from '../types/TrackPrice';
import { getNow } from '../utils/Time';
import { ModelService } from './ModelService';

export interface FavoriteCount {
  count: number;
}

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Date ? T[P] : RecursivePartial<T[P]>;
};

type bulkType = {
  updateOne: {
    filter: {
      _id: mongoose.Types.ObjectId;
    };
    update: {
      $set: {
        playbackCount: number;
      };
    };
  };
};

export class TrackService extends ModelService<typeof Track> {
  constructor(context: Context) {
    super(context, TrackModel);
  }

  getTracks(filter?: FilterTrackInput, sort?: SortTrackInput, page?: PageInput): Promise<PaginateResult<Track>> {
    const defaultFilter = { title: { $exists: true }, deleted: false };
    const dotNotationFilter = filter && dot.dot(filter);
    const owner = filter?.nftData?.owner && {
      'nftData.owner': { $regex: `^${filter.nftData.owner}$`, $options: 'i' },
    };

    return this.paginate({ filter: { ...defaultFilter, ...dotNotationFilter, ...owner }, sort, page });
  }

  getOwnedTracks(
    filter?: FilterOwnedTracksInput,
    sort?: SortTrackInput,
    page?: PageInput,
  ): Promise<PaginateResult<Track>> {
    const defaultFilter = { title: { $exists: true }, deleted: false };
    const { owner: filterOwner, ...allFilters } = filter || {};
    const dotNotationFilter = allFilters && dot.dot(allFilters);
    const owner = filterOwner && {
      'nftData.owner': { $regex: `^${filterOwner}$`, $options: 'i' },
    };

    return this.paginate({ filter: { ...defaultFilter, ...dotNotationFilter, ...owner }, sort, page });
  }

  async getListableOwnedTracks(filter?: FilterOwnedTracksInput): Promise<PaginateResult<Track>> {
    const aggregation = [
      {
        $match: {
          trackEditionId: new mongoose.Types.ObjectId(filter?.trackEditionId),
          'nftData.owner': filter?.owner,
        },
      },
      {
        $lookup: {
          from: 'buynowitems',
          localField: 'nftData.tokenId',
          foreignField: 'tokenId',
          as: 'listingItem',
        },
      },
      {
        $project: {
          nftData: '$nftData',
          allListingItemsStatuses: '$listingItem.valid',
        },
      },
      {
        $match: {
          allListingItemsStatuses: { $ne: true },
        },
      },
    ];

    return this.paginatePipelineAggregated({
      aggregation,
      sort: undefined,
      page: {
        first: MAX_EDITION_SIZE,
      },
    });
  }

  async getGroupedTracks(filter?: FilterTrackInput, sort?: SortTrackInput, page?: PageInput): Promise<PaginateResult<Track>> {
    const defaultFilter = { title: { $exists: true }, deleted: false };
    const dotNotationFilter = filter && dot.dot(filter);
    const owner = filter?.nftData?.owner && {
      'nftData.owner': { $regex: `^${filter.nftData.owner}$`, $options: 'i' },
    };

    if (dotNotationFilter && dotNotationFilter['trackEditionId']) {
      dotNotationFilter['trackEditionId'] = new mongoose.Types.ObjectId(dotNotationFilter['trackEditionId']);
    }

    if (dotNotationFilter && dotNotationFilter['profileId']) {
      dotNotationFilter['profileId'] = new mongoose.Types.ObjectId(dotNotationFilter['profileId']);
    }

    const { first = 25, after } = page || {};
    const matchFilter = { ...defaultFilter, ...dotNotationFilter, ...owner };

    // Decode cursor for pagination
    const afterId = after ? Buffer.from(after, 'base64').toString('utf8') : null;

    // Use aggregation to group by trackEditionId at database level
    // This ensures we get `first` unique editions, not `first` individual tracks
    const aggregationPipeline: any[] = [
      { $match: matchFilter },
      { $sort: { createdAt: -1 } },
    ];

    // Group by trackEditionId (or _id if no edition), keeping first document in each group
    aggregationPipeline.push(
      {
        $group: {
          _id: { $ifNull: ['$trackEditionId', '$_id'] },
          doc: { $first: '$$ROOT' },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { createdAt: -1 } },
    );

    // Add cursor-based pagination: skip documents before the cursor
    if (afterId) {
      aggregationPipeline.push({
        $match: { createdAt: { $lt: new Date(afterId) } }
      });
    }

    // Fetch one extra to check for next page
    aggregationPipeline.push(
      { $limit: first + 1 },
      { $replaceRoot: { newRoot: '$doc' } }
    );

    const results = await this.model.aggregate(aggregationPipeline).exec();

    // Check if there are more results beyond the requested limit
    const hasMoreResults = results.length > first;
    const nodes = hasMoreResults ? results.slice(0, first) : results;

    // Count total unique editions/tracks
    const countPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: { $ifNull: ['$trackEditionId', '$_id'] },
        },
      },
      { $count: 'total' },
    ];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const totalCount = countResult[0]?.total || 0;

    return {
      nodes,
      pageInfo: {
        totalCount,
        hasNextPage: hasMoreResults,
        hasPreviousPage: afterId !== null,
        endCursor: nodes.length > 0 ? Buffer.from(nodes[nodes.length - 1].createdAt.toISOString()).toString('base64') : undefined,
      },
    };
  }

  getTrack(id: string): Promise<Track> {
    return this.findOrFail(id);
  }

  async getTrackFromEdition(id: string, trackEditionId?: string): Promise<Track> {
    const ors: any[] = [{ _id: id, deleted: false }];
    if (trackEditionId) {
      ors.push({ trackEditionId: new mongoose.Types.ObjectId(trackEditionId), deleted: false });
    }

    const entity = await this.model.findOne({ $or: ors });

    if (!entity) {
      return this.getTrack(id);
    }

    return entity;
  }

  async createTrack(profileId: string, data: Partial<Track>, asset: Asset): Promise<Track> {
    const track = new this.model({ profileId, ...data });
    track.muxAsset = { id: asset.id, playbackId: asset.playback_ids[0].id };

    await track.save();
    return track;
  }

  async createMultipleTracks(profileId: string, data: { track: Partial<Track>; batchSize: number }): Promise<Track[]> {
    const asset = await this.context.muxService.create(data.track.assetUrl, data.track._id?.toString());
    return await Promise.all(
      Array(data.batchSize)
        .fill(null)
        .map(() => this.createTrack(profileId, data.track, asset)),
    );
  }

  async updateTrackByTransactionHash(transactionHash: string, changes: RecursivePartial<Track>): Promise<void> {
    const { nftData: newNftData, ...data } = changes;

    const track = await this.model.updateOne(
      {
        'nftData.transactionHash': transactionHash,
        'nftData.tokenId': { $exists: false },
      },
      {
        $set: {
          ...data,
          'nftData.tokenId': newNftData?.tokenId,
          'nftData.contract': newNftData?.contract,
          'nftData.pendingRequest': newNftData?.pendingRequest,
        },
      },
    );

    if (track.modifiedCount === 0) {
      const trackPending = new PendingTrackModel({
        transactionHash,
        tokenId: newNftData?.tokenId,
        contract: newNftData?.contract,
      });
      await trackPending.save();
    }
  }

  async updateTrack(id: mongoose.Types.ObjectId, changes: RecursivePartial<Track>): Promise<Track> {
    const { nftData: newNftData, ...data } = changes;

    const track = await this.model.findByIdAndUpdate(id, data, { new: true });

    if (!track) {
      throw new NotFoundError('Track', id.toString());
    }
    return this.updateNftData(track, newNftData);
  }

  async updateEditionOwnedTracks(
    trackIds: string[],
    trackEditionId: string,
    owner: string,
    changes: RecursivePartial<Track>,
  ): Promise<Track[]> {
    const { nftData: newNftData, ...data } = changes;

    await TrackEditionModel.updateOne(
      { _id: trackEditionId },
      {
        $set: {
          'editinoData.pendingRequest': newNftData?.pendingRequest,
          'editionData.pendingTime': newNftData?.pendingTime,
        },
        $inc: {
          'editionData.pendingTrackCount': trackIds.length,
        },
      },
    );

    await this.model.updateMany(
      { _id: { $in: trackIds.map(id => new mongoose.Types.ObjectId(id)) }, 'nftData.owner': owner, trackEditionId },
      {
        ...data,
        $set: Object.keys(newNftData || {}).reduce((acc, key) => {
          acc[`nftData.${key}`] = (newNftData as any)[key];
          return acc;
        }, {} as any),
      },
      { new: true },
    );

    return await this.model.find({
      'nftData.owner': owner,
      trackEditionId,
    });
  }

  private async updateNftData(track: DocumentType<Track>, newNftData?: Partial<NFTData>): Promise<Track> {
    if (newNftData) {
      const trackAsData = track.toObject();
      const nftData = trackAsData.nftData;
      track.nftData = { ...nftData, ...newNftData };
      await track.save();
    }

    return track;
  }

  private updateNftDataByTransactionHash(transactionHash: string, nftData: Partial<NFTData>): Promise<any> {
    return this.model.updateOne(
      { 'nftData.transactionHash': transactionHash },
      {
        'nftData.tokenId': nftData.tokenId,
        'nftData.contract': nftData.contract,
        'nftData.pendingRequest': PendingRequest.None,
      },
    ).exec();
  }

  async deleteTrack(id: string, profileId: string): Promise<Track> {
    const track = await this.model.findOneAndUpdate({ _id: id, profileId }, { deleted: true });
    if (!track) {
      throw new NotFoundError('Track', id);
    }
    if (track.trackEditionId) {
      const trackEditionId = track.trackEditionId;
      const hasValidTracks = await this.model.find({ trackEditionId, deleted: false }).countDocuments();
      if (!hasValidTracks) {
        await TrackEditionModel.updateOne({ _id: trackEditionId }, { deleted: true });
      }
    }
    return track;
  }

  async deleteTrackByAdmin(id: string): Promise<Track> {
    const track = await this.model.findOneAndUpdate({ _id: id }, { deleted: true });
    if (!track) {
      throw new NotFoundError('Track', id);
    }
    if (track.trackEditionId) {
      const trackEditionId = track.trackEditionId;
      const hasValidTracks = await this.model.find({ trackEditionId, deleted: false }).countDocuments();
      if (!hasValidTracks) {
        await TrackEditionModel.updateOne({ _id: trackEditionId }, { deleted: true });
      }
    }
    return track;
  }

  async deleteEditionTrack(profileId: string, trackEditionId: string): Promise<Track[]> {
    const res = await this.model.updateMany({ profileId, trackEditionId }, { deleted: true });
    const trackEdition = await TrackEditionModel.findById(trackEditionId);
    if (trackEdition && trackEdition.editionSize === res.modifiedCount) {
      await TrackEditionModel.updateOne({ _id: trackEditionId }, { deleted: true });
    }
    return this.model.find({ trackEditionId });
  }

  async deleteTrackEditionByAdmin(trackEditionId: string): Promise<Track[]> {
    await TrackEditionModel.updateOne({ _id: trackEditionId }, { deleted: true });
    await this.model.updateMany({ trackEditionId }, { deleted: true });
    return this.model.find({ trackEditionId });
  }

  async deleteTrackOnError(id: string): Promise<Track> {
    const posts = await PostModel.find({ trackId: id });
    const postsIds = posts.map(post => post.id);

    await NotificationModel.deleteMany({ 'metadata.trackId': id });

    if (posts.length > 0) {
      await PostModel.deleteMany({ _id: { $in: postsIds } });
      await FeedItemModel.deleteMany({ postId: { $in: postsIds } });
    }

    const track = await this.model.findOneAndDelete({ _id: id });
    if (!track) {
      throw new NotFoundError('Track', id);
    }
    return track;
  }

  async incrementPlaybackCount(values: { trackId: string; amount: number }[]): Promise<number> {
    const bulkOps: bulkType[] = [];

    for (let index = 0; index < values.length; index++) {
      const element = values[index];
      if (mongoose.Types.ObjectId.isValid(element.trackId)) {
        bulkOps.push({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(element.trackId) },
            update: { $set: { playbackCount: element.amount } },
          },
        });
      }
    }

    const result = await this.model.bulkWrite(bulkOps);
    return result.modifiedCount;
  }

  async setPendingNone(tokenId: number, contractAddress: string): Promise<Track> {
    const track = await this.model.findOneAndUpdate(
      { 'nftData.tokenId': tokenId, 'nftData.contract': contractAddress },
      { 'nftData.pendingRequest': PendingRequest.None },
    );
    if (!track) {
      throw new NotFoundError('Track', `tokenId: ${tokenId}, contract: ${contractAddress}`);
    }
    return track;
  }

  async getTrackByTokenId(tokenId: number, contractAddress: string): Promise<Track> {
    const track = await this.model.findOne({ 'nftData.tokenId': tokenId, 'nftData.contract': contractAddress });
    if (!track) {
      throw new NotFoundError('Track', `tokenId: ${tokenId}, contract: ${contractAddress}`);
    }
    return track;
  }

  async updateOwnerByTokenId(tokenId: number, owner: string, contractAddress: string): Promise<Track> {
    const track = await this.model.findOne({ 'nftData.tokenId': tokenId, 'nftData.contract': contractAddress });
    if (!track) {
      throw new NotFoundError('Track', `tokenId: ${tokenId}, contract: ${contractAddress}`);
    }
    const { id } = track;
    const { profileId } = await this.context.userService.getUserByWallet(owner);
    return await this.updateTrack(id, { nftData: { owner }, profileId });
  }

  async isFavorite(trackId: string, profileId: string, trackEditionId: string): Promise<boolean> {
    const ors: any[] = [{ trackId }];
    if (trackEditionId) {
      ors.push({ trackEditionId });
    }

    return !!(await FavoriteProfileTrackModel.exists({
      $or: ors,
      profileId,
    }));
  }

  async toggleFavorite(trackId: string, profileId: string): Promise<FavoriteProfileTrack> {
    const track = await this.model.findOne({ _id: trackId });

    if (!track) {
      throw new NotFoundError('Track', trackId);
    }

    const ors: any[] = [{ trackId }];

    if (track.trackEditionId) {
      ors.push({ trackEditionId: track.trackEditionId });
    }

    const findParams = {
      $or: ors,
      profileId,
    };

    const favTrack = await FavoriteProfileTrackModel.findOne(findParams);
    if (favTrack?.id) {
      return await FavoriteProfileTrackModel.findOneAndDelete(findParams);
    } else {
      const favorite = new FavoriteProfileTrackModel({
        profileId,
        trackId,
        trackEditionId: track.trackEditionId,
      });
      await favorite.save();
      return favorite;
    }
  }

  getFavoriteTracks(
    ids: mongoose.Types.ObjectId[],
    search?: string,
    sort?: SortTrackInput,
    page?: PageInput,
  ): Promise<PaginateResult<Track>> {
    const regex = new RegExp(search || '', 'i');

    const filter = {
      $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }],
    };

    return this.paginate({
      filter: { _id: { $in: ids }, title: { $exists: true }, deleted: false, ...filter },
      sort,
      page,
    });
  }

  async favoriteCount(trackId: string, trackEditionId: string): Promise<FavoriteCount> {
    const ors: any[] = [{ trackId: trackId.toString() }];

    if (trackEditionId) {
      ors.push({ trackEditionId: trackEditionId.toString() });
    }

    const favTrack = await FavoriteProfileTrackModel.aggregate([
      {
        $match: {
          $or: ors,
        },
      },
      {
        $count: 'trackId',
      },
      {
        $project: {
          count: '$trackId',
        },
      },
    ]);
    return favTrack.length ? favTrack[0] : { count: 0 };
  }

  async playbackCount(trackId: string, trackEditionId: string): Promise<number> {
    const ors: any[] = [{ _id: new mongoose.Types.ObjectId(trackId) }];

    if (trackEditionId) {
      ors.push({ trackEditionId: new mongoose.Types.ObjectId(trackEditionId) });
    }

    const trackQuery = await this.model.aggregate([
      {
        $match: {
          $or: ors,
        },
      },
      {
        $group: {
          _id: {
            $ifNull: ['$trackEditionId', '$_id'],
          },
          totalPlaybackCount: {
            $sum: '$playbackCount',
          },
        },
      },
      {
        $project: {
          sum: '$totalPlaybackCount',
        },
      },
    ]);

    return trackQuery.length ? trackQuery[0].sum : 0;
  }

  async saleType(tokenId: number, contractAddress: string): Promise<string> {
    const listing = await this.context.listingItemService.getActiveListingItem(tokenId, contractAddress);
    if (!listing) {
      return '';
    }

    // Type guard to distinguish between AuctionItem and BuyNowItem
    if ('endingTime' in listing) {
      return 'auction';
    } else if ('pricePerItem' in listing) {
      return 'buy now';
    }
    return '';
  }

  async priceToShow(tokenId: number, contractAddress: string): Promise<TrackPrice> {
    const listing = await this.context.listingItemService.getActiveListingItem(tokenId, contractAddress);
    if (!listing) {
      return { value: 0, currency: CurrencyType.MATIC };
    }

    let value: number;
    if ('reservePriceToShow' in listing) {
      // AuctionItem
      value =
        (await this.context.auctionItemService.getHighestBid(listing._id.toString())) ||
        (listing as any).reservePriceToShow;
    } else {
      // BuyNowItem
      value = (listing as any).pricePerItemToShow;
    }

    return { value, currency: CurrencyType.MATIC };
  }

  getListingItems(
    filter?: FilterTrackMarketplace,
    sort?: SortListingItemInput,
    page?: PageInput,
  ): Promise<PaginateResult<TrackWithListingItem>> {
    const now = getNow();
    const aggregation = [
      {
        $lookup: {
          from: 'buynowitems',
          localField: 'nftData.tokenId',
          foreignField: 'tokenId',
          as: 'buynowitem',
        },
      },
      {
        $addFields: {
          buynowitem: {
            $filter: {
              input: '$buynowitem',
              as: 'item',
              cond: {
                $eq: ['$$item.nft', '$nftData.contract'],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'auctionitems',
          localField: 'nftData.tokenId',
          foreignField: 'tokenId',
          as: 'auctionitem',
        },
      },
      {
        $addFields: {
          auctionitem: {
            $filter: {
              input: '$auctionitem',
              as: 'item',
              cond: {
                $eq: ['$$item.nft', '$nftData.contract'],
              },
            },
          },
        },
      },
      {
        $addFields: {
          auctionitem: {
            $filter: {
              input: '$auctionitem',
              as: 'item',
              cond: {
                $and: [
                  {
                    $eq: ['$$item.valid', true],
                  },
                  {
                    $gte: ['$$item.endingTime', now],
                  },
                ],
              },
            },
          },
          buynowitem: {
            $filter: {
              input: '$buynowitem',
              as: 'item',
              cond: {
                $and: [
                  {
                    $eq: ['$$item.valid', true],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          listingItem: {
            $concatArrays: ['$auctionitem', '$buynowitem'],
          },
        },
      },
      {
        $project: {
          buynowitem: 0,
          auctionitem: 0,
        },
      },
      {
        $unwind: {
          path: '$listingItem',
          preserveNullAndEmptyArrays: true, // FIX: Keep tracks without active listings
        },
      },
      {
        $addFields: {
          'listingItem.priceToShow': {
            $ifNull: [
              '$listingItem.highestBidToShow',
              {
                $ifNull: ['$listingItem.reservePriceToShow', '$listingItem.pricePerItemToShow'],
              },
            ],
          },
          'listingItem.saleType': {
            $cond: {
              if: {
                $ne: [
                  {
                    $type: '$listingItem.reservePrice',
                  },
                  'missing',
                ],
              },
              then: 'auction',
              else: 'buy_now',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $ifNull: ['$trackEditionId', '$_id'],
          },
          lowestPrice: {
            $min: '$listingItem.pricePerItem',
          },
          detail: {
            $first: '$$ROOT',
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$detail',
              {
                lowestPrice: '$lowestPrice',
              },
            ],
          },
        },
      },
    ];
    let dotNotationFilter;
    if (filter) {
      const filterClone = JSON.parse(JSON.stringify(filter));
      delete filterClone.genres;
      dotNotationFilter = filter.listingItem && dot.dot(filterClone);
    }
    return this.paginatePipelineAggregated({
      aggregation,
      filter: filter ? { ...(filter.genres && { genres: filter.genres }), ...dotNotationFilter, deleted: false } : {},
      sort,
      page,
    });
  }

  getBuyNowlistingItems(
    filter?: FilterBuyNowItemInput,
    page?: PageInput,
  ): Promise<PaginateResult<TrackWithListingItem>> {
    const aggregation = [
      {
        $lookup: {
          from: 'buynowitems',
          localField: 'nftData.tokenId',
          foreignField: 'tokenId',
          as: 'listingItem',
        },
      },
      {
        $addFields: {
          listingItem: {
            $filter: {
              input: '$listingItem',
              as: 'item',
              cond: {
                $eq: ['$$item.nft', '$nftData.contract'],
              },
            },
          },
        },
      },
      {
        $addFields: {
          listingItem: {
            $filter: {
              input: '$listingItem',
              as: 'item',
              cond: {
                $and: [
                  {
                    $eq: ['$$item.valid', true],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: '$listingItem',
          preserveNullAndEmptyArrays: true, // FIX: Keep tracks without active listings
        },
      },
    ];

    const queryFilter: any = { deleted: false, trackEditionId: new mongoose.Types.ObjectId(filter?.trackEdition) };
    const owner = filter?.nftData?.owner && {
      'nftData.owner': { $regex: `^${filter.nftData.owner}$`, $options: 'i' },
    };

    return this.paginatePipelineAggregated({
      aggregation,
      filter: { ...queryFilter, ...owner },
      sort: { field: 'listingItem.pricePerItemToShow', order: SortOrder.ASC },
      page,
    });
  }

  async resetPending(beforeTime: Date): Promise<void> {
    await this.model.updateMany(
      {
        'nftData.pendingRequest': { $ne: PendingRequest.None },
        'nftData.pendingTime': { $lte: beforeTime },
      },
      { 'nftData.pendingRequest': PendingRequest.None },
    );
  }

  async processPendingTrack(): Promise<void> {
    const pendingTracks = await PendingTrackModel.find({ processed: false });
    for (const { transactionHash, tokenId, contract, _id } of pendingTracks) {
      const updatedTrack = await this.updateNftDataByTransactionHash(transactionHash, {
        tokenId,
        contract,
      });
      if (!updatedTrack) {
        continue;
      }
      await PendingTrackModel.updateOne({ _id }, { processed: true });
    }
  }
}
