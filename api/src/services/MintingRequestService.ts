import { NotFoundError } from '../errors/NotFoundError';
import { MintingRequest, MintingRequestModel } from '../models/MintingRequest';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class MintingRequestService extends ModelService<typeof MintingRequest> {
  constructor(context: Context) {
    super(context, MintingRequestModel);
  }

  getMintingRequest(id: string): Promise<MintingRequest> {
    return this.findOrFail(id);
  }
  async createMintingRequest(params: Omit<MintingRequest, '_id' | 'createdAt' | 'updatedAt'>): Promise<MintingRequest> {
    const mintingRequest = new this.model(params);
    await mintingRequest.save();
    return mintingRequest;
  }

  async updateMintingRequest(id: string, changes: Partial<MintingRequest>): Promise<MintingRequest> {
    const mintingRequest = await this.model.findByIdAndUpdate(id, changes, { new: true });

    if (!mintingRequest) {
      throw new NotFoundError('MintingRequest', id);
    }

    return mintingRequest;
  }

  deleteMintingRequest(id: string): Promise<MintingRequest> {
    return this.model.deleteOne({ _id: id }).exec();
  }
}
