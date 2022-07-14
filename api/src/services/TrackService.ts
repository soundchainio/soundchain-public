import { Asset } from '@mux/mux-node';
import { DocumentType, mongoose } from '@typegoose/typegoose';
import dot from 'dot-object';
import { ObjectId } from 'mongodb';
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
import { FilterBuyNowItemInput } from '../types/FilterBuyNowItemInput';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { FilterTrackMarketplace } from '../types/FilterTrackMarketplace';
import { NFTData } from '../types/NFTData';
import { PageInput } from '../types/PageInput';
import { PendingRequest } from '../types/PendingRequest';
import { SortListingItemInput } from '../types/SortListingItemInput';
import { SortTrackInput } from '../types/SortTrackInput';
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
      _id: string;
    };
    update: {
      $inc: {
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

  getTrack(id: string): Promise<Track> {
    return this.findOrFail(id);
  }

  async createTrack(profileId: string, data: Partial<Track>, asset: Asset): Promise<Track> {
    const track = new this.model({ profileId, ...data });
    track.muxAsset = { id: asset.id, playbackId: asset.playback_ids[0].id };
    await track.save();
    return track;
  }

  async createMultipleTracks(profileId: string, data: { track: Partial<Track>; editionSize: number }): Promise<Track[]> {
    const asset = await this.context.muxService.create(data.track.assetUrl, data.track._id);
    return await Promise.all(
      Array(data.editionSize)
        .fill(null)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(_ => {
          return this.createTrack(profileId, data.track, asset);
        }),
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
          'nftData.tokenId': newNftData.tokenId,
          'nftData.contract': newNftData.contract,
          'nftData.pendingRequest': newNftData.pendingRequest,
        },
      },
    );

    if (track.nModified === 0) {
      const trackPending = new PendingTrackModel({
        transactionHash,
        tokenId: newNftData.tokenId,
        contract: newNftData.contract,
      });
      await trackPending.save();
    }
  }

  async updateTrack(id: string, changes: RecursivePartial<Track>): Promise<Track> {
    const { nftData: newNftData, ...data } = changes;

    const track = await this.model.findByIdAndUpdate(id, data, { new: true });

    if (!track) {
      throw new NotFoundError('Track', id);
    }
    return this.updateNftData(track, newNftData);
  }

  async updateEditionOwnedTracks(trackEditionId: string, owner: string, changes: RecursivePartial<Track>): Promise<Track[]> {
    const { nftData: newNftData, ...data } = changes;

    await TrackEditionModel.updateOne({ _id: trackEditionId },
      {
        $set: {
          'editinoData.pendingRequest': newNftData.pendingRequest,
          'editionData.pendingTime': newNftData.pendingTime,
        }
      }
    );

    await this.model.updateMany(
      { 'nftData.owner': owner, trackEditionId: trackEditionId },
      {
        ...data,
        $set: Object.keys(newNftData).reduce((acc, key) => {
          acc[`nftData.${key}`] = (newNftData as any)[key];
          return acc;
        }, {} as any)
      },
      { new: true },
    )

    return await this.model.find({
      'nftData.owner': owner,
      trackEditionId: trackEditionId,
    })
  }

  async updateTracksByTransactionHash(transactionHash: string, changes: RecursivePartial<Track>): Promise<number> {
    return await this.model.updateMany({ 'nftData.transactionHash': transactionHash }, { ...changes });
  }

  private async updateNftData(track: DocumentType<Track>, newNftData?: Partial<NFTData>) {
    if (newNftData) {
      const trackAsData = track.toObject();
      const nftData = trackAsData.nftData;
      track.nftData = { ...nftData, ...newNftData };
      await track.save();
    }

    return track;
  }

  private updateNftDataByTransactionHash(transactionHash: string, nftData: Partial<NFTData>) {
    return this.model.updateOne(
      { 'nftData.transactionHash': transactionHash },
      {
        'nftData.tokenId': nftData.tokenId,
        'nftData.contract': nftData.contract,
        'nftData.pendingRequest': PendingRequest.None,
      },
    );
  }

  async deleteTrack(id: string, profileId: string): Promise<Track> {
    return await this.model.findOneAndUpdate({ _id: id, profileId }, { deleted: true });
  }

  async deleteTrackByAdmin(id: string): Promise<Track> {
    return await this.model.findOneAndUpdate({ _id: id }, { deleted: true });
  }

  async deleteTrackOnError(id: string): Promise<Track> {
    const posts = await PostModel.find({ trackId: id });
    const postsIds = posts.map(post => post.id);

    await NotificationModel.deleteMany({ 'metadata.trackId': id });

    if (posts) {
      await PostModel.deleteMany({ _id: { $in: postsIds } });
      await FeedItemModel.deleteMany({ postId: { $in: postsIds } });
    }

    return await this.model.findOneAndDelete({ _id: id });
  }

  async incrementPlaybackCount(values: { trackId: string; amount: number }[]): Promise<number> {
    const bulkOps: bulkType[] = [];

    for (let index = 0; index < values.length; index++) {
      const element = values[index];
      if (mongoose.Types.ObjectId.isValid(element.trackId)) {
        bulkOps.push({
          updateOne: { filter: { _id: element.trackId }, update: { $inc: { playbackCount: element.amount } } },
        });
      }
    }

    const result = await this.model.bulkWrite(bulkOps);
    return result.modifiedCount;
  }

  async setPendingNone(tokenId: number, contractAddress: string): Promise<Track> {
    return await this.model.findOneAndUpdate(
      { 'nftData.tokenId': tokenId, 'nftData.contract': contractAddress },
      { 'nftData.pendingRequest': PendingRequest.None },
    );
  }

  async getTrackByTokenId(tokenId: number, contractAddress: string): Promise<Track> {
    return await this.model.findOne({ 'nftData.tokenId': tokenId, 'nftData.contract': contractAddress });
  }

  async updateOwnerByTokenId(tokenId: number, owner: string, contractAddress: string): Promise<Track> {
    const { id } = await this.model.findOne({ 'nftData.tokenId': tokenId, 'nftData.contract': contractAddress });
    return await this.updateTrack(id, { nftData: { owner } });
  }

  async isFavorite(trackId: string, profileId: string, trackTransactionHash: string): Promise<boolean> {
    return await FavoriteProfileTrackModel.exists({
      $or: [{ trackId }, { trackTransactionHash }],
      profileId,
    });
  }

  async toggleFavorite(trackId: string, profileId: string): Promise<FavoriteProfileTrack> {
    const track = await this.model.findOne({ _id: trackId });

    const findParams = {
      $or: [{ trackId }, { trackTransactionHash: track.nftData.transactionHash }],
      profileId,
    };

    const favTrack = await FavoriteProfileTrackModel.findOne(findParams);
    if (favTrack?.id) {
      return await FavoriteProfileTrackModel.findOneAndDelete(findParams);
    } else {
      const favorite = new FavoriteProfileTrackModel({
        profileId,
        trackId,
        trackTransactionHash: track.nftData.transactionHash,
      });
      await favorite.save();
      return favorite;
    }
  }

  getFavoriteTracks(
    ids: ObjectId[],
    search?: string,
    sort?: SortTrackInput,
    page?: PageInput,
  ): Promise<PaginateResult<Track>> {
    const regex = new RegExp(search, 'i');

    const filter = {
      $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }],
    };

    return this.paginate({
      filter: { _id: { $in: ids }, title: { $exists: true }, deleted: false, ...filter },
      sort,
      page,
    });
  }

  async favoriteCount(trackId: string, trackTransactionHash: string): Promise<FavoriteCount> {
    const favTrack = await FavoriteProfileTrackModel.aggregate([
      {
        $match: {
          $or: [{ trackId: trackId.toString() }, { trackTransactionHash: trackTransactionHash.toString() }],
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
    return favTrack.length ? favTrack[0].count : 0;
  }

  async playbackCount(trackId: string, trackTransactionHash: string): Promise<number> {
    const trackQuery = await this.model.aggregate([
      {
        $match: {
          $or: [{ trackId: trackId.toString() }, { 'nftData.transactionHash': trackTransactionHash.toString() }],
        },
      },
      {
        $group: {
          _id: '$nftData.transactionHash',
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
    const { endingTime, pricePerItem } = listing;
    return (endingTime && 'auction') || (pricePerItem && 'buy now') || '';
  }

  async priceToShow(tokenId: number, contractAddress: string): Promise<number> {
    const listing = await this.context.listingItemService.getActiveListingItem(tokenId, contractAddress);
    if (!listing) {
      return 0;
    }
    const { pricePerItemToShow, reservePriceToShow } = listing;
    return reservePriceToShow
      ? (await this.context.auctionItemService.getHighestBid(listing._id)) || reservePriceToShow
      : pricePerItemToShow;
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
          _id: '$nftData.transactionHash',
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
    sort?: SortListingItemInput,
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
        },
      },
    ];
    return this.paginatePipelineAggregated({
      aggregation,
      filter: { deleted: false, trackEditionId: new ObjectId(filter.trackEdition) },
      sort,
      page,
    });
  }

  async resetPending(beforeTime: Date): Promise<void> {
    return this.model.updateMany(
      {
        'nftData.pendingRequest': { $ne: PendingRequest.None },
        'nftData.pendingTime': { $lte: beforeTime },
      },
      { 'nftData.pendingRequest': PendingRequest.None },
    );
  }

  async processPendingTrack(): Promise<void> {
    const pendingTracks = await PendingTrackModel.find({ processed: false });
    pendingTracks.forEach(async ({ transactionHash, tokenId, contract, _id }) => {
      const updatedTrack = await this.updateNftDataByTransactionHash(transactionHash, {
        tokenId,
        contract,
      });
      if (!updatedTrack) {
        return;
      }
      await PendingTrackModel.updateOne({ _id }, { processed: true });
    });
  }

  async getEditionSizeByGroupingTracks(trackTransactionHash: string): Promise<number> {
    const aggregate = [
      {
        $match: {
          'nftData.transactionHash': trackTransactionHash,
        },
      },
      {
        $group: {
          _id: '$nftData.transactionHash',
          count: {
            $sum: 1,
          },
        },
      },
    ];
    const countQuery = await this.model.aggregate(aggregate);
    return countQuery.length ? countQuery[0].count : 1;
  }
}
