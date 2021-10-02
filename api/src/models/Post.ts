import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionStats } from '../types/ReactionStats';
import { Model } from './Model';

@ObjectType()
export class Post extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
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

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
