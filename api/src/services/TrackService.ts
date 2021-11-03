import { DocumentType, mongoose } from '@typegoose/typegoose';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { FeedItemModel } from '../models/FeedItem';
import { NotificationModel } from '../models/Notification';
import { PostModel } from '../models/Post';
import { Track, TrackModel } from '../models/Track';
import { Context } from '../types/Context';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { NFTData } from '../types/NFTData';
import { PageInput } from '../types/PageInput';
import { PendingRequest } from '../types/PendingRequest';
import { SortTrackInput } from '../types/SortTrackInput';
import { ModelService } from './ModelService';

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
    return this.paginate({ filter: { ...defaultFilter, ...filter }, sort, page });
  }

  getTrack(id: string): Promise<Track> {
    return this.findOrFail(id);
  }

  async searchTracks(search: string): Promise<{ list: Track[]; total: number }> {
    const regex = new RegExp(search, 'i');
    const list = await this.model
      .find({ $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }] })
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
}
