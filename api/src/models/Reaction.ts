import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionType } from '../types/ReactionType';
import { Model } from './Model';

@ObjectType()
export class Reaction extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  postId: mongoose.Types.ObjectId;

  @Field(() => ReactionType)
  @prop({ required: true, type: String, enum: ReactionType })
  type: ReactionType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ReactionModel = getModelForClass(Reaction);
