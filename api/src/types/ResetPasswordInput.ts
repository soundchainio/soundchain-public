import { MinLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class ResetPasswordInput {
  @Field()
  token: string;

  @Field()
  @MinLength(8)
  password: string;
}
