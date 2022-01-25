import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Follow extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  followerId: string;

  @prop({ required: true })
  followedId: string;

  createdAt: Date;

  updatedAt: Date;
}

export const FollowModel = getModelForClass(Follow);
