import { getModelForClass, index, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
@index({ profileId: 1, postId: 1 }, { unique: true })
export class FeedItem extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  postId: mongoose.Types.ObjectId;

  @Field(() => Date)
  @prop({ required: true })
  postedAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const FeedItemModel = getModelForClass(FeedItem);
