import { Magic } from '@magic-sdk/admin';
import { UserInputError } from 'apollo-server-express';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { AuthPayload } from '../types/AuthPayload';
import { Context } from '../types/Context';
import { LoginInput } from '../types/LoginInput';
import { RegisterInput } from '../types/RegisterInput';
import { UpdateHandleInput } from '../types/UpdateHandleInput';
import { UpdateHandlePayload } from '../types/UpdateHandlePayload';

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

  @Mutation(() => AuthPayload)
  async register(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { token, handle, displayName }: RegisterInput,
  ): Promise<AuthPayload> {
    const magic = new Magic(config.magicLink.secretKey)
    const did = magic.utils.parseAuthorizationHeader(`Bearer ${token}`)
    const magicUser = await magic.users.getMetadataByToken(did)

    const user = await authService.register(magicUser.email, handle, displayName, magicUser.publicAddress);
    return { jwt: jwtService.create(user) };
  }

  @Mutation(() => AuthPayload)
  async login(
    @Ctx() { authService, jwtService }: Context,
    @Arg('input') { token }: LoginInput,
  ): Promise<AuthPayload> {
    const magic = new Magic(config.magicLink.secretKey)
    const did = magic.utils.parseAuthorizationHeader(`Bearer ${token}`)
    const magicUser = await magic.users.getMetadataByToken(did)

    const user = await authService.getUserFromCredentials(magicUser.email);

    if (!user) {
      throw new UserInputError('Invalid credentials');
    }

    return { jwt: jwtService.create(user) };
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
