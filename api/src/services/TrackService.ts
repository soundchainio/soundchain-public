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
    const defaultFilter = { title: { $exists: true } };
    return this.paginate({ filter: { ...defaultFilter, ...filter }, sort, page });
  }

  getTrack(id: string): Promise<Track> {
    return this.findOrFail(id);
  }

  async createTrack({ profileId, fileType }: { profileId: string; fileType: string }): Promise<Track> {
    const track = new this.model({ profileId });
    const [uploadUrl, muxUpload] = await Promise.all([
      this.context.uploadService.generateUploadUrl(fileType),
      this.context.muxService.createUpload(track.id),
    ]);
    track.file = uploadUrl.readUrl;
    track.uploadUrl = uploadUrl.uploadUrl;
    track.muxUpload = muxUpload;
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
