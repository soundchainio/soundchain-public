import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class VerifyPayload {
  @Field()
  success: boolean;
}
