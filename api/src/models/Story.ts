import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class StoryReaction {
  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  emoji!: string;

  @Field(() => Date)
  @prop({ default: () => new Date() })
  createdAt!: Date;
}

@ObjectType()
export class Story extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true, index: true })
  profileId!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  mediaUrl!: string;

  @Field(() => String)
  @prop({ required: true })
  mediaType!: string; // 'image' | 'video'

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  caption?: string;

  @Field(() => Number)
  @prop({ default: 60 }) // Default 60 seconds for images
  duration!: number;

  @Field(() => Date)
  @prop({ required: true, index: true })
  expiresAt!: Date;

  @Field(() => Boolean)
  @prop({ default: false })
  isPermanent!: boolean;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  permanentTxHash?: string;

  @Field(() => Number)
  @prop({ default: 0 })
  viewCount!: number;

  @Field(() => [StoryReaction])
  @prop({ type: () => [StoryReaction], default: [] })
  reactions!: StoryReaction[];

  @Field(() => [ID], { nullable: true })
  @prop({ type: () => [mongoose.Types.ObjectId], default: [] })
  viewerIds?: mongoose.Types.ObjectId[];

  @Field(() => Boolean)
  @prop({ default: false })
  deleted!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export const StoryModel = getModelForClass(Story);
