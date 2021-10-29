import { mongoose } from '@typegoose/typegoose';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { FeedItemModel } from '../models/FeedItem';
import { NotificationModel } from '../models/Notification';
import { PostModel } from '../models/Post';
import { Track, TrackModel } from '../models/Track';
import { Context } from '../types/Context';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { PageInput } from '../types/PageInput';
import { SortTrackInput } from '../types/SortTrackInput';
import { ModelService } from './ModelService';

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

  async updateTrack(id: string, changes: Partial<Track>): Promise<Track> {
    const track = await this.model.findByIdAndUpdate(id, changes, { new: true });

    if (!track) {
      throw new NotFoundError('Track', id);
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
