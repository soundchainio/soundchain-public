import { PaginateResult, PaginateSortParams } from '../db/pagination/paginate';
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
    const aggregationParams = this.getTrackAggregationParams(search)
    const tracks = await this.context.trackService.paginatePipelineAggregated({
      ...aggregationParams,
      sort: {
        field: 'createdAt',
        order: SortOrder.DESC
      },
      page: {
        first: 5
      },
    });
    return { profiles: profiles.list, totalProfiles: profiles.total, tracks: tracks.nodes, totalTracks: tracks.pageInfo.totalCount };
  }

  async getExploreTracks(sort: PaginateSortParams<typeof Track>, search: string, page?: PageInput): Promise<PaginateResult<Track>> {
    const aggregationParams = this.getTrackAggregationParams(search)
    const result = await this.context.trackService.paginatePipelineAggregated({
      ...aggregationParams,
      sort: {
        field: sort.field,
        order: sort.order
      },
      page,
    });

    return result
  }

  getExploreUsers(search?: string, page?: PageInput): Promise<PaginateResult<Profile>> {
    // If no search query, return all users sorted by follower count (most popular first)
    // If search query provided, filter by displayName or userHandle
    const filter = search
      ? { $or: [{ displayName: new RegExp(search, 'i') }, { userHandle: new RegExp(search, 'i') }] }
      : {}; // No filter = get all users

    return this.context.profileService.paginate({
      filter,
      sort: { field: search ? 'createdAt' : 'followerCount', order: SortOrder.DESC },
      page,
    });
  }

  private getTrackAggregationParams(search: string) {
    const regex = new RegExp(search, 'i');
    return {
      aggregation: [
        { $match: { $or: [{ title: regex }, { description: regex }, { artist: regex }, { album: regex }], deleted: false }},
        {
          $group: {
            _id: {
              $ifNull: [
                '$trackEditionId',
                '$_id',
              ]
            },
            sumPlaybackCount: { $sum: '$playbackCount' },
            sumFavoriteCount: { $sum: '$favoriteCount' },
            first: { $first: '$$ROOT' }
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$first',
                {
                  playbackCount: '$sumPlaybackCount',
                  favoriteCount: '$sumFavoriteCount'
                },
              ]
            }
          }
        }
      ]
    }
  }
}
