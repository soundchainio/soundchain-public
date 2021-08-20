import { Field, ObjectType } from 'type-graphql';
import { ReactionEmoji } from '../../enums/ReactionEmoji';

@ObjectType()
export class ReactionCount {
  @Field()
  emoji: ReactionEmoji;

  @Field()
  count: number;
}
