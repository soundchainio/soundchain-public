import { UserInputError } from 'apollo-server-express';
import { hashSync } from 'bcrypt';
import User, { UserModel } from '../models/User';

export class UserService {
  static getUser(id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }

  static async createUser(email: string, handle: string, password: string, profileId: string): Promise<User> {
    const existingUser = await UserModel.findOne({ $or: [{ email }, { handle }] });
    if (existingUser) {
      throw new UserInputError(`${existingUser.email === email ? email : handle} is in use`);
    }
    const newUser = new UserModel({ email, handle, password: hashSync(password, 10), profileId });
    await newUser.save();
    return newUser;
  }
}
