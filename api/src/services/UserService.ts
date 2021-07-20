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

  static async createUser(email: string, handle: string, displayName: string, password: string): Promise<User> {
    const existingUser = await UserModel.findOne({ $or: [{ email }, { handle }] });
    if (existingUser) {
      if (existingUser.email === email) throw new UserInputError(`${email} is in use`);
      throw new UserInputError(`${handle} is in use`);
    }
    const newUser = new UserModel({ email, handle, password: hashSync(password, 10), displayName });
    await newUser.save();
    return newUser;
  }
}
