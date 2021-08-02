import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ForgotPasswordPayload {
  @Field()
  ok: boolean;
}
