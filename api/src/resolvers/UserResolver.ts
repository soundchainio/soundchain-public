import { Arg, Mutation, Resolver } from 'type-graphql';
import User from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { UserService } from '../services/UserService';
import RegisterInput from './types/RegisterInput';
import RegisterPayload from './types/RegisterPayload';

@Resolver(User)
export default class UserResolver {
  @Mutation(() => RegisterPayload)
  async register(
    @Arg('input')
    { email, handle, password, displayName, profilePicture, coverPicture, socialMediaLinks }: RegisterInput,
  ): Promise<RegisterPayload> {
    const profile = await ProfileService.createProfile(displayName, profilePicture, coverPicture, socialMediaLinks);
    const user = await UserService.createUser(email, handle, password, profile._id);
    return { user };
  }
}
