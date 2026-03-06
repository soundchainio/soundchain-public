import { BlockTracker, BlockTrackerModel } from '../models/BlockTracker';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class BlockTrackerService extends ModelService<typeof BlockTracker> {
  constructor(context: Context) {
    super(context, BlockTrackerModel);
  }

  async getCurrentBlockNumber(): Promise<number> {
    return (await this.model.findOne({})).blockNumber;
  }

  async updateCurrentBlocknumber(blockNumber: number): Promise<void> {
    await this.model.findOneAndUpdate({}, { blockNumber });
  }
}
