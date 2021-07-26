import { Field, InputType } from 'type-graphql';

@InputType()
export default class AddCommentInput {
  @Field()
  postId: string;

  @Field()
  authorId: string;

  @Field()
  body: string;
}
