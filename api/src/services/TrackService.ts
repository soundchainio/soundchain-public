import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
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
    return this.paginate({ filter, sort, page });
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
