import { getModelForClass, prop } from '@typegoose/typegoose';
import { Model } from './Model';

export class PendingTrack extends Model {
  @prop()
  transactionHash: string;

  @prop()
  tokenId: number;

  @prop()
  contract: string;

  @prop({ default: false })
  processed: boolean;
}

export const PendingTrackModel = getModelForClass(PendingTrack);
