import { UserInputError } from 'apollo-server-express';
import Profile, { ProfileModel } from '../models/Profile';
import SocialMedia from '../models/SocialMedia';

export class ProfileService {
  static getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
  }

  static async updateProfile(id: string, socialMediaLinks: SocialMedia[]): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(id, { socialMediaLinks }, { new: true });
    if (!updatedProfile) {
      throw new UserInputError(`Could not find the profile with id: ${id}`);
    }
    return updatedProfile;
  }
}
