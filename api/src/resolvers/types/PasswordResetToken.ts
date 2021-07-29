import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PasswordResetToken {
  @Field()
  token: string;
}
