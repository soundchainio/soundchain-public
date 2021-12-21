import { Field, ObjectType } from 'type-graphql';
import { User } from '../models/User';

@ObjectType()
export class UpdateOTPSecretPayload {
  @Field()
  user: User;
}
