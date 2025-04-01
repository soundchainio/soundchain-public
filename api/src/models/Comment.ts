import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Comment extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field()
  @prop({ required: true })
  body: string;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  postId: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  profileId: mongoose.Types.ObjectId;

  @Field({ nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const CommentModel = getModelForClass(Comment);
