import { User, UserModel } from '../models/User';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class UserService extends ModelService<typeof User> {
  constructor(context: Context) {
    super(context, UserModel);
  }

  getUser(id: string): Promise<User> {
    return this.findOrFail(id);
  }

  userExists(filter: Partial<User>): Promise<boolean> {
    return UserModel.exists(filter);
  }
}
