import { Field, InputType } from 'type-graphql';

@InputType()
export class AddCommentInput {
  @Field()
  postId: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  replyToId?: string;
}
