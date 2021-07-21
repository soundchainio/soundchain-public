import Profile, { ProfileModel } from '../models/Profile';
import SocialMediaLink from '../models/SocialMediaLink';

export class ProfileService {
  static getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
  }

  static async createProfile(
    displayName: string,
    profilePicture: string,
    coverPicture: string,
    socialMediaLinks: SocialMediaLink[],
  ): Promise<Profile> {
    const newProfile = new ProfileModel({ displayName, profilePicture, coverPicture, socialMediaLinks });
    await newProfile.save();
    return newProfile;
  }
}
