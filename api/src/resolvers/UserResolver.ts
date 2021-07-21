import { Arg, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import NotFoundError from '../errors/NotFoundError';
import Profile, { ProfileModel } from '../models/Profile';
import User, { UserModel } from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { UserService } from '../services/UserService';
import RegisterInput from './types/RegisterInput';
import RegisterPayload from './types/RegisterPayload';

@Resolver(User)
export default class UserResolver {
  @FieldResolver(() => Profile)
  async profile(@Root() user: User): Promise<Profile> {
    const profile = await ProfileModel.findByIdOrFail(user.profileId);
    if (!profile) throw new NotFoundError('profile', user.profileId);
    return profile;
  }

  @Query(() => User)
  async user(@Arg('id') id: string): Promise<User> {
    const user = await UserModel.findById(id);
    if (!user) throw new NotFoundError('user', id);
    return user;
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
