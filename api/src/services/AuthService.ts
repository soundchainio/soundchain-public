import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import { User, UserModel } from '../models/User';
import { AuthMethod } from '../types/AuthMethod';
import { Role } from '../types/Role';
import { validateUniqueIdentifiers } from '../utils/Validation';
import { Service } from './Service';

export class AuthService extends Service {
  async register(
    email: string,
    handle: string,
    displayName: string,
    magicWalletAddress: string,
    oauthProvider: string,
  ): Promise<User> {
    await validateUniqueIdentifiers({ handle });

    const profile = new ProfileModel({ displayName });
    await profile.save();
    await this.context.feedService.seedNewProfileFeed(profile.id);

    const emailVerificationToken = uuidv4();

    // Determine which wallet field to populate based on OAuth provider
    const walletFields: Record<string, string> = {
      magicWalletAddress, // Always set the default Magic wallet
    };

    // Also save to provider-specific wallet field
    switch (oauthProvider) {
      case AuthMethod.google:
        walletFields.googleWalletAddress = magicWalletAddress;
        break;
      case AuthMethod.discord:
        walletFields.discordWalletAddress = magicWalletAddress;
        break;
      case AuthMethod.twitch:
        walletFields.twitchWalletAddress = magicWalletAddress;
        break;
      case AuthMethod.magicLink:
      default:
        walletFields.emailWalletAddress = magicWalletAddress;
        break;
    }

    const user = new UserModel({
      email,
      handle,
      profileId: profile._id,
      emailVerificationToken,
      ...walletFields,
      authMethod: oauthProvider || AuthMethod.magicLink,
    });

    const soundChainUser = await this.getSoundChainUser();
    console.log("soundChainUser lookup result:", soundChainUser);

    try {
      await user.save();
      await this.context.profileService.followProfile(profile._id, soundChainUser.profileId);
      await this.context.mailchimpService.addMember(user);
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      await this.context.profileService.unfollowProfile(profile._id, soundChainUser.profileId);
      throw new Error(`Error while creating user: ${err}`);
    }

    return user;
  }

  async getUserFromCredentials(username: string): Promise<User[] | undefined> {
    return UserModel.find({ email: username });
  }

  async getSoundChainUser(): Promise<User | undefined> {
    return UserModel.findOne({ roles: Role.SOUNDCHAIN_ACCOUNT });
  }
}
