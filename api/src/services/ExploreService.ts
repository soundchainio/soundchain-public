import { PaginateResult, PaginateSortParams } from '../db/pagination/paginate';
import { Profile, ProfileModel } from '../models/Profile';
import { Track } from '../models/Track';
import { Context } from '../types/Context';
import { ExplorePayload } from '../types/ExplorePayload';
import { ExploreTrackPayload } from '../types/ExploreTrackPayload';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { Service } from './Service';

export class ExploreService extends Service {
  constructor(context: Context) {
    super(context);
  }

  async getExplore(search?: string): Promise<ExplorePayload> {
    const profiles = await this.context.profileService.searchProfiles(search);
    const aggregationParams = this.getTrackAggregationParams(search);
    const tracks = await this.context.trackService.paginatePipelineAggregated({
      ...aggregationParams,
      sort: {
        field: 'createdAt',
        order: SortOrder.DESC,
      },
      page: {
        first: 5,
      },
    });
    return {
      profiles: profiles.list,
      totalProfiles: profiles.total,
      tracks: tracks.nodes,
      totalTracks: tracks.pageInfo.totalCount,
    };
  }

  async getExploreTracks(
    sort: PaginateSortParams<typeof Track>,
    search: string,
    page?: PageInput,
  ): Promise<PaginateResult<Track>> {
    const aggregationParams = this.getTrackAggregationParams(search);
    const result = await this.context.trackService.paginatePipelineAggregated({
      ...aggregationParams,
      sort: {
        field: sort.field,
        order: sort.order,
      },
      page,
    });

    return result;
  }

  async getExploreTracksWithProfiles(
    sort: PaginateSortParams<typeof Track>,
    search: string,
    page?: PageInput,
  ): Promise<ExploreTrackPayload> {
    const aggregationParams = this.getTrackAggregationParams(search);
    const tracks = await this.context.trackService.paginatePipelineAggregated({
      ...aggregationParams,
      sort: {
        field: sort.field,
        order: sort.order,
      },
      page,
    });

    const profiles = await Promise.all(
      tracks.nodes.map(async track => {
        const profile = await this.context.profileService.getProfile(track.profileId);

        return profile;
      }),
    );

    return { profiles, tracks: tracks.nodes };
  }

  getExploreUsers(search: string, page?: PageInput): Promise<PaginateResult<Profile>> {
    return this.context.profileService.paginate({
      filter: { displayName: new RegExp(search, 'i') },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }

  private getTrackAggregationParams(search: string) {
    const regex = new RegExp(search, 'i');
    return {
      aggregation: [
        {
          $match: {
            $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }],
            deleted: false,
          },
        },
        {
          $group: {
            _id: {
              $ifNull: ['$trackEditionId', '$_id'],
            },
            sumPlaybackCount: { $sum: '$playbackCount' },
            sumFavoriteCount: { $sum: '$favoriteCount' },
            first: { $first: '$$ROOT' },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$first',
                {
                  playbackCount: '$sumPlaybackCount',
                  favoriteCount: '$sumFavoriteCount',
                },
              ],
            },
          },
        },
      ],
    };
  }
}
