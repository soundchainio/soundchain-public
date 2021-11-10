import { getModelForClass, index, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';
import { ObjectId } from 'mongodb';

@ObjectType()
@index({ profileId: 1, postId: 1 }, { unique: true })
export class FeedItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @prop({ required: true })
  postId: string;

  @Field(() => Date)
  @prop({ required: true })
  postedAt: Date;
}

export const FeedItemModel = getModelForClass(FeedItem);
