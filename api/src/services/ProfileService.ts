import { UserInputError } from 'apollo-server-express';
import { NotFoundError } from '../errors/NotFoundError';
import { FollowModel } from '../models/Follow';
import { Profile, ProfileModel } from '../models/Profile';
import { SocialMedias } from '../models/SocialMedias';
import { UserModel } from '../models/User';
import { Genre } from '../types/Genres';
import { Service } from './Service';

export class ProfileService extends Service {
  getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
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

    const followedProfile = await ProfileModel.findById(followedId);
    if (!followedProfile) {
      throw new NotFoundError('Profile', followedId);
    }

    const alreadyFollowed = await FollowModel.exists({ followerId, followedId });
    if (alreadyFollowed) {
      throw new UserInputError(`User profile ${followerId} is already following profile ${followerId}.`);
    }

    const follow = new FollowModel({ followerId, followedId });
    await follow.save();
    await ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } });
    await ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: 1 } });
    followedProfile.followerCount++;
    return followedProfile;
  }

  async unfollowProfile(followerId: string, followedId: string): Promise<Profile> {
    if (followerId === followedId) {
      throw new UserInputError('You cannot unfollow yourself.');
    }

    const followedProfile = await ProfileModel.findById(followedId);
    if (!followedProfile) {
      throw new NotFoundError('Profile', followedId);
    }

    const { deletedCount } = await FollowModel.deleteOne({ followerId, followedId });
    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${followerId} isn't following profile ${followerId}.`);
    }

    await ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } });
    await ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: -1 } });
    followedProfile.followerCount--;
    return followedProfile;
  }

  followExists(followerId: string, followedId: string): Promise<boolean> {
    return FollowModel.exists({ followerId, followedId });
  }
}
