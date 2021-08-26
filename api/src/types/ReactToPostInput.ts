import { Field, InputType } from 'type-graphql';
import { ReactionType } from './ReactionType';

@InputType()
export class ReactToPostInput {
  @Field()
  postId: string;

  @Field(() => ReactionType)
  type: ReactionType;
}
