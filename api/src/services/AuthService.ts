import { UserInputError } from 'apollo-server-express';
import { compare } from 'bcrypt';
import { ProfileModel } from '../models/Profile';
import User, { UserModel } from '../models/User';

export default class AuthService {
  static async register(email: string, handle: string, password: string, displayName: string): Promise<User> {
    const existingUser = await UserModel.findOne({ $or: [{ email }, { handle }] });

    if (existingUser) {
      throw new UserInputError(`${existingUser.email === email ? email : handle} is in use`);
    }

    // TODO: handle user creation failure (need to delete profile)
    // or use some kind of db transaction

    const profile = new ProfileModel({ displayName });
    await profile.save();

    const user = new UserModel({ email, handle, password, profileId: profile._id });
    await user.save();

    return user;
  }

  static async getUserFromCredentials(username: string, password: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ $or: [{ email: username }, { handle: username }] });

    if (user && (await compare(password, user.password))) {
      return user;
    }
  }
}
