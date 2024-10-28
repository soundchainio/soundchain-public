import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

import { User, UserModel } from '../models/User';
import { Context } from '../types/Context';
import { DefaultWallet } from '../types/DefaultWallet';
import { Role } from '../types/Role';
import { validateUniqueIdentifiers } from '../utils/Validation';
import { ModelService } from './ModelService';

const SALT_ROUNDS = 10;
export class UserService extends ModelService<typeof User> {
  constructor(context: Context) {
    super(context, UserModel);
  }

  getUser(id: string): Promise<User> {
    return this.findOrFail(id);
  }

  async getUserByProfileId(profileId: string): Promise<User> {
    return await UserModel.findOne({ profileId });
  }

  async getAllUsers(): Promise<User[]> {
    return await UserModel.find();
  }

  userExists(filter: Partial<User>): Promise<boolean> {
    return UserModel.exists(filter);
  }

  async updateHandle(id: string, handle: string): Promise<User> {
    await validateUniqueIdentifiers({ id, handle });
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

  async updateOTP({
    _id,
    otpSecret,
    otpRecoveryPhrase,
  }: Pick<User, '_id' | 'otpSecret' | 'otpRecoveryPhrase'>): Promise<User> {
    const encrypted = otpRecoveryPhrase ? await bcrypt.hash(otpRecoveryPhrase, SALT_ROUNDS) : '';
    const updatedUser = await UserModel.findByIdAndUpdate(
      _id,
      { otpSecret, otpRecoveryPhrase: encrypted },
      { new: true },
    );
    if (!updatedUser) {
      throw new Error(`Could not update the profile with id: ${_id}`);
    }
    return updatedUser;
  }

  async validateOTPRecoveryPhrase({
    _id,
    otpRecoveryPhrase,
  }: Pick<User, '_id' | 'otpRecoveryPhrase'>): Promise<boolean> {
    const user = await UserModel.findById(_id);

    if (!user) {
      return false;
    }

    return bcrypt.compare(otpRecoveryPhrase, user.otpRecoveryPhrase);
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const user = await this.model.findOne({
      $or: [
        { magicWalletAddress: { $regex: `^${walletAddress}$`, $options: 'i' } },
        { metaMaskWalletAddressees: { $regex: `^${walletAddress}$`, $options: 'i' } },
      ],
    });
    return user;
  }

  async getUserByHandle(handle: string): Promise<User> {
    const user = await this.model.findOne({ handle });
    return user;
  }

  async getAdminsProfileIds(): Promise<ObjectId[]> {
    const admins = await this.model.find({
      roles: {
        $in: [Role.ADMIN],
      },
    });
    const ids = admins.map(admin => new ObjectId(admin.profileId));

    return ids;
  }
}
