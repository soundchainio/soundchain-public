import UserEmailExists from '../errors/UserEmailExists';
import UserHandleExists from '../errors/UserHandleExists';
import User, { UserModel } from '../models/User';

export class UserService {
  static getUser(id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }

  static getUsers(): Promise<User[]> {
    return UserModel.find().exec();
  }

  static async createUser(user: User): Promise<User> {
    const existingUser = await UserModel.findOne({ email: user.email, handle: user.handle });
    if (existingUser) {
      if (existingUser.email === user.email) throw new UserEmailExists(user.email);
      throw new UserHandleExists(user.email);
    }
    const newUser = new UserModel(user);
    await newUser.save();
    return newUser;
  }
}
