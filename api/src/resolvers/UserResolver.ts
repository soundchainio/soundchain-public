import { UserInputError } from 'apollo-server-express';
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { JwtService } from '../services/JwtService';
import { ProfileService } from '../services/ProfileService';
import { UserService } from '../services/UserService';
import { AuthPayload } from '../types/AuthPayload';
import { Context } from '../types/Context';
import { ForgotPasswordInput } from '../types/ForgotPasswordInput';
import { ForgotPasswordPayload } from '../types/ForgotPasswordPayload';
import { LoginInput } from '../types/LoginInput';
import { RegisterInput } from '../types/RegisterInput';
import { ResetPasswordInput } from '../types/ResetPasswordInput';
import { ResetPasswordPayload } from '../types/ResetPasswordPayload';
import { VerifyUserEmailInput } from '../types/VerifyUserEmailInput';
import { VerifyUserEmailPayload } from '../types/VerifyUserEmailPayload';

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => Profile)
  async profile(@Root() user: User): Promise<Profile> {
    return ProfileService.getProfile(user.profileId);
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() context: Context): Promise<User | undefined> {
    return context.user;
  }

  @Query(() => Boolean)
  validPasswordResetToken(@Arg('token') token: string): Promise<boolean> {
    return UserService.userExists({ passwordResetToken: token });
  }

  @Mutation(() => AuthPayload)
  async register(
    @Arg('input')
    { email, handle, password, displayName }: RegisterInput,
  ): Promise<AuthPayload> {
    const user = await AuthService.register(email, handle, password, displayName);
    return { jwt: JwtService.create(user) };
  }

  @Mutation(() => AuthPayload)
  async login(
    @Arg('input')
    { username, password }: LoginInput,
  ): Promise<AuthPayload> {
    const user = await AuthService.getUserFromCredentials(username, password);

    if (!user) {
      throw new UserInputError('Invalid credentials');
    }

    return { jwt: JwtService.create(user) };
  }

  @Mutation(() => VerifyUserEmailPayload)
  async verifyUserEmail(
    @Arg('input')
    { token }: VerifyUserEmailInput,
  ): Promise<VerifyUserEmailPayload> {
    const user = await AuthService.verifyUserEmail(token);
    return { user };
  }

  @Mutation(() => ForgotPasswordPayload)
  async forgotPassword(@Arg('input') { email }: ForgotPasswordInput): Promise<ForgotPasswordPayload> {
    await AuthService.initPasswordReset(email);
    return { ok: true };
  }

  @Mutation(() => ResetPasswordPayload)
  async resetPassword(@Arg('input') { token, password }: ResetPasswordInput): Promise<ResetPasswordPayload> {
    await AuthService.resetUserPassword(token, password);
    return { ok: true };
  }
}
