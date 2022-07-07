import { TrackEdition, TrackEditionModel } from '../models/TrackEdition';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

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
}
