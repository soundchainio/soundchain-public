import { AudioHolder, AudioHolderModel } from '../models/AudioHolder';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';
import mongoose from 'mongoose';

interface NewAudioHolderParams {
  walletAddress: string;
  amount: number;
}

export class AudioHolderService extends ModelService<typeof AudioHolder> {
  constructor(context: Context) {
    super(context, AudioHolderModel);
  }

  async createAudioHolder(params: NewAudioHolderParams): Promise<AudioHolder> {
    const audioHolder = new this.model(params);
    await audioHolder.save();
    return audioHolder;
  }

  async getAudioHolderByWallet(walletAddress: string): Promise<AudioHolder> {
    return AudioHolderModel.findOne({ walletAddress: walletAddress });
  }

  async updateOgunClaimed(id: mongoose.Types.ObjectId, ogunClaimed: boolean): Promise<AudioHolder> {
    const updatedAudioHolder = await AudioHolderModel.findByIdAndUpdate(id, { ogunClaimed }, { new: true });
    if (!updatedAudioHolder) {
      throw new Error(`Could not update the audio holder with id: ${id}`);
    }
    return updatedAudioHolder;
  }
}
