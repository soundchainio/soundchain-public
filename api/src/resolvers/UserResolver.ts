import { UserInputError } from 'apollo-server-express';
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import Profile from '../models/Profile';
import User from '../models/User';
import AuthService from '../services/AuthService';
import JwtService from '../services/JwtService';
import { ProfileService } from '../services/ProfileService';
import Context from '../types/Context';
import AuthPayload from './types/AuthPayload';
import LoginInput from './types/LoginInput';
import RegisterInput from './types/RegisterInput';

@Resolver(User)
export default class UserResolver {
  @FieldResolver(() => Profile)
  async profile(@Root() user: User): Promise<Profile> {
    return ProfileService.getProfile(user.profileId);
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() context: Context): Promise<User | undefined> {
    return context.user;
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
}
