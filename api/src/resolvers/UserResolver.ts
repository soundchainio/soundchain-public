import { UserInputError } from 'apollo-server-express';
import { Arg, Ctx, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { AuthPayload } from '../types/AuthPayload';
import { Context } from '../types/Context';
import { ForgotPasswordInput } from '../types/ForgotPasswordInput';
import { ForgotPasswordPayload } from '../types/ForgotPasswordPayload';
import { UpdateHandleInput } from '../types/UpdateHandleInput';
import { UpdateHandlePayload } from '../types/UpdateHandlePayload';
import { LoginInput } from '../types/LoginInput';
import { RegisterInput } from '../types/RegisterInput';
import { ResetPasswordInput } from '../types/ResetPasswordInput';
import { ResetPasswordPayload } from '../types/ResetPasswordPayload';
import { VerifyUserEmailInput } from '../types/VerifyUserEmailInput';
import { VerifyUserEmailPayload } from '../types/VerifyUserEmailPayload';

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => Profile)
  async profile(@Ctx() { profileService }: Context, @Root() user: User): Promise<Profile> {
    return profileService.getProfile(user.profileId);
  }

  @Query(() => User, { nullable: true })
  async me(@CurrentUser() user?: User): Promise<User | undefined> {
    return user;
  }

  @Query(() => Boolean)
  validPasswordResetToken(@Ctx() { userService }: Context, @Arg('token') token: string): Promise<boolean> {
    return userService.userExists({ passwordResetToken: token });
  }

  @Mutation(() => AuthPayload)
  async register(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { email, handle, password, displayName }: RegisterInput,
  ): Promise<AuthPayload> {
    const user = await authService.register(email, handle, password, displayName);
    return { jwt: jwtService.create(user) };
  }

  @Mutation(() => AuthPayload)
  async login(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { username, password }: LoginInput,
  ): Promise<AuthPayload> {
    const user = await authService.getUserFromCredentials(username, password);

    if (!user) {
      throw new UserInputError('Invalid credentials');
    }

    return { jwt: jwtService.create(user) };
  }

  @Mutation(() => VerifyUserEmailPayload)
  async verifyUserEmail(
    @Ctx() { authService }: Context,
    @Arg('input') { token }: VerifyUserEmailInput,
  ): Promise<VerifyUserEmailPayload> {
    const user = await authService.verifyUserEmail(token);
    return { user };
  }

  @Mutation(() => ForgotPasswordPayload)
  async forgotPassword(
    @Ctx() { authService }: Context,
    @Arg('input') { email }: ForgotPasswordInput,
  ): Promise<ForgotPasswordPayload> {
    await authService.initPasswordReset(email);
    return { ok: true };
  }

  @Mutation(() => ResetPasswordPayload)
  async resetPassword(
    @Ctx() { authService }: Context,
    @Arg('input') { token, password }: ResetPasswordInput,
  ): Promise<ResetPasswordPayload> {
    await authService.resetUserPassword(token, password);
    return { ok: true };
  }

  @Mutation(() => UpdateHandlePayload)
  @Authorized()
  async updateHandle(
    @Ctx() { userService }: Context,
    @Arg('input') { handle }: UpdateHandleInput,
    @CurrentUser() { _id }: User,
  ): Promise<UpdateHandlePayload> {
    const user = await userService.updateHandle(_id, handle);
    return { user };
  }
}
