import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';
import { ObjectId } from 'mongodb';
@ObjectType()
export class Subscription extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  subscriberId: string;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const SubscriptionModel = getModelForClass(Subscription);
