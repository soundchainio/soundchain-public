import User, { UserModel } from '../models/User';

export class UserService {
  static getUser(id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }
}
