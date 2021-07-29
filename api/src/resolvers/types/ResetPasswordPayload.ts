import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ResetPasswordPayload {
  @Field()
  passwordReset: boolean;
}
