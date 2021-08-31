import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class FeedItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @prop({ required: true })
  postId: string;

  @Field(() => Date)
  createdAt: Date;
}

export const FeedItemModel = getModelForClass(FeedItem);
