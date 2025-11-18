import { Field, InputType } from 'type-graphql';

@InputType()
export class DeletePostInput {
  @Field(() => String)
  postId: string;
}
