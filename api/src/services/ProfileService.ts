import { UserInputError } from 'apollo-server-express';
import { Genre } from 'enums/Genres';
import { Profile, ProfileModel } from 'models/Profile';
import { SocialMedias } from 'models/SocialMedias';
import { UserModel } from 'models/User';

export class ProfileService {
  static getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
  }

  static async updateSocialMedias(id: string, socialMedias: SocialMedias): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { socialMedias }, { new: true });
    if (!updatedProfile) {
      throw new UserInputError(`Could not find the profile with id: ${id}`);
    }
    return updatedProfile;
  }

  static async updateFavoriteGenres(id: string, favoriteGenres: Genre[]): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { favoriteGenres }, { new: true });
    if (!updatedProfile) {
      throw new UserInputError(`Could not find the profile with id: ${id}`);
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
}
