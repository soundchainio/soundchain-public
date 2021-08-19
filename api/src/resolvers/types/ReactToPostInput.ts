import { ReactionEmoji } from 'models/Reaction';
import { Field, InputType } from 'type-graphql';

@InputType()
export class ReactToPostInput {
  @Field()
  postId: string;

  @Field()
  emoji: ReactionEmoji;
}
