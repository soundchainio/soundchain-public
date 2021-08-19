import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';

export type ReactionEmoji = '❤️' | '🤘' | '😃' | '😢' | '😎';

@ObjectType()
export class Reaction extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  postId: string;

  @Field()
  @prop({ required: true })
  emoji: ReactionEmoji;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ReactionModel = getModelForClass(Reaction);
