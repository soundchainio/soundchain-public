import { UserInputError } from 'apollo-server-express';
import { compare } from 'bcryptjs';
import { ArgumentValidationError } from 'type-graphql';
import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import { User, UserModel } from '../models/User';
import { Service } from './Service';

export class AuthService extends Service {
  async register(email: string, handle: string, password: string, displayName: string): Promise<User> {
    await validateUniqueIdentifiers({ email, handle });

    const profile = new ProfileModel({ displayName });
    await profile.save();
    await this.context.feedService.seedNewProfileFeed(profile.id);

    const emailVerificationToken = uuidv4();
    const user = new UserModel({ email, handle, password, profileId: profile._id, emailVerificationToken });

    try {
      await user.save();
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      throw new Error(`Error while creating user: ${err.message}`);
    }

    try {
      await this.context.emailService.sendEmailVerification(email, displayName, emailVerificationToken);
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      UserModel.deleteOne({ _id: user.id });
      throw new Error(`Error while sending email verification: ${err.message}`);
    }

    return user;
  }

  async getUserFromCredentials(username: string, password: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ $or: [{ email: username }, { handle: username }] });

    if (user && (await compare(password, user.password))) {
      return user;
    }
  }

  async verifyUserEmail(emailVerificationToken: string): Promise<User> {
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

  async initPasswordReset(email: string): Promise<void> {
    const passwordResetToken = uuidv4();
    const user = await UserModel.findOneAndUpdate({ email }, { passwordResetToken });

    if (!user) {
      throw new UserInputError('No user with email');
    }

    await this.context.emailService.sendPasswordResetEmail(user.email, passwordResetToken);
  }

  async resetUserPassword(passwordResetToken: string, password: string): Promise<void> {
    const user = await UserModel.findOne({ passwordResetToken });

    if (!user) {
      throw new UserInputError('Invalid token');
    }

    user.password = password;
    user.passwordResetToken = undefined;
    await user.save();
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
