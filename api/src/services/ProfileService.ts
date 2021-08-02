import { UserInputError } from 'apollo-server-express';
import { Profile, ProfileModel } from '../models/Profile';
import { SocialMedias } from '../models/SocialMedias';

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
}
