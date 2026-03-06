import { Field, InputType } from 'type-graphql';

@InputType()
export class LoginInput {
  @Field()
  token: string;

  @Field({ nullable: true })
  email?: string;
}
