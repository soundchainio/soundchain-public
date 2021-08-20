import { Field, InputType } from 'type-graphql';
import { ReactionEmoji } from '../../enums/ReactionEmoji';

@InputType()
export class ReactToPostInput {
  @Field()
  postId: string;

  @Field()
  emoji: ReactionEmoji;
}
