import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionStats } from '../types/ReactionStats';
import { Model } from './Model';

@ObjectType()
export class Post extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  body?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  mediaLink?: string;

  @prop({ required: true, default: {}, _id: false })
  reactionStats: ReactionStats;

  @Field(() => ID, { nullable: true }) // Add @Field() decorator
  @prop({ required: false, type: mongoose.Types.ObjectId })
  repostId?: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  trackId?: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  trackEditionId?: mongoose.Types.ObjectId;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
