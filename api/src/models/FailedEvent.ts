import { getModelForClass, prop } from '@typegoose/typegoose';
import { Schema } from 'mongoose';
import { Model } from './Model';

export class FailedEvent extends Model {
  @prop()
  name: string;

  @prop()
  error: string;

  @prop()
  data: Schema.Types.Mixed;
}

export const FailedEventModel = getModelForClass(FailedEvent);
