import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-express';
import { FilterQuery } from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { Follow, FollowModel } from '../models/Follow';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface FollowKeyComponents {
  followerId: mongoose.Types.ObjectId;
  followedId: mongoose.Types.ObjectId;
}

export class FollowService extends ModelService<typeof Follow, FollowKeyComponents> {
  constructor(context: Context) {
    super(context, FollowModel);
  }

  keyIteratee = ({ followerId, followedId }: Partial<DocumentType<Follow>>): string => {
    return `${followerId.toString()}:${followedId.toString()}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Follow> {
    return {
      $or: keys.map(key => {
        const [followerId, followedId] = key.split(':');
        return { followerId: new mongoose.Types.ObjectId(followerId), followedId: new mongoose.Types.ObjectId(followedId) };
      }),
    };
  }

  async createFollow(followerId: string, followedId: string): Promise<Follow> {
    const follow = new FollowModel({
      followerId: new mongoose.Types.ObjectId(followerId),
      followedId: new mongoose.Types.ObjectId(followedId)
    });
    await follow.save();
    this.dataLoader.clear(this.getKeyFromComponents({
      followerId: new mongoose.Types.ObjectId(followerId),
      followedId: new mongoose.Types.ObjectId(followedId),
    }));
    this.context.notificationService.notifyNewFollower(follow);
    this.context.feedService.addRecentPostsToFollowerFeed(follow);

    // Log activity for activity feed
    try {
      const followedProfile = await this.context.profileService.getProfile(followedId);
      const followedUser = await this.context.userService.getUserByProfileId(followedId);
      await this.context.activityService.logFollowed(
        followerId,
        followedId,
        followedProfile.displayName,
        followedUser?.handle
      );
    } catch (err) {
      console.error('[FollowService] Failed to log follow activity:', err);
    }

    return follow;
  }

  async deleteFollow(followerId: mongoose.Types.ObjectId, followedId: mongoose.Types.ObjectId): Promise<void> {
    const { deletedCount } = await FollowModel.deleteOne({ followerId, followedId });

    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${followerId.toString()} isn't following profile ${followedId.toString()}.`);
    }

    this.dataLoader.clear(this.getKeyFromComponents({ followerId, followedId }));
  }

  async getFollowerIds(profileId: string): Promise<string[]> {
    // Use .lean() to get plain objects and avoid mongoose document symbol issues
    const rest = await this.model.find({ followedId: profileId }, { followerId: 1, _id: 0 }).lean();
    return rest.map(({ followerId }) => followerId?.toString() || '').filter(Boolean);
  }

  async getFollowedIds(profileId: string): Promise<string[]> {
    // Get IDs of users this profile follows
    const follows = await this.model.find({ followerId: profileId }, { followedId: 1, _id: 0 }).lean();
    return follows.map(({ followedId }) => followedId?.toString() || '').filter(Boolean);
  }

  async getFollowers(profileId: string, page: PageInput): Promise<PaginateResult<Follow>> {
    return this.paginate({
      filter: { followedId: profileId },
      page,
      sort: { field: 'createdAt', order: SortOrder.DESC },
    });
  }

  async getFolloweds(profileId: string, page: PageInput): Promise<PaginateResult<Follow>> {
    return this.paginate({
      filter: { followerId: profileId },
      page,
      sort: { field: 'createdAt', order: SortOrder.DESC },
    });
  }
}
