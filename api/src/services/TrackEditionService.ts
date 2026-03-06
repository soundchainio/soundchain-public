import mongoose from 'mongoose';
import { TrackEdition, TrackEditionModel } from '../models/TrackEdition';
import { Context } from '../types/Context';
import { PendingRequest } from '../types/PendingRequest';
import { ModelService } from './ModelService';

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Date ? T[P] : RecursivePartial<T[P]>;
};

export class TrackEditionService extends ModelService<typeof TrackEdition> {
  constructor(context: Context) {
    super(context, TrackEditionModel);
  }

  async createTrackEdition(data: Partial<TrackEdition>): Promise<TrackEdition> {
    const trackEdition = new this.model({ ...data });
    await trackEdition.save();
    return trackEdition;
  }

  async getEditionSize(id: string): Promise<number> {
    const trackEdition = await this.findOrFail(id);
    return trackEdition.editionSize;
  }

  async markEditionListed(editionId: number, nft: string, marketplace: string): Promise<void> {
    await this.model.updateOne(
      { editionId, contract: nft },
      {
        listed: true,
        marketplace,
        $set: {
          'editionData.pendingRequest': PendingRequest.None,
          'editionData.pendingTime': null,
        },
      },
    );
  }

  async markEditionListedIfNeeded(id: string, marketplace: string): Promise<void> {
    const edition = await this.subtractPendingTrackCount(id);

    if (edition.editionData.pendingTrackCount === 0) {
      await TrackEditionModel.updateOne(
        { _id: edition._id },
        {
          listed: true,
          marketplace,
          $set: {
            'editionData.pendingRequest': PendingRequest.None,
            'editionData.pendingTime': null,
          },
        },
      );
    }
  }

  async markEditionUnlisted(editionId: number, nft: string): Promise<void> {
    await this.model.updateOne(
      { editionId, contract: nft },
      {
        listed: false,
        marketplace: null,
        $set: {
          'editionData.pendingRequest': PendingRequest.None,
          'editionData.pendingTime': null,
        },
      },
    );
  }

  async markEditionUnlistedIfNeeded(id: string): Promise<void> {
    const edition = await this.subtractPendingTrackCount(id);

    if (edition.editionData.pendingTrackCount === 0) {
      await TrackEditionModel.updateOne(
        { _id: edition._id },
        {
          listed: false,
          marketplace: null,
          $set: {
            'editionData.pendingRequest': PendingRequest.None,
            'editionData.pendingTime': null,
          },
        },
      );
    }
  }

  async subtractPendingTrackCount(id: string): Promise<TrackEdition> {
    await TrackEditionModel.updateOne(
      {
        _id: id,
        'editionData.pendingTrackCount': { $gt: 0 },
      },
      {
        $inc: { 'editionData.pendingTrackCount': -1 },
      },
    );

    return TrackEditionModel.findById(id);
  }

  async resetPending(beforeTime: Date): Promise<void> {
    await this.model.updateMany(
      {
        'editionData.pendingRequest': { $ne: PendingRequest.None },
        'editionData.pendingTime': { $lte: beforeTime },
      },
      {
        'editionData.pendingRequest': PendingRequest.None,
        'editionData.pendingTrackCount': 0,
      },
    );
  }

  async updateTrackEditionByTransactionHash(
    transactionHash: string,
    changes: RecursivePartial<TrackEdition>,
  ): Promise<void> {
    await this.model.updateOne({ transactionHash: transactionHash }, { ...changes });
  }
}
