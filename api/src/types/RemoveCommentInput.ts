import { Field, InputType } from 'type-graphql';

@InputType()
export class RemoveCommentInput {
  @Field()
  commentId: string;
}
