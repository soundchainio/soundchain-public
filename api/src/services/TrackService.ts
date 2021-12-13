import { DocumentType, mongoose } from '@typegoose/typegoose';
import dot from 'dot-object';
import { ObjectId } from 'mongodb';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { FavoriteProfileTrack, FavoriteProfileTrackModel } from '../models/FavoriteProfileTrack';
import { FeedItemModel } from '../models/FeedItem';
import { NotificationModel } from '../models/Notification';
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
import { ModelService } from './ModelService';

export interface FavoriteCount {
  count: number;
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
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
    return this.paginate({ filter: { ...defaultFilter, ...dotNotationFilter }, sort, page });
  }

  getTrack(id: string): Promise<Track> {
    return this.findOrFail(id);
  }

  async searchTracks(search: string): Promise<{ list: Track[]; total: number }> {
    const regex = new RegExp(search, 'i');
    const list = await this.model
      .find({ $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }] })
      .sort({ createdAt: -1 })
      .limit(5);
    const total = await this.model
      .find({ deleted: false, $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }] })
      .countDocuments()
      .exec();
    return { list, total };
  }

  async createTrack(profileId: string, data: Partial<Track>): Promise<Track> {
    const track = new this.model({ profileId, ...data });
    const asset = await this.context.muxService.create(data.assetUrl, track._id);
    track.muxAsset = { id: asset.id, playbackId: asset.playback_ids[0].id };
    await track.save();
    return track;
  }

  async updateTrackByTransactionHash(transactionHash: string, changes: RecursivePartial<Track>): Promise<Track> {
    const { nftData: newNftData, ...data } = changes;

    const track = await this.model.findOneAndUpdate(
      {
        'nftData.transactionHash': transactionHash,
      },
      data,
    );

    if (!track) {
      throw new NotFoundError('Track', transactionHash);
    }
    return this.updateNftData(track, newNftData);
  }

  async updateTrack(id: string, changes: RecursivePartial<Track>): Promise<Track> {
    const { nftData: newNftData, ...data } = changes;

    const track = await this.model.findByIdAndUpdate(id, data, { new: true });

    if (!track) {
      throw new NotFoundError('Track', id);
    }
    return this.updateNftData(track, newNftData);
  }

  private updateNftData(track: DocumentType<Track>, newNftData?: Partial<NFTData>) {
    if (newNftData) {
      const trackAsData = track.toObject();
      const nftData = trackAsData.nftData;
      track.nftData = { ...nftData, ...newNftData };
      track.save();
    }

    return track;
  }

  async deleteTrack(id: string): Promise<Track> {
    return await this.model.deleteOne({ _id: id }).exec();
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

  async isFavorite(trackId: string, profileId: string): Promise<boolean> {
    const hasRecord = await FavoriteProfileTrackModel.findOne({ trackId, profileId });
    return hasRecord ? true : false;
  }

  async toggleFavorite(trackId: string, profileId: string): Promise<FavoriteProfileTrack> {
    const favTrack = await FavoriteProfileTrackModel.findOne({ trackId, profileId });
    if (favTrack?.id) {
      return await FavoriteProfileTrackModel.findOneAndDelete({ trackId, profileId });
    } else {
      const favorite = new FavoriteProfileTrackModel({ profileId, trackId });
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

  async favoriteCount(trackId: string): Promise<FavoriteCount> {
    const favTrack = await FavoriteProfileTrackModel.aggregate([
      {
        $match: {
          trackId: trackId.toString(),
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

  async saleType(tokenId: number): Promise<string> {
    const listing = await this.context.listingItemService.getListingItem(tokenId);
    if (listing.endingTime) {
      return 'auction';
    } else if (listing.pricePerItem) {
      return 'buy now';
    }
    return '';
  }

  async price(tokenId: number): Promise<number> {
    const listing = await this.context.listingItemService.getListingItem(tokenId);
    if (listing.reservePrice) {
      return (await this.context.auctionItemService.getHighestBid(listing._id)) || listing.reservePrice;
    } else if (listing.pricePerItem) {
      return listing.pricePerItem;
    }
    return 0;
  }

  getListingItems(
    filter?: FilterTrackMarketplace,
    sort?: SortListingItemInput,
    page?: PageInput,
  ): Promise<PaginateResult<TrackWithListingItem>> {
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
                $eq: ['$$item.valid', true],
              },
            },
          },
          buynowitem: {
            $filter: {
              input: '$buynowitem',
              as: 'item',
              cond: {
                $eq: ['$$item.valid', true],
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
              '$listingItem.highestBid',
              {
                $ifNull: ['$listingItem.reservePrice', '$listingItem.pricePerItem'],
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
    ];
    let dotNotationFilter;
    if (filter) {
      const filterClone = JSON.parse(JSON.stringify(filter));
      delete filterClone.genres;
      dotNotationFilter = filter.listingItem && dot.dot(filterClone);
    }
    return this.paginatePipelineAggregated({
      aggregation,
      filter: filter ? { genres: filter.genres, ...dotNotationFilter } : {},
      sort,
      page,
    });
  }
}
