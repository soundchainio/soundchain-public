import { UserInputError } from 'apollo-server-express';
import { Genre } from '../enums/Genres';
import { NotFoundError } from '../errors/NotFoundError';
import { FollowModel } from '../models/Follow';
import { Profile, ProfileModel } from '../models/Profile';
import { SocialMedias } from '../models/SocialMedias';
import { UserModel } from '../models/User';

export class ProfileService {
  static getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
  }

  static async updateSocialMedias(id: string, socialMedias: SocialMedias): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { socialMedias }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  static async updateFavoriteGenres(id: string, favoriteGenres: Genre[]): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { favoriteGenres }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  static async updateProfilePicture(id: string, profilePicture: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { profilePicture }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  static async updateCoverPicture(id: string, coverPicture: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { coverPicture }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  static async getUserHandle(profileId: string): Promise<string> {
    const user = await UserModel.findOne({ profileId });
    if (!user) {
      throw new Error(`Profile ${profileId} is missing a user account!`);
    }
    return user.handle;
  }

  static async followProfile(followerId: string, followedId: string): Promise<Profile> {
    const followedProfile = await ProfileModel.findById(followedId);
    if (!followedProfile) throw new NotFoundError('Profile', followedId);

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

  static async unfollowProfile(followerId: string, followedId: string): Promise<Profile> {
    const followedProfile = await ProfileModel.findById(followedId);
    if (!followedProfile) throw new NotFoundError('Profile', followedId);

    const { deletedCount } = await FollowModel.deleteOne({ followerId, followedId });
    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${followerId} isn't following profile ${followerId}.`);
    }

    await ProfileModel.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } });
    await ProfileModel.updateOne({ _id: followedId }, { $inc: { followerCount: -1 } });
    followedProfile.followerCount--;
    return followedProfile;
  }
}
