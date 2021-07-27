import { UserInputError } from 'apollo-server-express';
import { compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import User, { UserModel } from '../models/User';
import { UserEmailVerificationModel } from '../models/UserEmailVerification';
import { EmailService } from './EmailService';

export default class AuthService {
  static async register(email: string, handle: string, password: string, displayName: string): Promise<User> {
    const existingUser = await UserModel.findOne({ $or: [{ email }, { handle }] });

    if (existingUser) {
      throw new UserInputError(`${existingUser.email === email ? email : handle} is in use`);
    }

    const profile = new ProfileModel({ displayName });
    await profile.save();

    const user = new UserModel({ email, handle, password, profileId: profile._id });

    try {
      await user.save();
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      throw new UserInputError(`error while creating user`);
    }

    try {
      const verificationToken = uuidv4();
      const userVerification = new UserEmailVerificationModel({ userId: user.id, token: verificationToken });
      await userVerification.save();
      EmailService.sendEmailVerification(email, displayName, verificationToken);
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      UserModel.deleteOne({ _id: user.id });
      throw new UserInputError(`error while sending verification email`);
    }

    return user;
  }

  static async getUserFromCredentials(username: string, password: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ $or: [{ email: username }, { handle: username }] });

    if (user && (await compare(password, user.password))) {
      return user;
    }
  }
}
