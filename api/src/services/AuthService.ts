import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-express';
import { compare } from 'bcryptjs';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import User, { UserModel } from '../models/User';
import { EmailService } from './EmailService';

export default class AuthService {
  static async register(email: string, handle: string, password: string, displayName: string): Promise<User> {
    const existingUser = await UserModel.findOne({ $or: [{ email }, { handle }] });

    if (existingUser) {
      throw new UserInputError(`${existingUser.email === email ? email : handle} is in use`);
    }

    const profile = new ProfileModel({ displayName });
    await profile.save();

    const emailVerificationToken = uuidv4();
    const user = new UserModel({ email, handle, password, profileId: profile._id, emailVerificationToken });

    try {
      await user.save();
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      throw new Error(`Error while creating user: ${err.message}`);
    }

    try {
      await EmailService.sendEmailVerification(email, displayName, emailVerificationToken);
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      UserModel.deleteOne({ _id: user.id });
      throw new Error(`Error while sending email verification: ${err.message}`);
    }

    return user;
  }

  static async getUserFromCredentials(username: string, password: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ $or: [{ email: username }, { handle: username }] });

    if (user && (await compare(password, user.password))) {
      return user;
    }
  }

  static async verifyUserEmail(emailVerificationToken: string): Promise<User> {
    const user = await UserModel.findOneAndUpdate(
      { emailVerificationToken },
      { verified: true, $unset: { emailVerificationToken: 1 } },
      { new: true },
    );

    if (!user) {
      throw new UserInputError('Cannot verify user email token');
    }
    return user;
  }

  static async generatePasswordResetToken(email: string): Promise<void> {
    const passwordResetToken = uuidv4();
    const user = await UserModel.findOneAndUpdate({ email }, { passwordResetToken });

    if (user) {
      EmailService.sendPasswordResetEmail(email, passwordResetToken);
    }
  }

  static resetUserPassword(user: DocumentType<User>, password: string): Promise<Document> {
    user.password = password;
    user.passwordResetToken = undefined;
    return user.save();
  }
}
