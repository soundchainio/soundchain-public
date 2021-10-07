import { Length, Matches } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { handleRegex } from '../utils/Validation';

@InputType()
export class RegisterInput {
  @Field()
  token: string;

  @Field()
  @Length(3, 255)
  displayName: string;

  @Field()
  @Length(1, 32)
  @Matches(handleRegex, { message: 'Invalid characters' })
  handle: string;
}
