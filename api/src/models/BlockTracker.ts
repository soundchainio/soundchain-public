import { getModelForClass, prop } from '@typegoose/typegoose';
import { Model } from './Model';

export class BlockTracker extends Model {
  readonly _id: string;

  @prop({ required: true })
  blockNumber: number;
}

export const BlockTrackerModel = getModelForClass(BlockTracker);
