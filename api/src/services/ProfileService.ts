import { UserInputError } from 'apollo-server-express';
import { NotFoundError } from '../errors/NotFoundError';
import { Profile, ProfileModel } from '../models/Profile';
import { SocialMedias } from '../models/SocialMedias';
import { UserModel } from '../models/User';
import { Context } from '../types/Context';
import { Genre } from '../types/Genres';
import { MusicianType } from '../types/MusicianTypes';
import { ModelService } from './ModelService';

export class ProfileService extends ModelService<typeof Profile> {
  constructor(context: Context) {
    super(context, ProfileModel);
  }

  getProfile(id: string): Promise<Profile> {
    return this.findOrFail(id);
  }

  async updateSocialMedias(id: string, socialMedias: SocialMedias): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { socialMedias }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  async updateFavoriteGenres(id: string, favoriteGenres: Genre[]): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { favoriteGenres }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  async updateMusicianType(id: string, musicianType: MusicianType[]): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { musicianType }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  async updateProfilePicture(id: string, profilePicture: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { profilePicture }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  async updateCoverPicture(id: string, coverPicture: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { coverPicture }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  async updateDisplayName(id: string, displayName: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { displayName }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
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

  async followProfile(followerId: string, followedId: string): Promise<Profile> {
    if (followerId === followedId) {
      throw new UserInputError('You cannot follow yourself.');
    }

    const [followedProfile, alreadyFollowed] = await Promise.all([
      this.findOrFail(followedId),
      this.context.followService.exists({ followerId, followedId }),
    ]);

    if (alreadyFollowed) {
      throw new UserInputError(`User profile ${followerId} is already following profile ${followerId}.`);
    }

    await this.context.followService.createFollow(followerId, followedId);

    await Promise.all([
      ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }),
      ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: 1 } }),
    ]);

    followedProfile.followerCount++;
    return followedProfile;
  }

  async unfollowProfile(followerId: string, followedId: string): Promise<Profile> {
    if (followerId === followedId) {
      throw new UserInputError('You cannot unfollow yourself.');
    }

    const followedProfile = await this.findOrFail(followedId);
    await this.context.followService.deleteFollow(followerId, followedId);

    await Promise.all([
      ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }),
      ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: -1 } }),
    ]);

    followedProfile.followerCount--;
    return followedProfile;
  }

  async incrementUnreadMessageCount(profileId: string): Promise<void> {
    await this.model.updateOne({ _id: profileId }, { $inc: { unreadMessageCount: 1 } });
  }

  async decreaseUnreadMessageCount(profileId: string, count: number): Promise<void> {
    await this.model.updateOne({ _id: profileId }, { $inc: { unreadMessageCount: -count } });
  }

  async resetUnreadMessageCount(profileId: string): Promise<Profile> {
    const updatedProfile = await this.model.findByIdAndUpdate(profileId, { unreadMessageCount: 0 }, { new: true });
    if (!updatedProfile) {
      throw new NotFoundError('Profile', profileId);
    }
    return updatedProfile;
  }
}
