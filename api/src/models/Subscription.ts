import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Subscription extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @prop({ required: true })
  subscribedProfileId: string;

  createdAt: Date;

  updatedAt: Date;
}

export const SubscriptionModel = getModelForClass(Subscription);
