import { Field, InputType } from 'type-graphql';
import { ReactionType } from './ReactionType';

@InputType()
export class ChangeReactionInput {
  @Field()
  postId: string;

  @Field(() => ReactionType)
  type: ReactionType;
}
