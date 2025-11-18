import { Field, InputType } from 'type-graphql';

@InputType()
export class SendMessageInput {
  @Field(() => String)
  message: string;

  @Field(() => String)
  toId: string;
}
