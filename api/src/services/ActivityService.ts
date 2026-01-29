import { PaginateResult } from '../db/pagination/paginate';
import {
  Activity,
  ActivityMetadata,
  ActivityModel,
  CommentedMetadata,
  FollowedMetadata,
  LikedMetadata,
  ListenedMetadata,
  MintedMetadata,
  PostedMetadata
} from '../models/Activity';
import { ActivityType } from '../types/ActivityType';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface LogActivityParams {
  profileId: string;
  type: ActivityType;
  metadata?: ActivityMetadata;
}

export class ActivityService extends ModelService<typeof Activity> {
  constructor(context: Context) {
    super(context, ActivityModel);
  }

  /**
   * Log a new activity
   */
  async logActivity(params: LogActivityParams): Promise<Activity> {
    const activity = new ActivityModel(params);
    return activity.save();
  }

  /**
   * Get activity feed for a user - shows activities from people they follow
   */
  async getActivityFeed(profileId: string, page?: PageInput): Promise<PaginateResult<Activity>> {
    // Get IDs of users this profile follows
    const followedIds = await this.context.followService.getFollowedIds(profileId);

    // If user doesn't follow anyone, return empty feed
    if (followedIds.length === 0) {
      return {
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };
    }

    return this.paginate({
      filter: { profileId: { $in: followedIds } },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page: page || { first: 20 },
    });
  }

  /**
   * Log a "listened" activity (debounced: only 1 per track per hour)
   */
  async logListened(
    profileId: string,
    trackId: string,
    trackTitle: string,
    artistName?: string,
    artworkUrl?: string
  ): Promise<void> {
    // Debounce: only log once per track per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.model.findOne({
      profileId,
      type: ActivityType.Listened,
      'metadata.trackId': trackId,
      createdAt: { $gte: oneHourAgo }
    });

    if (!recent) {
      const metadata: ListenedMetadata = { trackId, trackTitle, artistName, artworkUrl };
      await this.logActivity({
        profileId,
        type: ActivityType.Listened,
        metadata,
      });
    }
  }

  /**
   * Log a "liked" activity
   */
  async logLiked(profileId: string, postId: string, postBody?: string): Promise<void> {
    const metadata: LikedMetadata = {
      postId,
      postBody: postBody?.substring(0, 100), // Truncate for preview
    };
    await this.logActivity({
      profileId,
      type: ActivityType.Liked,
      metadata,
    });
  }

  /**
   * Log a "commented" activity
   */
  async logCommented(profileId: string, postId: string, commentBody?: string): Promise<void> {
    const metadata: CommentedMetadata = {
      postId,
      commentBody: commentBody?.substring(0, 100), // Truncate for preview
    };
    await this.logActivity({
      profileId,
      type: ActivityType.Commented,
      metadata,
    });
  }

  /**
   * Log a "followed" activity
   */
  async logFollowed(
    profileId: string,
    followedProfileId: string,
    followedDisplayName: string,
    followedHandle?: string
  ): Promise<void> {
    const metadata: FollowedMetadata = {
      followedProfileId,
      followedDisplayName,
      followedHandle,
    };
    await this.logActivity({
      profileId,
      type: ActivityType.Followed,
      metadata,
    });
  }

  /**
   * Log a "minted" activity
   */
  async logMinted(
    profileId: string,
    trackId: string,
    trackTitle: string,
    editionId?: string,
    quantity?: number
  ): Promise<void> {
    const metadata: MintedMetadata = {
      trackId,
      trackTitle,
      editionId,
      quantity,
    };
    await this.logActivity({
      profileId,
      type: ActivityType.Minted,
      metadata,
    });
  }

  /**
   * Log a "posted" activity
   */
  async logPosted(profileId: string, postId: string, postBody?: string, hasMedia?: boolean): Promise<void> {
    const metadata: PostedMetadata = {
      postId,
      postBody: postBody?.substring(0, 100), // Truncate for preview
      hasMedia,
    };
    await this.logActivity({
      profileId,
      type: ActivityType.Posted,
      metadata,
    });
  }
}
