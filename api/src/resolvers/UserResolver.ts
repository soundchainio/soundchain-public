import { Magic } from '@magic-sdk/admin';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import crypto from 'crypto';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { ProofBookItem } from '../models/ProofBookItem';
import { User, UserModel, PrimaryWalletType, MigrationStatus } from '../models/User';
import { PasskeyCredentialModel } from '../models/PasskeyCredential';
import { deriveHumanEvmWallet } from '../utils/hdWallet';
import { PasskeyChallengeModel } from '../models/PasskeyChallenge';
import { AuthMethod } from '../types/AuthMethod';
import { AuthPayload } from '../types/AuthPayload';
import { Context } from '../types/Context';
import { LoginInput } from '../types/LoginInput';
import { LoginWithWalletInput } from '../types/LoginWithWalletInput';
import { CreateHdAccountInput } from '../types/CreateHdAccountInput';
import { HdAccountPayload } from '../types/HdAccountPayload';
import { PasskeyOptionsPayload, PasskeyVerifyPayload, PasskeyRegisterVerifyInput, PasskeyLoginVerifyInput } from '../types/PasskeyTypes';
import { RegisterInput } from '../types/RegisterInput';
import { UpdateDefaultWalletInput } from '../types/UpdateDefaultWalletInput';
import { UpdateDefaultWalletPayload } from '../types/UpdateDefaultWalletPayload';
import { UpdateHandleInput } from '../types/UpdateHandleInput';
import { UpdateHandlePayload } from '../types/UpdateHandlePayload';
import { UpdateNotificationSettingsInput } from '../types/UpdateNotificationSettingsInput';
import { UpdateOTPInput } from '../types/UpdateOTPInput';
import { UpdateOTPPayload } from '../types/UpdateOTPPayload';
import { UpdateWalletInput } from '../types/UpdateWalletInput';
import { ValidateOTPRecoveryPhraseInput } from '../types/ValidateOTPRecoveryPhraseInput';
import { generateNostrKeypair } from '../utils/nostrKeygen';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

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

    // Grandfather existing users: auto-generate Nostr keypair if missing
    // This handles session restore (cookie-based auth) which bypasses login mutation
    if (user && (!user.nostrPubkey || !user.nostrPrivateKey)) {
      try {
        const nostrKeypair = generateNostrKeypair();
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              nostrPubkey: nostrKeypair.publicKey,
              nostrPrivateKey: nostrKeypair.privateKey,
              notifyViaNostr: user.notifyViaNostr !== false, // Keep existing preference if set to false
            },
          }
        );
        // Update in-memory user object so response has the new pubkey
        user.nostrPubkey = nostrKeypair.publicKey;
        user.nostrPrivateKey = nostrKeypair.privateKey;
        if (user.notifyViaNostr === undefined) {
          user.notifyViaNostr = true;
        }
        console.log('[Auth] Generated Nostr identity for existing user (session restore):', user.email, nostrKeypair.publicKey.slice(0, 16) + '...');
      } catch (nostrErr) {
        console.error('[Auth] Failed to generate Nostr keypair:', nostrErr);
        // Non-blocking - continue returning user even if Nostr generation fails
      }
    }

    return user;
  }

  @Mutation(() => AuthPayload)
  async register(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { token, handle, displayName }: RegisterInput,
  ): Promise<AuthPayload> {
    console.log('register mutation called with:', { token, handle, displayName });
    try {
      const magic = await Magic.init(config.magicLink.secretKey);
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
    } catch (error: any) {
      console.error('register mutation error:', error);
      console.error('Magic error data:', error?.data);
      console.error('Magic error code:', error?.code);
      console.error('Secret key used (first 10 chars):', config.magicLink.secretKey?.slice(0, 10));
      throw error;
    }
  }

  @Mutation(() => AuthPayload)
  async login(
    @Ctx() { authService, jwtService, userService }: Context,
    @Arg('input') { token, email: inputEmail }: LoginInput,
  ): Promise<AuthPayload> {
    console.log('login mutation called with token:', token);
    try {
      const magic = await Magic.init(config.magicLink.secretKey);
      console.log('Parsing DID token');
      const did = magic.utils.parseAuthorizationHeader(`Bearer ${token}`);
      console.log('DID token parsed:', did);
      console.log('Fetching Magic user metadata');

      let magicUser: any;
      try {
        magicUser = await magic.users.getMetadataByToken(did);
      } catch (metadataError: any) {
        if (metadataError.message?.includes('SERVICE_ERROR')) {
          // Retry once after 1s — transient Magic API issue (common with mobile Safari tokens)
          console.log('[Auth] SERVICE_ERROR on getMetadataByToken, retrying in 1s...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            magicUser = await magic.users.getMetadataByToken(did);
          } catch (retryError: any) {
            if (retryError.message?.includes('SERVICE_ERROR')) {
              // Final fallback: validate token locally and look up user by issuer
              console.log('[Auth] SERVICE_ERROR on retry, attempting local token validation...');
              try {
                magic.token.validate(did);
                const issuer = magic.token.getIssuer(did);
                const publicAddress = issuer.replace('did:ethr:', '');
                console.log('[Auth] Token valid locally, issuer:', issuer, 'address:', publicAddress);

                // Look up user by any wallet address field
                const userByWallet = await UserModel.findOne({
                  $or: [
                    { magicWalletAddress: { $regex: new RegExp(`^${publicAddress}$`, 'i') } },
                    { emailWalletAddress: { $regex: new RegExp(`^${publicAddress}$`, 'i') } },
                    { googleWalletAddress: { $regex: new RegExp(`^${publicAddress}$`, 'i') } },
                    { discordWalletAddress: { $regex: new RegExp(`^${publicAddress}$`, 'i') } },
                    { twitchWalletAddress: { $regex: new RegExp(`^${publicAddress}$`, 'i') } },
                  ],
                });

                if (userByWallet) {
                  console.log('[Auth] Found user by wallet address:', userByWallet.email);
                  magicUser = {
                    email: userByWallet.email,
                    publicAddress,
                    issuer,
                    oauthProvider: null,
                  };
                } else if (inputEmail) {
                  // Wallet address mismatch (e.g. Google OAuth user logging in via email).
                  // Use frontend-provided email — token is cryptographically valid,
                  // and we only use this for EXISTING user lookup (not registration).
                  console.log('[Auth] Wallet not found, using frontend email fallback:', inputEmail);
                  magicUser = {
                    email: inputEmail,
                    publicAddress,
                    issuer,
                    oauthProvider: null,
                  };
                } else {
                  console.log('[Auth] No user found by wallet, no email provided, SERVICE_ERROR unrecoverable');
                  throw retryError;
                }
              } catch (localError: any) {
                if (localError.message?.includes('SERVICE_ERROR')) {
                  throw localError; // re-throw the original SERVICE_ERROR
                }
                console.error('[Auth] Local token validation failed:', localError.message);
                throw retryError;
              }
            } else {
              throw retryError;
            }
          }
        } else {
          throw metadataError;
        }
      }
      console.log('Magic user metadata:', magicUser);
      console.log('Fetching users by email:', magicUser.email);
      const users = await authService.getUserFromCredentials(magicUser.email);

      if (!users?.length) {
        console.log('No users found for email:', magicUser.email, '- auto-registering');

        // Auto-register: generate handle from email prefix, create account
        const emailPrefix = magicUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        let handle = emailPrefix.slice(0, 20) || 'user';

        // Check handle uniqueness, append random suffix if taken
        const existingHandle = await UserModel.findOne({
          handle: { $regex: `^${handle}$`, $options: 'i' },
        });
        if (existingHandle) {
          handle = `${handle.slice(0, 16)}_${Math.random().toString(36).slice(2, 6)}`;
        }

        const authMethod = magicUser.oauthProvider || AuthMethod.magicLink;
        console.log('[Auto-Register] Creating account:', magicUser.email, handle, authMethod);

        const user = await authService.register(
          magicUser.email,
          handle,
          handle, // displayName defaults to handle
          magicUser.publicAddress,
          authMethod,
        );

        console.log('[Auto-Register] Account created:', user._id.toString());
        const jwt = jwtService.create(user);
        return { jwt };
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

      // Grandfather existing users: auto-generate Nostr keypair if missing
      if (!user.nostrPubkey || !user.nostrPrivateKey) {
        try {
          const nostrKeypair = generateNostrKeypair();
          await UserModel.updateOne(
            { _id: user._id },
            {
              $set: {
                nostrPubkey: nostrKeypair.publicKey,
                nostrPrivateKey: nostrKeypair.privateKey,
                notifyViaNostr: true,
              },
            }
          );
          console.log('[Auth] Generated Nostr identity for existing user:', user.email, nostrKeypair.publicKey.slice(0, 16) + '...');
        } catch (nostrErr) {
          console.error('[Auth] Failed to generate Nostr keypair:', nostrErr);
          // Non-blocking - continue login even if Nostr generation fails
        }
      }

      const jwt = jwtService.create(user);
      console.log('JWT created:', jwt);
      return { jwt };
    } catch (error: any) {
      console.error('login mutation error:', error);
      console.error('Magic error data:', error?.data);
      console.error('Magic error code:', error?.code);
      console.error('Secret key used (first 10 chars):', config.magicLink.secretKey?.slice(0, 10));
      throw error;
    }
  }

  /**
   * Login with wallet signature (MetaMask, Coinbase, WalletConnect, etc.)
   * No email/OAuth required - creates account if doesn't exist
   */
  @Mutation(() => AuthPayload)
  async loginWithWallet(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { walletAddress, signature, message, handle, displayName }: LoginWithWalletInput,
  ): Promise<AuthPayload> {
    console.log('loginWithWallet mutation called for wallet:', walletAddress);

    try {
      // Verify the signature matches the wallet address
      const isValid = authService.verifyWalletSignature(walletAddress, message, signature);

      if (!isValid) {
        console.error('Invalid wallet signature for:', walletAddress);
        throw new AuthenticationError('Invalid wallet signature');
      }

      console.log('Signature verified for wallet:', walletAddress);

      // Get existing user or create new wallet-only user
      const user = await authService.getOrCreateByWallet(walletAddress, handle, displayName);

      console.log('User authenticated via wallet:', user._id.toString());

      // Grandfather existing wallet users: auto-generate Nostr keypair if missing
      if (!user.nostrPubkey || !user.nostrPrivateKey) {
        try {
          const nostrKeypair = generateNostrKeypair();
          await UserModel.updateOne(
            { _id: user._id },
            {
              $set: {
                nostrPubkey: nostrKeypair.publicKey,
                nostrPrivateKey: nostrKeypair.privateKey,
                notifyViaNostr: true,
              },
            }
          );
          console.log('[Auth] Generated Nostr identity for wallet user:', walletAddress, nostrKeypair.publicKey.slice(0, 16) + '...');
        } catch (nostrErr) {
          console.error('[Auth] Failed to generate Nostr keypair:', nostrErr);
          // Non-blocking - continue login even if Nostr generation fails
        }
      }

      // Create JWT
      const jwt = jwtService.create(user);
      console.log('JWT created for wallet user:', jwt.substring(0, 20) + '...');

      return { jwt };
    } catch (error) {
      console.error('loginWithWallet mutation error:', error);
      throw error;
    }
  }

  /**
   * Create a new account with HD wallet (no external wallet or Magic OAuth required)
   * User provides email + handle. Backend generates HD wallet.
   * Future logins use email OTP on the login page.
   */
  @Mutation(() => HdAccountPayload)
  async createHdAccount(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { email, handle, displayName }: CreateHdAccountInput,
  ): Promise<HdAccountPayload> {
    console.log('createHdAccount mutation called:', email, handle);

    try {
      const { user, hdWalletAddress } = await authService.registerHdAccount(email, handle, displayName);

      console.log('HD account created:', user._id.toString(), hdWalletAddress);

      // Create JWT
      const jwt = jwtService.create(user);

      return { jwt, hdWalletAddress, handle: user.handle };
    } catch (error) {
      console.error('createHdAccount mutation error:', error);
      throw error;
    }
  }

  /**
   * Upgrade legacy OAuth user to HD wallet.
   * Generates a deterministic HD wallet from their profileId (matching registration flow).
   * Old OAuth wallet preserved — HD wallet becomes primary for all blockchain operations.
   */
  @Mutation(() => User)
  @Authorized()
  async upgradeToHdWallet(
    @CurrentUser() currentUser: User,
  ): Promise<User> {
    console.log('[HD Upgrade] upgradeToHdWallet called for user:', currentUser._id);

    if (currentUser.hdWalletAddress) {
      throw new UserInputError('You already have an HD wallet: ' + currentUser.hdWalletAddress);
    }

    const hdWallet = deriveHumanEvmWallet(currentUser.profileId.toString());
    if (!hdWallet) {
      throw new Error('HD wallet system not configured. Contact support.');
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      currentUser._id,
      {
        $set: {
          hdWalletAddress: hdWallet.address,
          hdWalletCreatedAt: new Date(),
          primaryWallet: PrimaryWalletType.HD,
          migrationStatus: MigrationStatus.PENDING,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    console.log('[HD Upgrade] Generated HD wallet for legacy user:', currentUser._id, hdWallet.address);
    return updatedUser;
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

  @Mutation(() => User)
  @Authorized()
  async updateNotificationSettings(
    @Ctx() { userService }: Context,
    @Arg('input') input: UpdateNotificationSettingsInput,
    @CurrentUser() { _id }: User,
  ): Promise<User> {
    console.log(`updateNotificationSettings called for user: ${_id}`);
    const user = await userService.updateNotificationSettings(_id.toString(), input);
    console.log('Notification settings updated');
    return user;
  }

  // ============================================
  // PASSKEY / FACE ID AUTHENTICATION
  // ============================================

  private get rpID(): string {
    return process.env.WEBAUTHN_RP_ID || 'soundchain.io';
  }

  private get rpName(): string {
    return 'SoundChain';
  }

  private get expectedOrigin(): string {
    return process.env.WEBAUTHN_ORIGIN || 'https://soundchain.io';
  }

  /**
   * L1 Email Bypass — direct email-to-JWT login for recognized users.
   * No Magic OAuth, no OTP, no third-party service.
   * Security layer: EmailKey (Face ID) is checked FIRST on the frontend.
   * This mutation is the fallback for legacy users without an EmailKey.
   */
  @Mutation(() => AuthPayload)
  async loginByEmail(
    @Ctx() { jwtService }: Context,
    @Arg('email') email: string,
  ): Promise<AuthPayload> {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new UserInputError('Email is required');
    }

    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AuthenticationError('No account found with this email. Please create an account.');
    }

    // Security: Block direct email login if user has EmailKey (Face ID) credentials.
    // They MUST use Face ID — prevents anyone with just your email from accessing your profile.
    const hasEmailKey = await PasskeyCredentialModel.countDocuments({ userId: user._id });
    if (hasEmailKey > 0) {
      throw new AuthenticationError('EMAILKEY_REQUIRED');
    }

    // Auto-generate Nostr keypair if missing
    if (!user.nostrPubkey || !user.nostrPrivateKey) {
      try {
        const nostrKeypair = generateNostrKeypair();
        await UserModel.updateOne(
          { _id: user._id },
          { $set: { nostrPubkey: nostrKeypair.publicKey, nostrPrivateKey: nostrKeypair.privateKey, notifyViaNostr: true } },
        );
      } catch (nostrErr) {
        console.error('[LoginByEmail] Nostr keypair error:', nostrErr);
      }
    }

    const jwt = jwtService.create(user);
    console.log('[LoginByEmail] Direct login for:', normalizedEmail);
    return { jwt };
  }

  /**
   * Step 1 of passkey REGISTRATION: generate options for the browser.
   * Requires the user to be logged in (any auth method).
   */
  @Mutation(() => PasskeyOptionsPayload)
  @Authorized()
  async passkeyRegisterOptions(
    @CurrentUser() user: User,
  ): Promise<PasskeyOptionsPayload> {
    console.log('[EmailKey] Register options requested for user:', user.email);

    // Generate a stable webauthnUserID if the user doesn't have one
    if (!user.webauthnUserID) {
      const webauthnUserID = crypto.randomBytes(32).toString('base64url');
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { webauthnUserID } },
      );
      user.webauthnUserID = webauthnUserID;
    }

    // Fetch existing credentials to exclude (prevents re-registering same authenticator)
    const existingCredentials = await PasskeyCredentialModel.find({ userId: user._id });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.email,
      userDisplayName: user.handle,
      userID: new TextEncoder().encode(user.webauthnUserID),
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(c => ({
        id: c.credentialID,
        transports: c.transports as any[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Store challenge for verification
    const sessionId = crypto.randomBytes(32).toString('hex');
    const challengeDoc = new PasskeyChallengeModel();
    challengeDoc.sessionId = sessionId;
    challengeDoc.challenge = options.challenge;
    challengeDoc.userId = user._id;
    challengeDoc.type = 'registration';
    await challengeDoc.save();

    console.log('[EmailKey] Registration options generated, sessionId:', sessionId);

    return {
      sessionId,
      options: JSON.stringify(options),
    };
  }

  /**
   * Step 2 of passkey REGISTRATION: verify the credential from the browser.
   * Requires the user to be logged in.
   */
  @Mutation(() => PasskeyVerifyPayload)
  @Authorized()
  async passkeyRegisterVerify(
    @Arg('input') { sessionId, credential, friendlyName }: PasskeyRegisterVerifyInput,
    @CurrentUser() user: User,
  ): Promise<PasskeyVerifyPayload> {
    console.log('[EmailKey] Register verify for user:', user.email, 'sessionId:', sessionId);

    // Look up the challenge
    const challengeDoc = await PasskeyChallengeModel.findOne({ sessionId, type: 'registration' });
    if (!challengeDoc) {
      throw new AuthenticationError('Invalid or expired passkey session');
    }

    // Verify the challenge belongs to this user
    if (challengeDoc.userId?.toString() !== user._id.toString()) {
      throw new AuthenticationError('Session does not match user');
    }

    const parsedCredential = JSON.parse(credential);

    const verification = await verifyRegistrationResponse({
      response: parsedCredential,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: this.expectedOrigin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new AuthenticationError('Passkey registration verification failed');
    }

    const { credential: verifiedCredential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Store the credential
    const credDoc = new PasskeyCredentialModel();
    credDoc.userId = user._id;
    credDoc.credentialID = verifiedCredential.id;
    credDoc.publicKey = Buffer.from(verifiedCredential.publicKey);
    credDoc.counter = verifiedCredential.counter;
    credDoc.transports = parsedCredential.response?.transports || [];
    credDoc.deviceType = credentialDeviceType;
    credDoc.backedUp = credentialBackedUp;
    credDoc.friendlyName = friendlyName || 'Passkey';
    await credDoc.save();

    // Clean up the challenge
    await PasskeyChallengeModel.deleteOne({ _id: challengeDoc._id });

    console.log('[EmailKey] Credential registered successfully for user:', user.email);

    return { success: true };
  }

  /**
   * Step 1 of EmailKey LOGIN: generate authentication options for a specific email.
   * No auth required — this is the login entry point.
   * Accepts email to look up specific credentials (no QR code, no discoverable keys).
   */
  @Mutation(() => PasskeyOptionsPayload)
  async passkeyLoginOptions(
    @Arg('email', { nullable: true }) email?: string,
  ): Promise<PasskeyOptionsPayload> {
    console.log('[EmailKey] Login options requested for:', email || '(no email)');

    // If email provided, look up user and their specific credentials
    if (email) {
      const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return { sessionId: '', options: '', hasEmailKey: false };
      }

      const credentials = await PasskeyCredentialModel.find({ userId: user._id });
      if (credentials.length === 0) {
        return { sessionId: '', options: '', hasEmailKey: false };
      }

      // Generate options with SPECIFIC allowCredentials — forces Face ID only, NO QR code
      const options = await generateAuthenticationOptions({
        rpID: this.rpID,
        userVerification: 'preferred',
        allowCredentials: credentials.map(c => ({
          id: c.credentialID,
          transports: ['internal'] as any[], // Platform authenticator only
        })),
      });

      const sessionId = crypto.randomBytes(32).toString('hex');
      const authChallenge = new PasskeyChallengeModel();
      authChallenge.sessionId = sessionId;
      authChallenge.challenge = options.challenge;
      authChallenge.type = 'authentication';
      await authChallenge.save();

      console.log('[EmailKey] Authentication options generated for:', email, 'sessionId:', sessionId);

      return {
        sessionId,
        options: JSON.stringify(options),
        hasEmailKey: true,
      };
    }

    // Fallback: no email provided — use discoverable credentials (legacy passkey flow)
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      allowCredentials: [],
    });

    const sessionId = crypto.randomBytes(32).toString('hex');
    const authChallenge = new PasskeyChallengeModel();
    authChallenge.sessionId = sessionId;
    authChallenge.challenge = options.challenge;
    authChallenge.type = 'authentication';
    await authChallenge.save();

    return {
      sessionId,
      options: JSON.stringify(options),
    };
  }

  /**
   * Step 2 of passkey LOGIN: verify the authentication response.
   * No auth required — this issues the JWT.
   */
  @Mutation(() => AuthPayload)
  async passkeyLoginVerify(
    @Ctx() { jwtService }: Context,
    @Arg('input') { sessionId, credential }: PasskeyLoginVerifyInput,
  ): Promise<AuthPayload> {
    console.log('[EmailKey] Login verify, sessionId:', sessionId);

    // Look up the challenge
    const challengeDoc = await PasskeyChallengeModel.findOne({ sessionId, type: 'authentication' });
    if (!challengeDoc) {
      throw new AuthenticationError('Invalid or expired passkey session');
    }

    const parsedCredential = JSON.parse(credential);

    // Find the credential in our DB by the credential ID from the response
    const storedCredential = await PasskeyCredentialModel.findOne({
      credentialID: parsedCredential.id,
    });

    if (!storedCredential) {
      throw new AuthenticationError('Passkey not recognized. Please log in with email or Google first, then set up Face ID.');
    }

    const verification = await verifyAuthenticationResponse({
      response: parsedCredential,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: this.expectedOrigin,
      expectedRPID: this.rpID,
      credential: {
        id: storedCredential.credentialID,
        publicKey: new Uint8Array(storedCredential.publicKey),
        counter: storedCredential.counter,
        transports: storedCredential.transports as any[],
      },
      // Allow passkeys synced via iCloud Keychain to work across devices (Chrome Mac, Safari iPad, etc.)
      // The platform authenticator (Touch ID / Face ID) handles user verification locally —
      // some cross-platform bridges don't propagate the UV flag, causing false rejections.
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new AuthenticationError('Passkey authentication failed');
    }

    // Update counter (replay protection)
    await PasskeyCredentialModel.updateOne(
      { _id: storedCredential._id },
      {
        $set: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      },
    );

    // Clean up the challenge
    await PasskeyChallengeModel.deleteOne({ _id: challengeDoc._id });

    // Find the user
    const user = await UserModel.findById(storedCredential.userId);
    if (!user) {
      throw new AuthenticationError('User account not found');
    }

    // Auto-generate Nostr keypair if missing (same pattern as loginWithWallet)
    if (!user.nostrPubkey || !user.nostrPrivateKey) {
      try {
        const nostrKeypair = generateNostrKeypair();
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              nostrPubkey: nostrKeypair.publicKey,
              nostrPrivateKey: nostrKeypair.privateKey,
              notifyViaNostr: true,
            },
          },
        );
        console.log('[EmailKey] Generated Nostr identity for user:', user.email);
      } catch (nostrErr) {
        console.error('[EmailKey] Failed to generate Nostr keypair:', nostrErr);
      }
    }

    // Issue JWT
    const jwt = jwtService.create(user);
    console.log('[EmailKey] Login successful for user:', user.email);

    return { jwt };
  }
}
