import User from 'models/User';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class VerifyUserEmailPayload {
  @Field()
  user: User;
}
