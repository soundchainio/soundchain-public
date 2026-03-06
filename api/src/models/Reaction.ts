import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionType } from '../types/ReactionType';
import { Model } from './Model';

@ObjectType()
export class Reaction extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false })
  profileId?: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  postId: mongoose.Types.ObjectId;

  @Field(() => ReactionType)
  @prop({ required: true, type: String, enum: ReactionType })
  type: ReactionType;

  // Guest reaction fields (wallet-only, no account required)
  @Field(() => String, { nullable: true })
  @prop({ type: String, required: false, lowercase: true })
  walletAddress?: string;

  @Field(() => Boolean)
  @prop({ type: Boolean, default: false })
  isGuest: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ReactionModel = getModelForClass(Reaction);
