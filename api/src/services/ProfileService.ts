import Profile, { ProfileModel } from '../models/Profile';

export class ProfileService {
  static getProfile(id: string): Promise<Profile> {
    return ProfileModel.findByIdOrFail(id);
  }
}
