import { prop } from '@typegoose/typegoose';
import { Field, Int, ObjectType } from 'type-graphql';
import { ReactionType } from './ReactionType';

@ObjectType()
export class ReactionStats {
  @Field(() => Int)
  @prop({ required: true, default: 0 })
  [ReactionType.HAPPY]: number;

  @Field(() => Int)
  @prop({ required: true, default: 0 })
  [ReactionType.HEART]: number;

  @Field(() => Int)
  @prop({ required: true, default: 0 })
  [ReactionType.HORNS]: number;

  @Field(() => Int)
  @prop({ required: true, default: 0 })
  [ReactionType.SAD]: number;

  @Field(() => Int)
  @prop({ required: true, default: 0 })
  [ReactionType.SUNGLASSES]: number;
}
