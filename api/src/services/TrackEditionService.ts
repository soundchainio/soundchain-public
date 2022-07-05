import { ObjectId } from 'mongodb';
import { TrackEdition, TrackEditionModel } from '../models/TrackEdition';
import { TrackEditionWithTrackItem } from '../models/TrackEditionWithTrackItem';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class TrackEditionService extends ModelService<typeof TrackEdition> {
  constructor(context: Context) {
    super(context, TrackEditionModel);
  }

  async getTrackEdition(id: string): Promise<TrackEditionWithTrackItem> {
    const aggregation = [
      {
        $match: {
          _id: new ObjectId(id),
        },
      },
      {
        $lookup: {
          from: 'tracks',
          localField: 'transactionHash',
          foreignField: 'nftData.transactionHash',
          as: 'tracks',
        },
      },
      {
        $addFields: {
          track: {
            $first: '$tracks',
          },
        },
      },
      {
        $project: {
          tracks: 0,
        },
      },
    ];

    return (await this.model.aggregate<TrackEditionWithTrackItem>(aggregation))[0];
  }

  async createTrackEdition(data: Partial<TrackEdition>): Promise<TrackEdition> {
    const trackEdition = new this.model({ ...data });
    await trackEdition.save();
    return trackEdition;
  }
}
