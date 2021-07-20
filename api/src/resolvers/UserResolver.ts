import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import User, { UserModel } from '../models/User';
import { UserService } from '../services/UserService';
import CreateUserInput from './types/CreateUserInput';
import CreateUserPayload from './types/CreateUserPayload';

@Resolver(User)
export default class UserResolver {
  @Query(() => User)
  user(@Arg('id') id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }

  @Query(() => [User])
  users(): Promise<User[]> {
    return UserModel.find().exec();
  }

  @Mutation(() => CreateUserPayload)
  async createUser(@Arg('input') input: CreateUserInput): Promise<CreateUserPayload> {
    const user = await UserService.createUser(input as User);
    return { user };
  }
}
