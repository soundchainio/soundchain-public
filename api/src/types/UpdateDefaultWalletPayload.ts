import { Field, ObjectType } from 'type-graphql';
import { User } from '../models/User';

@ObjectType()
export class UpdateDefaultWalletPayload {
  @Field()
  user: User;
}
