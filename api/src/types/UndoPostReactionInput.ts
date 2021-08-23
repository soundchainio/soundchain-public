import { Field, InputType } from 'type-graphql';

@InputType()
export class UndoPostReactionInput {
  @Field()
  postId: string;
}
