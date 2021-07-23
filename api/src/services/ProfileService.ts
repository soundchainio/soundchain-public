import Profile, { ProfileModel } from '../models/Profile';

export class ProfileService {
  static getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
  }

  static async createProfile(displayName: string): Promise<Profile> {
    const newProfile = new ProfileModel({ displayName });
    await newProfile.save();
    return newProfile;
  }
}
