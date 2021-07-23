import { Arg, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import Profile from '../models/Profile';
import User from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { UserService } from '../services/UserService';
import RegisterInput from './types/RegisterInput';
import RegisterPayload from './types/RegisterPayload';

@Resolver(User)
export default class UserResolver {
  @FieldResolver(() => Profile)
  async profile(@Root() user: User): Promise<Profile> {
    return ProfileService.getProfile(user.profileId);
  }

  // TODO Remove after authentication
  @Query(() => User)
  async user(@Arg('id') id: string): Promise<User> {
    return UserService.getUser(id);
  }

  @Mutation(() => RegisterPayload)
  async register(
    @Arg('input')
    { email, handle, password, displayName }: RegisterInput,
  ): Promise<RegisterPayload> {
    const profile = await ProfileService.createProfile(displayName);
    const user = await UserService.createUser(email, handle, password, profile._id);
    return { user };
  }
}
