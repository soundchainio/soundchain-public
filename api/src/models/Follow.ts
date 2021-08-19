import { getModelForClass, prop } from '@typegoose/typegoose';
import Model from './Model';

export class Follow extends Model {
  readonly _id: string;

  @prop({ required: true })
  followerId: string;

  @prop({ required: true })
  followedId: string;

  createdAt: Date;

  updatedAt: Date;
}

export const FollowModel = getModelForClass(Follow);
