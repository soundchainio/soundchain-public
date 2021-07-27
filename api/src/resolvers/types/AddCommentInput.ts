import { Field, InputType } from 'type-graphql';

@InputType()
export default class AddCommentInput {
  @Field()
  postId: string;

  @Field()
  body: string;
}
