import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateCommentInput {
  @Field()
  commentId: string;

  @Field()
  body: string;
}
