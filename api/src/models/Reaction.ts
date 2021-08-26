import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionType } from '../types/ReactionType';
import { Model } from './Model';

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
  @prop({ required: true, type: String, enum: ReactionType })
  type: ReactionType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ReactionModel = getModelForClass(Reaction);
