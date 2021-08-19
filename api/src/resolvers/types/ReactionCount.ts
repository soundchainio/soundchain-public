import { ReactionEmoji } from 'models/Reaction';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ReactionCount {
  @Field()
  emoji: ReactionEmoji;

  @Field()
  count: number;
}
