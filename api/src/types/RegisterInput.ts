import { IsEmail, IsOptional, Length, Matches, MinLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { handleRegex } from '../utils/Validation';

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
  @Matches(handleRegex, { message: 'Invalid characters' })
  handle: string;

  @Field()
  @IsOptional()
  bio: string;

  @Field()
  @MinLength(8)
  password: string;
}
