import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import { User, UserModel } from '../models/User';
import { validateUniqueIdentifiers } from '../utils/Validation';
import { Service } from './Service';

export class AuthService extends Service {
  async register(email: string, handle: string, displayName: string, magicWalletAddress: string): Promise<User> {
    await validateUniqueIdentifiers({ handle });

    const profile = new ProfileModel({ displayName });
    await profile.save();
    await this.context.feedService.seedNewProfileFeed(profile.id);

    const emailVerificationToken = uuidv4();
    const user = new UserModel({ email, handle, profileId: profile._id, emailVerificationToken, magicWalletAddress });

    try {
      await user.save();
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      throw new Error(`Error while creating user: ${err}`);
    }

    return user;
  }

  async getUserFromCredentials(username: string): Promise<User | undefined> {
    return await UserModel.findOne({ email: username });
  }
}
