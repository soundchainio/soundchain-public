import { Magic } from '@magic-sdk/admin';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { ProofBookItem } from '../models/ProofBookItem';
import { User } from '../models/User';
import { AuthMethod } from '../types/AuthMethod';
import { AuthPayload } from '../types/AuthPayload';
import { Context } from '../types/Context';
import { LoginInput } from '../types/LoginInput';
import { RegisterInput } from '../types/RegisterInput';
import { UpdateDefaultWalletInput } from '../types/UpdateDefaultWalletInput';
import { UpdateDefaultWalletPayload } from '../types/UpdateDefaultWalletPayload';
import { UpdateHandleInput } from '../types/UpdateHandleInput';
import { UpdateHandlePayload } from '../types/UpdateHandlePayload';
import { UpdateOTPInput } from '../types/UpdateOTPInput';
import { UpdateOTPPayload } from '../types/UpdateOTPPayload';
import { UpdateWalletInput } from '../types/UpdateWalletInput';
import { ValidateOTPRecoveryPhraseInput } from '../types/ValidateOTPRecoveryPhraseInput';

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => Profile)
  async profile(@Ctx() { profileService }: Context, @Root() user: User): Promise<Profile> {
    console.log(`Fetching profile for user: ${user._id}`);
    const profile = await profileService.getProfile(user.profileId.toString());
    console.log(`Profile fetched: ${profile._id}`);
    return profile;
  }

  @Query(() => User, { nullable: true })
  async me(@CurrentUser() user?: User): Promise<User | undefined> {
    console.log(`Fetching current user: ${user ? user._id : 'none'}`);
    return user;
  }

  @Mutation(() => AuthPayload)
  async register(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { token, handle, displayName }: RegisterInput,
  ): Promise<AuthPayload> {
    console.log('register mutation called with:', { token, handle, displayName });
    try {
      const magic = new Magic(config.magicLink.secretKey);
      console.log('Parsing DID token for registration');
      const did = magic.utils.parseAuthorizationHeader(`Bearer ${token}`);
      console.log('DID token parsed:', did);
      console.log('Fetching Magic user metadata');
      const magicUser = await magic.users.getMetadataByToken(did);
      console.log('Magic user metadata:', magicUser);

      console.log('Registering user with authService');
      const user = await authService.register(
        magicUser.email,
        handle,
        displayName,
        magicUser.publicAddress,
        magicUser.oauthProvider,
      );
      console.log('User registered:', user._id.toString());

      const jwt = jwtService.create(user);
      console.log('JWT created for registration:', jwt);
      return { jwt };
    } catch (error) {
      console.error('register mutation error:', error);
      throw error;
    }
  }

  @Mutation(() => AuthPayload)
  async login(
    @Ctx() { authService, jwtService, userService }: Context,
    @Arg('input') { token }: LoginInput,
  ): Promise<AuthPayload> {
    console.log('login mutation called with token:', token);
    try {
      const magic = new Magic(config.magicLink.secretKey);
      console.log('Parsing DID token');
      const did = magic.utils.parseAuthorizationHeader(`Bearer ${token}`);
      console.log('DID token parsed:', did);
      console.log('Fetching Magic user metadata');
      const magicUser = await magic.users.getMetadataByToken(did);
      console.log('Magic user metadata:', magicUser);
      console.log('Fetching users by email:', magicUser.email);
      const users = await authService.getUserFromCredentials(magicUser.email);

      if (!users?.length) {
        console.log('No users found for email:', magicUser.email);
        throw new UserInputError('Invalid credentials');
      }

      const authMethod = magicUser.oauthProvider || AuthMethod.magicLink;
      console.log('Auth method:', authMethod);
      const user = users.find(u => u.authMethod === authMethod);

      // Update the OAuth-specific wallet if the address changed or is new
      if (user && magicUser.publicAddress) {
        const currentWallet = (() => {
          switch (authMethod) {
            case AuthMethod.google: return user.googleWalletAddress;
            case AuthMethod.discord: return user.discordWalletAddress;
            case AuthMethod.twitch: return user.twitchWalletAddress;
            case AuthMethod.magicLink: return user.emailWalletAddress;
            default: return user.magicWalletAddress;
          }
        })();

        if (!currentWallet || currentWallet !== magicUser.publicAddress) {
          console.log(`Updating ${authMethod} wallet address for user:`, user._id.toString());
          await userService.updateOAuthWallet(user._id.toString(), magicUser.publicAddress, authMethod);
          console.log(`${authMethod} wallet updated`);
        }
      }

      if (!user) {
        console.log('User not found with auth method:', authMethod, 'Existing methods:', users.map(u => u.authMethod));
        throw new AuthenticationError('already exists', { with: users.map(u => u.authMethod) });
      }
      console.log('User authenticated:', user.email);
      const jwt = jwtService.create(user);
      console.log('JWT created:', jwt);
      return { jwt };
    } catch (error) {
      console.error('login mutation error:', error);
      throw error;
    }
  }

  @Mutation(() => UpdateHandlePayload)
  @Authorized()
  async updateHandle(
    @Ctx() { userService }: Context,
    @Arg('input') { handle }: UpdateHandleInput,
    @CurrentUser() { _id }: User,
  ): Promise<UpdateHandlePayload> {
    console.log(`updateHandle called for user: ${_id}, new handle: ${handle}`);
    const user = await userService.updateHandle(_id.toString(), handle);
    console.log('Handle updated:', user.handle);
    return { user };
  }

  @Mutation(() => UpdateDefaultWalletPayload)
  @Authorized()
  async updateDefaultWallet(
    @Ctx() { userService }: Context,
    @Arg('input') { defaultWallet }: UpdateDefaultWalletInput,
    @CurrentUser() { _id }: User,
  ): Promise<UpdateHandlePayload> {
    console.log(`updateDefaultWallet called for user: ${_id}, defaultWallet: ${defaultWallet}`);
    const user = await userService.updateDefaultWallet(_id.toString(), defaultWallet);
    console.log('Default wallet updated:', user.defaultWallet);
    return { user };
  }

  @Mutation(() => UpdateDefaultWalletPayload)
  @Authorized()
  async updateMetaMaskAddresses(
    @Ctx() { userService }: Context,
    @Arg('input') { wallet }: UpdateWalletInput,
    @CurrentUser() { _id }: User,
  ): Promise<UpdateHandlePayload> {
    console.log(`updateMetaMaskAddresses called for user: ${_id}, wallet: ${wallet}`);
    const user = await userService.updateMetaMaskAddresses(_id.toString(), wallet);
    console.log('MetaMask addresses updated:', user);
    return { user };
  }

  @Mutation(() => UpdateOTPPayload)
  @Authorized()
  async updateOTP(
    @Ctx() { userService }: Context,
    @Arg('input') { otpSecret, otpRecoveryPhrase }: UpdateOTPInput,
    @CurrentUser() { _id }: User,
  ): Promise<UpdateHandlePayload> {
    console.log(`updateOTP called for user: ${_id}, otpSecret: ${otpSecret}, otpRecoveryPhrase: ${otpRecoveryPhrase}`);
    const user = await userService.updateOTP({ _id, otpSecret, otpRecoveryPhrase });
    console.log('OTP updated:', user);
    return { user };
  }

  @Mutation(() => Boolean)
  @Authorized()
  async validateOTPRecoveryPhrase(
    @Ctx() { userService }: Context,
    @Arg('input') { otpRecoveryPhrase }: ValidateOTPRecoveryPhraseInput,
    @CurrentUser() { _id }: User,
  ): Promise<boolean> {
    console.log(`validateOTPRecoveryPhrase called for user: ${_id}, otpRecoveryPhrase: ${otpRecoveryPhrase}`);
    const result = await userService.validateOTPRecoveryPhrase({ _id, otpRecoveryPhrase });
    console.log('OTP recovery phrase validation result:', result);
    return result;
  }

  @Query(() => User, { nullable: true })
  async getUserByWallet(@Ctx() { userService }: Context, @Arg('walletAddress') walletAddress: string): Promise<User> {
    console.log(`getUserByWallet called with walletAddress: ${walletAddress}`);
    const user = await userService.getUserByWallet(walletAddress);
    console.log('User by wallet:', user ? user._id : 'none');
    return user;
  }

  @Query(() => ProofBookItem, { nullable: true })
  async getProofBookByWallet(
    @Ctx() { proofBookService }: Context,
    @Arg('walletAddress') walletAddress: string,
  ): Promise<ProofBookItem> {
    console.log(`getProofBookByWallet called with walletAddress: ${walletAddress}`);
    const proofBook = await proofBookService.getUserProofBook(walletAddress);
    console.log('Proof book by wallet:', proofBook ? proofBook._id : 'none');
    return proofBook;
  }
}
