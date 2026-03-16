import { PaginateResult, PaginateSortParams } from '../db/pagination/paginate';
import { Profile } from '../models/Profile';
import { Track, TrackModel } from '../models/Track';
import { Context } from '../types/Context';
import { ExplorePayload } from '../types/ExplorePayload';
import { GenreCount } from '../types/GenreCount';
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

  async getExploreTracks(sort: PaginateSortParams<typeof Track> | undefined, search: string, page?: PageInput, genre?: string): Promise<PaginateResult<Track>> {
    const aggregationParams = this.getTrackAggregationParams(search, genre)
    const result = await this.context.trackService.paginatePipelineAggregated({
      ...aggregationParams,
      sort: {
        field: sort?.field || 'createdAt',
        order: sort?.order || SortOrder.DESC
      },
      page,
    });

    return result
  }

  async getGenreCounts(): Promise<GenreCount[]> {
    // Count unique editions per genre
    const result = await TrackModel.aggregate([
      { $match: { deleted: false, genres: { $exists: true, $ne: [] } } },
      // Group by edition first (so each edition counts once)
      {
        $group: {
          _id: { $ifNull: ['$trackEditionId', '$_id'] },
          genres: { $first: '$genres' },
        }
      },
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();

    return result.map((r: any) => ({ genre: r._id, count: r.count }));
  }

  getExploreUsers(search?: string, page?: PageInput): Promise<PaginateResult<Profile>> {
    // Return all users sorted by newest first (createdAt DESC)
    // If search query provided, filter by displayName or userHandle
    const filter = search
      ? { $or: [{ displayName: new RegExp(search, 'i') }, { userHandle: new RegExp(search, 'i') }] }
      : {}; // No filter = get all users

    return this.context.profileService.paginate({
      filter,
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }

  private getTrackAggregationParams(search: string, genre?: string) {
    // When genre filter is active, filter directly by genres array
    if (genre) {
      // Convert enum key (HIP_HOP) to stored value (hip_hop)
      const genreValue = genre.toLowerCase()
      const matchFilter: any = { genres: genreValue, deleted: false }

      // Also apply text search within the genre if provided
      if (search) {
        const regex = new RegExp(search, 'i')
        matchFilter.$or = [
          { title: regex },
          { description: regex },
          { artist: regex },
          { album: regex },
        ]
      }

      return {
        aggregation: [
          { $match: matchFilter },
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

    // No search and no genre — return ALL tracks (no text filter)
    // FIX: new RegExp(null) creates /null/i which matches literal "null" — return everything instead
    if (!search) {
      return {
        aggregation: [
          { $match: { deleted: false }},
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

    // Text search behavior — search title/description/artist/album AND genres
    const regex = new RegExp(search, 'i');
    const matchConditions: any[] = [
      { title: regex },
      { description: regex },
      { artist: regex },
      { album: regex },
      { genres: regex },
    ]
    // Genre labels (Hip-Hop, R&B, Soul/Funk) differ from enum values (HIP_HOP, R_AND_B, SOUL_FUNK)
    // Convert label format to enum format and add as explicit match
    const genreValueMatch = search.toUpperCase().replace(/[-\s/]+/g, '_').replace(/&/g, '_AND_')
    if (genreValueMatch !== search.toUpperCase()) {
      matchConditions.push({ genres: genreValueMatch })
    }
    return {
      aggregation: [
        { $match: { $or: matchConditions, deleted: false }},
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
