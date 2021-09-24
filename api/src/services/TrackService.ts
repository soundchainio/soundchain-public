import { NotFoundError } from '../errors/NotFoundError';
import { Track, TrackModel } from '../models/Track';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class TrackService extends ModelService<typeof Track> {
  constructor(context: Context) {
    super(context, TrackModel);
  }

  getTrack(id: string): Promise<Track> {
    return this.findOrFail(id);
  }

  async createTrack(params: Pick<Track, 'profileId' | 'title' | 'audioUrl'>): Promise<Track> {
    const track = new this.model(params);
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

  deleteTrack(id: string): Promise<Track> {
    return this.model.deleteOne({ _id: id }).exec();
  }
}
