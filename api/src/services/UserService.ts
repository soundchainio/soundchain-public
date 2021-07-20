import { UserInputError } from 'apollo-server';
import { hashSync } from 'bcrypt';
import User, { UserModel } from '../models/User';

export class UserService {
  static getUser(id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }

  static getUsers(): Promise<User[]> {
    return UserModel.find().exec();
  }

  static async createUser(user: User): Promise<User> {
    const existingUser = await UserModel.findOne({ $or: [{ email: user.email }, { handle: user.handle }] });
    if (existingUser) {
      if (existingUser.email === user.email) throw new UserInputError(`${user.email} is in use`);
      throw new UserInputError(`${user.handle} is in use`);
    }
    const newUser = new UserModel({ ...user, password: hashSync(user.password, 10) });
    await newUser.save();
    return newUser;
  }
}
