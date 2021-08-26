import { MinLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class LoginInput {
  @Field({ description: 'Username can be email or handle' })
  username: string;

  @Field()
  @MinLength(8)
  password: string;
}
