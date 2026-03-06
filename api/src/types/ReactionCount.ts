import { Field, Int, ObjectType } from 'type-graphql';
import { ReactionType } from './ReactionType';

@ObjectType()
export class ReactionCount {
  @Field(() => ReactionType)
  type: ReactionType;

  @Field(() => Int)
  count: number;
}
