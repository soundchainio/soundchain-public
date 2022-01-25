import { Field, InputType } from 'type-graphql';

@InputType()
export class SendMessageInput {
  @Field()
  message: string;

  @Field()
  toId: string;
}
