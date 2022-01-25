import { Field, ObjectType } from 'type-graphql';
import { User } from '../models/User';

@ObjectType()
export class UpdateHandlePayload {
  @Field()
  user: User;
}