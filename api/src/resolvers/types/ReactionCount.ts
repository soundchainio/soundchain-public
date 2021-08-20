import { ReactionEmoji } from 'enums/ReactionEmoji';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ReactionCount {
  @Field()
  emoji: ReactionEmoji;

  @Field()
  count: number;
}
