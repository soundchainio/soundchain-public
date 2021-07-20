import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import User from '../models/User';
import { UserService } from '../services/UserService';
import CreateUserPayload from './types/CreateUserPayload';
import RegisterInput from './types/RegisterInput';

@Resolver(User)
export default class UserResolver {
  @Query(() => User)
  user(@Arg('id') id: string): Promise<User> {
    return UserService.getUser(id);
  }

  @Mutation(() => CreateUserPayload)
  async register(@Arg('input') { email, handle, password, displayName }: RegisterInput): Promise<CreateUserPayload> {
    const user = await UserService.createUser(email, handle, displayName, password);
    return { user };
  }
}
