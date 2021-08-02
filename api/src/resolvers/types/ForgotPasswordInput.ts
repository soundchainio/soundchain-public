import { Field, InputType } from 'type-graphql';

@InputType()
export default class ForgotPasswordInput {
  @Field()
  email: string;
}
