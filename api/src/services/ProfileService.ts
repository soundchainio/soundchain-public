import { UserInputError } from 'apollo-server-express';
import mongoose from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { FollowModel } from '../models/Follow';
import { Profile, ProfileModel } from '../models/Profile';
import { UserModel } from '../models/User';
import { Badge } from '../types/Badge';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

export class ProfileService extends ModelService<typeof Profile> {
  constructor(context: Context) {
    super(context, ProfileModel);
  }

  getProfile(id: string): Promise<Profile> {
    return this.findOrFail(id);
  }

  async getProfileByHandle(handle: string): Promise<Profile> {
    const profile = await UserModel.aggregate([
      {
        $match: {
          handle: { $regex: new RegExp(`^${handle}$`, 'i') }, // Case-insensitive match
        },
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'profileId',
          foreignField: '_id',
          as: 'profile',
        },
      },
      {
        $unwind: {
          path: '$profile',
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$profile', { magicWalletAddress: '$$ROOT.magicWalletAddress', userHandle: '$$ROOT.handle' }],
          },
        },
      },
    ]);

    if (!profile[0]) {
      throw new NotFoundError('Profile', handle);
    }

    return profile[0];
  }

  async searchProfiles(search: string): Promise<{ list: Profile[]; total: number }> {
    const list = await this.model
      .find({ displayName: new RegExp(search, 'i') })
      .sort({ createdAt: -1 })
      .limit(5);
    const total = await this.model
      .find({ displayName: new RegExp(search, 'i') })
      .countDocuments()
      .exec();
    return { list, total };
  }

  async updateProfile(id: string, changes: Partial<Profile>): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, changes, { new: true });

    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }

    return updatedProfile;
  }

  async claimBadgeProfile(profileId: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(
      profileId,
      { badges: [Badge.SUPPORTER_FIRST_EVENT_AE_SC] },
      { new: true },
    );

    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${profileId}`);
    }

    return updatedProfile;
  }

  async getUserHandle(profileId: string): Promise<string> {
    const user = await UserModel.findOne({ profileId });
    if (!user) {
      throw new Error(`Profile ${profileId} is missing a user account!`);
    }
    return user.handle;
  }

  async followProfile(followerId: mongoose.Types.ObjectId, followedId: mongoose.Types.ObjectId): Promise<Profile> {
    if (followerId.toString() === followedId.toString()) {
      throw new UserInputError('You cannot follow yourself.');
    }

    const [followedProfile, alreadyFollowed] = await Promise.all([
      this.findOrFail(followedId.toString()),
      this.context.followService.exists({ followerId, followedId }),
    ]);

    if (alreadyFollowed) {
      throw new UserInputError(`User profile ${followerId} is already following profile ${followedId}.`);
    }

    await this.context.followService.createFollow(followerId.toString(), followedId.toString());

    await Promise.all([
      ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }),
      ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: 1 } }),
    ]);

    followedProfile.followerCount++;
    return followedProfile;
  }

  async unfollowProfile(followerId: mongoose.Types.ObjectId, followedId: mongoose.Types.ObjectId): Promise<Profile> {
    if (followerId.toString() === followedId.toString()) {
      throw new UserInputError('You cannot unfollow yourself.');
    }

    const followedProfile = await this.findOrFail(followedId.toString());
    await this.context.followService.deleteFollow(followerId, followedId);

    await Promise.all([
      ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }),
      ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: -1 } }),
    ]);

    followedProfile.followerCount--;
    return followedProfile;
  }

  async incrementUnreadMessageCount(profileId: string): Promise<void> {
    const profile = await this.findOrFail(profileId);
    if (profile.unreadMessageCount < 0) {
      await this.resetUnreadMessageCount(profileId);
    }
    await this.model.updateOne({ _id: profileId }, { $inc: { unreadMessageCount: 1 } });
  }

  async decreaseUnreadMessageCount(profileId: string, count: number): Promise<void> {
    const profile = await this.findOrFail(profileId);
    if (profile.unreadMessageCount - count >= 0) {
      await this.model.updateOne({ _id: profileId }, { $inc: { unreadMessageCount: -count } });
    } else {
      await this.resetUnreadMessageCount(profileId);
    }
  }

  async resetUnreadMessageCount(profileId: string): Promise<Profile> {
    const updatedProfile = await this.model.findByIdAndUpdate(profileId, { unreadMessageCount: 0 }, { new: true });
    if (!updatedProfile) {
      throw new NotFoundError('Profile', profileId);
    }
    return updatedProfile;
  }

  async verifyProfile(profileId: string, verified: boolean): Promise<Profile> {
    const updatedProfile = await this.model.findByIdAndUpdate(profileId, { verified }, { new: true });
    if (!updatedProfile) {
      throw new NotFoundError('Profile', profileId);
    }
    return updatedProfile;
  }

  async getFollowedArtists(profileId: string, search: string, page: PageInput): Promise<PaginateResult<Profile>> {
    const regex = new RegExp(search, 'i');
    const filter = {
      $or: [{ displayName: regex }, { bio: regex }],
    };
    const followers = await FollowModel.find({ followerId: profileId });
    const ids = followers.map(follower => follower.followedId);

    return this.paginate({
      filter: { _id: { $in: ids }, ...filter },
      page,
      sort: { field: 'createdAt', order: SortOrder.DESC },
    });
  }

  // ============================================
  // WIN-WIN LISTENER REWARDS TRACKING
  // ============================================

  /**
   * Update a listener's daily OGUN rewards earned
   * Used to track WIN-WIN rewards for listeners
   */
  async updateListenerDailyRewards(profileId: string, amount: number): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get current profile
    const profile = await this.model.findById(profileId);
    if (!profile) return;

    // Check if we need to reset the daily counter
    const lastReset = (profile as any).listenerDailyReset;
    if (!lastReset || new Date(lastReset) < todayStart) {
      // New day - reset counter
      await this.model.updateOne(
        { _id: profileId },
        {
          $set: {
            dailyListenerOgunEarned: amount,
            listenerDailyReset: todayStart,
          },
          $inc: {
            totalListenerOgunEarned: amount,
          },
        }
      );
    } else {
      // Same day - increment
      await this.model.updateOne(
        { _id: profileId },
        {
          $inc: {
            dailyListenerOgunEarned: amount,
            totalListenerOgunEarned: amount,
          },
        }
      );
    }

    console.log(`[ProfileService] Listener ${profileId} earned ${amount.toFixed(4)} OGUN`);
  }

  /**
   * Get listener's total OGUN earned from streaming
   */
  async getListenerRewards(profileId: string): Promise<{
    dailyEarned: number;
    totalEarned: number;
    dailyLimit: number;
  }> {
    const profile = await this.model.findById(profileId);
    if (!profile) {
      return { dailyEarned: 0, totalEarned: 0, dailyLimit: 50 };
    }

    // Check if daily reset needed
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const lastReset = (profile as any).listenerDailyReset;

    let dailyEarned = (profile as any).dailyListenerOgunEarned || 0;
    if (lastReset && new Date(lastReset) < todayStart) {
      dailyEarned = 0; // New day, hasn't been reset yet
    }

    return {
      dailyEarned,
      totalEarned: (profile as any).totalListenerOgunEarned || 0,
      dailyLimit: 50, // From OGUN_REWARDS_CONFIG.listenerMaxDaily
    };
  }
}
