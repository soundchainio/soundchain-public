import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { User, UserModel } from '../models/User';
import { Context } from '../types/Context';
import { DefaultWallet } from '../types/DefaultWallet';
import { Role } from '../types/Role';
import { validateUniqueIdentifiers } from '../utils/Validation';
import { ModelService } from './ModelService';

const SALT_ROUNDS = 10; // Kept at 10 as requested

export class UserService extends ModelService<typeof User> {
  constructor(context: Context) {
    super(context, UserModel);
  }

  getUser(id: string): Promise<User> {
    return this.findOrFail(id);
  }

  async getUserByProfileId(profileId: string): Promise<User> {
    const user = await UserModel.findOne({ profileId });
    if (!user) {
      throw new Error(`User with profileId ${profileId} not found`);
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await UserModel.find();
  }

  async userExists(filter: Partial<User>): Promise<boolean> {
    return !!(await UserModel.exists(filter));
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
    const user = (await this.model.findById(id))?.toObject();
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    const wallets = new Set([...(user.metaMaskWalletAddressees || []), walletAddress]);
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

    if (!user || !user.otpRecoveryPhrase) {
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
    if (!user) {
      throw new Error(`User with handle ${handle} not found`);
    }
    return user;
  }

  async getAdminsProfileIds(): Promise<string[]> {
    const admins = await this.model.find({
      roles: {
        $in: [Role.ADMIN],
      },
    });
    const ids = admins.map(admin => admin.profileId.toString());

    return ids;
  }
}
