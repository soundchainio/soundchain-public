import { Field, InputType } from 'type-graphql';

@InputType()
export class AddCommentInput {
  @Field()
  post: string;

  @Field()
  body: string;
}
