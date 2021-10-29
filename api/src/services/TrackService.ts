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
import { SortTrackInput } from '../types/SortTrackInput';
import { ModelService } from './ModelService';

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
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
        'nftData.transactionHash': '0xce2f5d1f69a0f0511dcbebd07f9ffdaa52c9a066cc9101b7d62d6f1e0295bb79',
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

  async incrementPlaybackCount(values: { trackId: string; amount: number }[]): Promise<boolean> {
    const newValues: { trackId: string; amount: number }[] = [];

    console.log('values' + JSON.stringify(values));
    for (let index = 0; index < values.length; index++) {
      const element = values[index];
      if (mongoose.Types.ObjectId.isValid(element.trackId)) {
        console.log('entrou' + JSON.stringify(element));

        newValues.push(element);
      }
    }
    const result = await this.model.bulkWrite(
      newValues.map(value => ({
        updateOne: {
          filter: { _id: value.trackId },
          update: { $inc: { playbackCount: value.amount } },
        },
      })),
    );

    return true;
  }
}
