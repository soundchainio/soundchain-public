import { User, UserModel } from '../models/User';
import { Context } from '../types/Context';
import { DefaultWallet } from '../types/DefaultWallet';
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

  async updateDefaultWallet(id: string, defaultWallet: DefaultWallet): Promise<User> {
    const updatedUser = await UserModel.findByIdAndUpdate(id, { defaultWallet }, { new: true });
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedUser;
  }

  async updateMetaMaskAddresses(id: string, walletAddress: string): Promise<User> {
    const user = (await this.model.findById(id)).toObject();
    const wallets = new Set([...user.metaMaskWalletAddressees, walletAddress]);
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { metaMaskWalletAddressees: [...wallets] },
      { new: true },
    );
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedUser;
  }

  async updateMagicWallet(id: string, magicWalletAddress: string): Promise<User> {
    const updatedUser = await UserModel.findByIdAndUpdate(id, { magicWalletAddress }, { new: true });
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${id}`);
    }
    return updatedUser;
  }

  async getUserByWallet(walletAddress: string): Promise<User> {
    const user = await this.model.findOne({
      $or: [{ magicWalletAddress: walletAddress }, { metaMaskWalletAddressees: { $in: [walletAddress] } }],
    });
    return user;
  }

  async getUserByHandle(handle: string): Promise<User> {
    const user = await this.model.findOne({ handle });
    return user;
  }
}
