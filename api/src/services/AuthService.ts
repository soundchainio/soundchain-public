import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { ProfileModel } from '../models/Profile';
import { User, UserModel } from '../models/User';
import { AuthMethod } from '../types/AuthMethod';
import { Role } from '../types/Role';
import { validateUniqueIdentifiers } from '../utils/Validation';
import { Service } from './Service';
import { generateNostrKeypair } from '../utils/nostrKeygen';

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

    // Auto-generate Nostr keypair for decentralized notifications
    const nostrKeypair = generateNostrKeypair();
    console.log('[Auth] Generated Nostr identity for new user:', nostrKeypair.publicKey.slice(0, 16) + '...');

    const user = new UserModel({
      email,
      handle,
      profileId: profile._id,
      emailVerificationToken,
      ...walletFields,
      authMethod: oauthProvider || AuthMethod.magicLink,
      // Auto-enable Nostr notifications with generated keypair
      nostrPubkey: nostrKeypair.publicKey,
      nostrPrivateKey: nostrKeypair.privateKey,
      notifyViaNostr: true,
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

  /**
   * Verify a wallet signature matches the expected message and address
   * Uses EIP-191 personal_sign standard
   */
  verifyWalletSignature(walletAddress: string, message: string, signature: string): boolean {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Register a new wallet-only user (no email/OAuth required)
   * Creates a synthetic email and auto-generated handle
   */
  async registerWithWallet(
    walletAddress: string,
    handle?: string,
    displayName?: string,
  ): Promise<User> {
    // Normalize wallet address
    const normalizedAddress = walletAddress.toLowerCase();

    // Generate synthetic email for wallet-only user
    const syntheticEmail = `${normalizedAddress}@wallet.soundchain.io`;

    // Generate handle from wallet prefix if not provided
    const walletPrefix = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    const userHandle = handle || `wallet_${walletAddress.slice(2, 10).toLowerCase()}`;
    const userDisplayName = displayName || walletPrefix;

    // Validate handle uniqueness
    try {
      await validateUniqueIdentifiers({ handle: userHandle });
    } catch (error) {
      // If handle exists, append random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      await validateUniqueIdentifiers({ handle: `${userHandle}_${randomSuffix}` });
    }

    // Create profile
    const profile = new ProfileModel({ displayName: userDisplayName });
    await profile.save();
    await this.context.feedService.seedNewProfileFeed(profile.id);

    const emailVerificationToken = uuidv4();

    // Auto-generate Nostr keypair for decentralized notifications
    const nostrKeypair = generateNostrKeypair();
    console.log('[Auth] Generated Nostr identity for wallet user:', nostrKeypair.publicKey.slice(0, 16) + '...');

    // Create user with wallet as primary identifier
    const user = new UserModel({
      email: syntheticEmail,
      handle: userHandle,
      profileId: profile._id,
      emailVerificationToken,
      magicWalletAddress: walletAddress, // Store in magic field for compatibility
      metaMaskWalletAddressees: [walletAddress], // Also store in MetaMask array
      authMethod: AuthMethod.wallet,
      isApprovedOnMarketplace: false, // Explicit default for wallet-only users
      // Auto-enable Nostr notifications with generated keypair
      nostrPubkey: nostrKeypair.publicKey,
      nostrPrivateKey: nostrKeypair.privateKey,
      notifyViaNostr: true,
    });

    const soundChainUser = await this.getSoundChainUser();
    console.log('Registering wallet-only user:', walletAddress);

    try {
      await user.save();
      if (soundChainUser) {
        await this.context.profileService.followProfile(profile._id, soundChainUser.profileId);
      }
      // Skip mailchimp for wallet-only users (no real email)
    } catch (err) {
      ProfileModel.deleteOne({ _id: profile.id });
      if (soundChainUser) {
        await this.context.profileService.unfollowProfile(profile._id, soundChainUser.profileId);
      }
      throw new Error(`Error while creating wallet user: ${err}`);
    }

    return user;
  }

  /**
   * Get existing user by wallet or create new wallet-only user
   */
  async getOrCreateByWallet(
    walletAddress: string,
    handle?: string,
    displayName?: string,
  ): Promise<User> {
    // Check if user exists with this wallet
    const existingUser = await this.context.userService.getUserByWallet(walletAddress);

    if (existingUser) {
      console.log('Found existing user for wallet:', walletAddress);
      return existingUser;
    }

    // Create new wallet-only user
    console.log('Creating new wallet-only user for:', walletAddress);
    return this.registerWithWallet(walletAddress, handle, displayName);
  }
}
