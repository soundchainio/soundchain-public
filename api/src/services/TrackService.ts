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
import { TrackWithListingItem } from '../models/TrackWithListingItem';
import { Context } from '../types/Context';
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

  async createTrack(profileId: string, data: Partial<Track>): Promise<Track> {
    const track = new this.model({ profileId, ...data });
    const asset = await this.context.muxService.create(data.assetUrl, track._id);
    track.muxAsset = { id: asset.id, playbackId: asset.playback_ids[0].id };
    await track.save();
    return track;
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

  async setPendingNone(tokenId: number): Promise<Track> {
    return await this.model.findOneAndUpdate(
      { 'nftData.tokenId': tokenId },
      { 'nftData.pendingRequest': PendingRequest.None },
    );
  }

  async getTrackByTokenId(tokenId: number): Promise<Track> {
    return await this.model.findOne({ 'nftData.tokenId': tokenId });
  }

  async updateOwnerByTokenId(tokenId: number, owner: string): Promise<Track> {
    const { id } = await this.model.findOne({ 'nftData.tokenId': tokenId });
    return await this.updateTrack(id, { nftData: { owner } });
  }

  async isFavorite(trackId: string, profileId: string, trackEditionId?: string): Promise<boolean> {
    if (trackEditionId) {
      return await FavoriteProfileTrackModel.exists({ trackEditionId, profileId });
    }
    return await FavoriteProfileTrackModel.exists({ trackId, profileId });
  }

  async toggleFavorite(trackId: string, profileId: string): Promise<FavoriteProfileTrack> {
    const track = await this.model.findOne({ _id: trackId });

    const findParams = track.trackEditionId ?
      { trackEditionId: track.trackEditionId, profileId } :
      { trackId, profileId };

    const favTrack = await FavoriteProfileTrackModel.findOne(findParams);
    if (favTrack?.id) {
      return await FavoriteProfileTrackModel.findOneAndDelete(findParams);
    } else {
      const favorite = new FavoriteProfileTrackModel({ profileId, trackId, trackEditionId: track.trackEditionId });
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

  async favoriteCount(trackId: string, trackEditionId?: string): Promise<FavoriteCount> {
    const ors: any[] = [
      { trackId: trackId.toString() }
    ]

    if (trackEditionId) {
      ors.push({ trackEditionId: trackEditionId.toString() })
    }

    const favTrack = await FavoriteProfileTrackModel.aggregate([
      {
        $match: {
          $or: ors
        }
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

  async saleType(tokenId: number): Promise<string> {
    const listing = await this.context.listingItemService.getActiveListingItem(tokenId);
    if (!listing) {
      return '';
    }
    const { endingTime, pricePerItem } = listing;
    return (endingTime && 'auction') || (pricePerItem && 'buy now') || '';
  }

  async priceToShow(tokenId: number): Promise<number> {
    const listing = await this.context.listingItemService.getActiveListingItem(tokenId);
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
          totalPlaybackCount: {
            $sum: '$playbackCount',
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
              {
                totalPlaybackCount: '$totalPlaybackCount',
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

  async resetPending(): Promise<void> {
    const nowMinusOneHour = new Date();
    nowMinusOneHour.setHours(nowMinusOneHour.getHours() - 1);

    return this.model.updateMany(
      {
        'nftData.pendingRequest': { $ne: PendingRequest.None },
        'nftData.pendingTime': { $lte: nowMinusOneHour },
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
}
