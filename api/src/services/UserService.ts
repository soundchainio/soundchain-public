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

  async updateHandle(id: string, handle: string): Promise<User> {
    const updatedUser = await UserModel.findByIdAndUpdate(id, { handle }, { new: true });
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedUser;
  }

  async updatePassword(id: string, password: string): Promise<void> {
    const user = await this.getUser(id);
    const userDoc = new this.model(user);
    userDoc.password = password;
    userDoc.save();
  }
}
