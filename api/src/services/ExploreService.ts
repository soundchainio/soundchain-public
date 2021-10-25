import { Context } from '../types/Context';
import { ExplorePayload } from '../types/ExplorePayload';
import { Service } from './Service';

export class ExploreService extends Service {
  constructor(context: Context) {
    super(context);
  }

  async getExplore(profileId: string, search?: string): Promise<ExplorePayload> {
    const profiles = await this.context.profileService.searchProfiles(search);
    const tracks = await this.context.trackService.searchTracks(search);
    return { profiles, tracks };
  }

}
