import { Field, InputType } from 'type-graphql';

@InputType()
export class VerifyUserEmailInput {
  @Field()
  token: string;
}
