import { IsEmail, Length } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export default class RegisterInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @Length(3, 255)
  displayName: string;

  @Field()
  @Length(3, 255)
  handle: string;

  @Field()
  @Length(8, 30)
  password: string;
}
