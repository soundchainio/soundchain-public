import { PaginateResult } from '../db/pagination/paginate';
import { Profile } from '../models/Profile';
import { Track } from '../models/Track';
import { Context } from '../types/Context';
import { ExplorePayload } from '../types/ExplorePayload';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { Service } from './Service';

export class ExploreService extends Service {
  constructor(context: Context) {
    super(context);
  }

  async getExplore(search?: string): Promise<ExplorePayload> {
    const profiles = await this.context.profileService.searchProfiles(search);
    const tracks = await this.context.trackService.searchTracks(search);
    return { profiles: profiles.list, totalProfiles: profiles.total, tracks: tracks.list, totalTracks: tracks.total };
  }

  getExploreTracks(search: string, page?: PageInput): Promise<PaginateResult<Track>> {
    const regex = new RegExp(search, 'i');
    return this.context.trackService.paginate({
      filter: { $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }], deleted: false },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }

  getExploreUsers(search: string, page?: PageInput): Promise<PaginateResult<Profile>> {
    return this.context.profileService.paginate({
      filter: { displayName: new RegExp(search, 'i') },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }
}
