import { ArgumentValidationError } from 'type-graphql';
import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import { User, UserModel } from '../models/User';
import { Service } from './Service';

export class AuthService extends Service {
  async register(email: string, handle: string, displayName: string, magicWalletAddress: string): Promise<User> {
    await validateUniqueIdentifiers({ email, handle });

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

async function validateUniqueIdentifiers({ email, handle }: Pick<User, 'email' | 'handle'>) {
  const existingUsers = await UserModel.find({ $or: [{ email }, { handle }] });

  if (existingUsers.length) {
    const emails = existingUsers.map(user => user.email);
    const handles = existingUsers.map(user => user.handle);
    const errors = [];

    if (emails.includes(email)) {
      errors.push({ property: 'email', constraints: { unique: `${email} is already in use` } });
    }

    if (handles.includes(handle)) {
      errors.push({ property: 'handle', constraints: { unique: `${handle} is already in use` } });
    }

    throw new ArgumentValidationError(errors);
  }
}
