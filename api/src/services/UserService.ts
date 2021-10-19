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

  async updateWalletAddress(id: string, walletAddress: string): Promise<User> {
    const updatedUser = await UserModel.findByIdAndUpdate(id, { walletAddress }, { new: true });
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedUser;
  }

  async setIsApprovedOnMarketplace(id: string): Promise<User> {
    const updatedUser = await UserModel.findByIdAndUpdate(id, { isApprovedOnMarketplace: true }, { new: true });
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedUser;
  }
}
