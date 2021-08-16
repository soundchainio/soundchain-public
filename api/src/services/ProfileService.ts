import { Genre } from 'enums/Genres';
import { Profile, ProfileModel } from 'models/Profile';
import { SocialMedias } from 'models/SocialMedias';

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
}
