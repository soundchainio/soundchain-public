import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionStats } from '../types/ReactionStats';
import { Model } from './Model';
import { ObjectId } from 'mongodb';

@ObjectType()
export class Post extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @Field({ nullable: true })
  @prop({ required: false })
  body?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  mediaLink?: string;

  @prop({ required: true, default: {}, _id: false })
  reactionStats: ReactionStats;

  @Field({ nullable: true })
  @prop({ required: false })
  repostId?: string;

  @prop({ required: false })
  trackId?: string;

  @prop({ required: false })
  trackEditionId?: string;

  @Field({ nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
