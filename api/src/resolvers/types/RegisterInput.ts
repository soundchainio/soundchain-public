import { IsEmail, Length, Matches, MinLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @Length(3, 255)
  displayName: string;

  @Field()
  @Length(1, 32)
  @Matches(/^[A-z0-9_]*$/, { message: 'Invalid characters' })
  handle: string;

  @Field()
  @MinLength(8)
  password: string;
}
