import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionEmoji } from '../enums/ReactionEmoji';
import { Model } from './Model';

@ObjectType()
export class Post extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  body: string;

  @Field({ nullable: true })
  @prop({ required: false })
  mediaLink?: string;

  @Field()
  @prop({ required: true, default: 0 })
  reactionCount: number;

  @Field(() => [ReactionEmoji])
  @prop({ required: true, default: [], enum: ReactionEmoji })
  topReactions: ReactionEmoji[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
