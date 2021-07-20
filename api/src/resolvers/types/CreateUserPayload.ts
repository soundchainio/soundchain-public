import { Field, ObjectType } from 'type-graphql';
import User from '../../models/User';

@ObjectType()
export default class CreateUserPayload {
  @Field()
  user: User;
}
