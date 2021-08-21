import { User, UserModel } from '../models/User';
import { Service } from './Service';

export class UserService extends Service {
  getUser(id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }

  userExists(filter: Partial<User>): Promise<boolean> {
    return UserModel.exists(filter);
  }
}
