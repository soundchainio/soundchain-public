import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Comment extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  body: string;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  postId: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  profileId?: mongoose.Types.ObjectId;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isGuest?: boolean;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  walletAddress?: string;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  replyToId?: mongoose.Types.ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const CommentModel = getModelForClass(Comment);
