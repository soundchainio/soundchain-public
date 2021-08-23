import { Field, InputType } from 'type-graphql';

@InputType()
export class RetractReactionInput {
  @Field()
  postId: string;
}
